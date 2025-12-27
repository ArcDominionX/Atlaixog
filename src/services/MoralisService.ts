
import { APP_CONFIG } from '../config';

// API Key from Config
const MORALIS_API_KEY = APP_CONFIG.moralisKey; 

interface MoralisTransfer {
    transaction_hash: string;
    block_timestamp: string;
    to_address: string;
    from_address: string;
    value: string; // Raw value
    decimals?: number;
    token_symbol?: string;
}

export interface RealActivity {
    type: 'Buy' | 'Sell' | 'Add Liq' | 'Remove Liq' | 'Transfer';
    val: string;
    desc: string;
    time: string;
    color: string;
    usd: string;
    hash: string;
    wallet: string;
    tag: string;
    asset?: string;
}

export interface WalletBalance {
    token_address: string;
    symbol: string;
    name: string;
    logo?: string;
    thumbnail?: string;
    decimals: number;
    balance: string;
    possible_spam: boolean;
    verified_contract?: boolean;
    usd_value?: number;
    price_usd?: number;
}

const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const mapChainToMoralisEVM = (chain: string) => {
    switch (chain.toLowerCase()) {
        case 'ethereum': return '0x1';
        case 'bsc': return '0x38';
        case 'base': return '0x2105';
        case 'arbitrum': return '0xa4b1';
        case 'polygon': return '0x89';
        case 'avalanche': return '0xa86a';
        default: return '0x1';
    }
};

export const MoralisService = {
    /**
     * Fetches real token transfers for a specific wallet
     */
    getWalletTokenTransfers: async (address: string, chain: string): Promise<RealActivity[]> => {
        if (!address) return [];

        const isSolana = chain.toLowerCase() === 'solana';
        
        // Select Endpoint
        let url = '';
        if (isSolana) {
            url = `https://solana-gateway.moralis.io/account/mainnet/${address}/transfers?limit=20`;
        } else {
            const hexChain = mapChainToMoralisEVM(chain);
            url = `https://deep-index.moralis.io/api/v2.2/${address}/erc20/transfers?chain=${hexChain}&order=DESC&limit=20`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': MORALIS_API_KEY
                }
            });

            if (!response.ok) return [];
            
            const data = await response.json();
            const transfers: any[] = isSolana ? data : (data.result || []); // Solana returns array, EVM returns object.result

            return transfers.map((tx) => {
                const from = (tx.from_address || tx.from || '').toLowerCase();
                const to = (tx.to_address || tx.to || '').toLowerCase();
                const myAddr = address.toLowerCase();
                
                const isIncoming = to === myAddr;
                
                const symbol = tx.token_symbol || 'Token';
                const decimals = parseInt(tx.decimals || (isSolana ? '9' : '18'));
                const val = parseFloat(tx.value) / Math.pow(10, decimals);
                
                // Construct Activity Object
                return {
                    type: isIncoming ? 'Buy' : 'Sell', // Simplified: In = Buy/Receive, Out = Sell/Send
                    val: val < 0.001 ? '< 0.001' : val.toFixed(3),
                    asset: symbol,
                    desc: isIncoming ? `Received ${symbol}` : `Sent ${symbol}`,
                    time: getTimeAgo(tx.block_timestamp),
                    color: isIncoming ? 'text-primary-green' : 'text-primary-red',
                    usd: '', // Historical price difficult to fetch in batch for free
                    hash: tx.transaction_hash || tx.signature, // EVM vs Solana
                    wallet: isIncoming ? from : to,
                    tag: 'Wallet'
                };
            });

        } catch (error) {
            console.error("Failed to fetch wallet history:", error);
            return [];
        }
    },

    /**
     * Fetches real token transfers and categorizes them as Buys/Sells
     * by comparing against the Liquidity Pair Address from DexScreener.
     */
    getTokenActivity: async (tokenAddress: string, chain: string, pairAddress: string, tokenPrice: number): Promise<RealActivity[]> => {
        // Validate Token Address
        if (!tokenAddress || tokenAddress.length < 20) {
            console.warn("Invalid Token Address for Moralis");
            return [];
        }

        const isSolana = chain.toLowerCase() === 'solana';
        
        // Select Endpoint
        let url = '';
        if (isSolana) {
            url = `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/transfers?limit=50`;
        } else {
            const hexChain = mapChainToMoralisEVM(chain);
            url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/transfers?chain=${hexChain}&order=DESC&limit=50`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': MORALIS_API_KEY
                }
            });

            // Gracefully handle 404/400 without crashing
            if (response.status === 404 || response.status === 400) {
                console.warn(`Moralis data not found for ${tokenAddress} on ${chain}`);
                return [];
            }

            if (!response.ok) throw new Error(`Moralis API Error: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            const transfers: MoralisTransfer[] = data.result; 

            if (!transfers || transfers.length === 0) return [];

            return transfers.map((tx) => {
                // Determine transaction type based on Pair Address
                let type: RealActivity['type'] = 'Transfer';
                let desc = 'Transferred';
                let color = 'text-text-light';
                
                // Normalization for case-insensitive comparison
                const from = tx.from_address.toLowerCase();
                const to = tx.to_address.toLowerCase();
                const pair = pairAddress ? pairAddress.toLowerCase() : '';

                const isBuy = from === pair; // User received token FROM pair
                const isSell = to === pair;  // User sent token TO pair

                if (isBuy && pair) {
                    type = 'Buy';
                    desc = 'bought on DEX';
                    color = 'text-primary-green';
                } else if (isSell && pair) {
                    type = 'Sell';
                    desc = 'sold on DEX';
                    color = 'text-primary-red';
                }

                // Calculate Amount
                const decimals = tx.decimals ? parseInt(tx.decimals.toString()) : (isSolana ? 9 : 18); 
                const rawVal = parseFloat(tx.value) / Math.pow(10, decimals);
                const usdVal = rawVal * tokenPrice;

                // Identify Wallet Tags
                let tag = 'Trader';
                if (usdVal > 50000) tag = 'Whale';
                else if (usdVal > 10000) tag = 'Smart Money';
                else if (usdVal < 10) tag = 'Bot';

                return {
                    type,
                    val: rawVal < 0.01 ? '< 0.01' : rawVal.toFixed(2),
                    desc,
                    time: getTimeAgo(tx.block_timestamp),
                    color,
                    usd: `$${usdVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    hash: tx.transaction_hash,
                    wallet: isBuy ? to : from, // The actor is the one NOT the pair
                    tag
                };
            });

        } catch (error) {
            console.error("Failed to fetch Moralis data:", error);
            return [];
        }
    },

    /**
     * Fetches Wallet Balances for the Wallet Tracking Page
     */
    getWalletBalances: async (address: string, chain: string): Promise<WalletBalance[]> => {
        if (!address) return [];

        const isSolana = chain.toLowerCase() === 'solana';
        
        let url = '';
        if (isSolana) {
            url = `https://solana-gateway.moralis.io/account/mainnet/${address}/tokens`;
        } else {
            const hexChain = mapChainToMoralisEVM(chain);
            url = `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${hexChain}&exclude_spam=true`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': MORALIS_API_KEY
                }
            });

            if (!response.ok) return [];
            
            // Note: Solana Endpoint response structure is slightly different (array directly) vs EVM (object with result array usually)
            // But Moralis standardized V2.2 mostly.
            const data = await response.json();
            
            // Handle differences between EVM response (paginated) and Solana (array)
            const tokens = Array.isArray(data) ? data : (data.result || []);

            return tokens.map((t: any) => ({
                token_address: t.token_address || t.mint, // EVM vs Solana
                symbol: t.symbol,
                name: t.name,
                logo: t.logo || t.thumbnail,
                decimals: t.decimals,
                balance: t.balance, // Raw balance
                possible_spam: t.possible_spam,
                verified_contract: t.verified_contract,
                usd_value: t.usd_value,
                price_usd: t.usd_price || 0
            }));

        } catch (error) {
            console.error("Failed to fetch wallet balances:", error);
            return [];
        }
    }
};
