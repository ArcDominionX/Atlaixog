
import { APP_CONFIG } from '../config';

const MORALIS_API_KEY = APP_CONFIG.moralisKey; 

interface MoralisTransfer {
    transaction_hash: string;
    block_timestamp: string;
    to_address: string;
    from_address: string;
    value: string; 
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
    chain?: string;
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

const NATIVE_TOKENS = {
    solana: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9, logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
    ethereum: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'ETH', name: 'Ethereum', decimals: 18, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
    bsc: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'BNB', name: 'BNB', decimals: 18, logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' }
};

// Robust fetcher with CORS proxy fallback
const fetchWithFallbacks = async (url: string) => {
    const options = {
        headers: {
            'accept': 'application/json',
            'X-API-Key': MORALIS_API_KEY
        }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        // Try Proxy
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const proxyResponse = await fetch(proxyUrl, options);
            if (!proxyResponse.ok) throw new Error(`Proxy HTTP ${proxyResponse.status}`);
            return await proxyResponse.json();
        } catch (proxyError) {
            console.warn(`Fetch failed for ${url}`);
            throw proxyError;
        }
    }
};

export const MoralisService = {
    getWalletTokenTransfers: async (address: string, chain: string): Promise<RealActivity[]> => {
        if (!address) return [];

        const isSolana = chain.toLowerCase() === 'solana';
        
        let url = '';
        if (isSolana) {
            url = `https://solana-gateway.moralis.io/account/mainnet/${address}/transfers?limit=20`;
        } else {
            const hexChain = mapChainToMoralisEVM(chain);
            url = `https://deep-index.moralis.io/api/v2.2/${address}/erc20/transfers?chain=${hexChain}&order=DESC&limit=20`;
        }

        try {
            const data = await fetchWithFallbacks(url);
            const transfers: any[] = isSolana ? data : (data.result || []); 

            return transfers.map((tx) => {
                const from = (tx.from_address || tx.from || '').toLowerCase();
                const to = (tx.to_address || tx.to || '').toLowerCase();
                const myAddr = address.toLowerCase();
                
                const isIncoming = to === myAddr;
                
                const symbol = tx.token_symbol || (isSolana ? 'SOL' : 'Token'); 
                const decimals = parseInt(tx.decimals || (isSolana ? '9' : '18'));
                const val = parseFloat(tx.value) / Math.pow(10, decimals);
                
                return {
                    type: isIncoming ? 'Buy' : 'Sell', 
                    val: val < 0.001 ? '< 0.001' : val.toFixed(3),
                    asset: symbol,
                    desc: isIncoming ? `Received ${symbol}` : `Sent ${symbol}`,
                    time: getTimeAgo(tx.block_timestamp),
                    color: isIncoming ? 'text-primary-green' : 'text-primary-red',
                    usd: '', 
                    hash: tx.transaction_hash || tx.signature, 
                    wallet: isIncoming ? from : to,
                    tag: 'Wallet'
                };
            });

        } catch (error) {
            console.error("Failed to fetch wallet history:", error);
            return [];
        }
    },

    getTokenActivity: async (tokenAddress: string, chain: string, pairAddress: string, tokenPrice: number): Promise<RealActivity[]> => {
        if (!tokenAddress || tokenAddress.length < 20) return [];

        const isSolana = chain.toLowerCase() === 'solana';
        
        let url = '';
        if (isSolana) {
            url = `https://solana-gateway.moralis.io/token/mainnet/${tokenAddress}/transfers?limit=50`;
        } else {
            const hexChain = mapChainToMoralisEVM(chain);
            url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/transfers?chain=${hexChain}&order=DESC&limit=50`;
        }

        try {
            const data = await fetchWithFallbacks(url);
            const transfers: MoralisTransfer[] = data.result || []; 

            if (!transfers || transfers.length === 0) return [];

            return transfers.map((tx) => {
                let type: RealActivity['type'] = 'Transfer';
                let desc = 'Transferred';
                let color = 'text-text-light';
                
                const from = tx.from_address.toLowerCase();
                const to = tx.to_address.toLowerCase();
                const pair = pairAddress ? pairAddress.toLowerCase() : '';

                const isBuy = from === pair;
                const isSell = to === pair;

                if (isBuy && pair) {
                    type = 'Buy';
                    desc = 'bought on DEX';
                    color = 'text-primary-green';
                } else if (isSell && pair) {
                    type = 'Sell';
                    desc = 'sold on DEX';
                    color = 'text-primary-red';
                }

                const decimals = tx.decimals ? parseInt(tx.decimals.toString()) : (isSolana ? 9 : 18); 
                const rawVal = parseFloat(tx.value) / Math.pow(10, decimals);
                const usdVal = rawVal * tokenPrice;

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
                    wallet: isBuy ? to : from,
                    tag
                };
            });

        } catch (error) {
            console.error("Failed to fetch Moralis data:", error);
            return [];
        }
    },

    getWalletBalances: async (address: string, chain: string): Promise<WalletBalance[]> => {
        if (!address) return [];

        const isSolana = chain.toLowerCase() === 'solana';
        const hexChain = mapChainToMoralisEVM(chain);
        
        let tokensUrl = '';
        let nativeUrl = '';
        let nativePriceUrl = '';
        
        const nativeConfig = isSolana ? NATIVE_TOKENS.solana : (chain.toLowerCase() === 'bsc' ? NATIVE_TOKENS.bsc : NATIVE_TOKENS.ethereum);

        if (isSolana) {
            tokensUrl = `https://solana-gateway.moralis.io/account/mainnet/${address}/tokens`;
            nativeUrl = `https://solana-gateway.moralis.io/account/mainnet/${address}/balance`;
            nativePriceUrl = `https://solana-gateway.moralis.io/token/mainnet/${nativeConfig.address}/price`;
        } else {
            tokensUrl = `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${hexChain}&exclude_spam=true`;
            nativeUrl = `https://deep-index.moralis.io/api/v2.2/${address}/balance?chain=${hexChain}`;
            nativePriceUrl = `https://deep-index.moralis.io/api/v2.2/erc20/${nativeConfig.address}/price?chain=${hexChain}`;
        }

        try {
            const [tokensRes, nativeRes, priceRes] = await Promise.allSettled([
                fetchWithFallbacks(tokensUrl),
                fetchWithFallbacks(nativeUrl),
                fetchWithFallbacks(nativePriceUrl)
            ]);

            let tokensData: any = [];
            if (tokensRes.status === 'fulfilled') {
                tokensData = tokensRes.value;
            }

            let nativeData: any = { balance: '0', solana: '0' };
            if (nativeRes.status === 'fulfilled') {
                nativeData = nativeRes.value;
            }

            let priceData = { usdPrice: 0 };
            if (priceRes.status === 'fulfilled') {
                priceData = priceRes.value;
            }

            const rawTokens = Array.isArray(tokensData) ? tokensData : (tokensData.result || []);
            
            const processedTokens: WalletBalance[] = rawTokens.map((t: any) => {
                let dec = 18;
                if (t.decimals !== undefined && t.decimals !== null) {
                    dec = parseInt(t.decimals);
                    if (isNaN(dec)) dec = 18;
                }

                const bal = t.balance || t.amount || '0';

                return {
                    token_address: t.token_address || t.mint, 
                    symbol: t.symbol || 'UNK',
                    name: t.name || 'Unknown Token',
                    logo: t.logo || t.thumbnail,
                    decimals: dec,
                    balance: bal,
                    possible_spam: t.possible_spam,
                    verified_contract: t.verified_contract,
                    usd_value: t.usd_value, 
                    price_usd: t.usd_price || 0, 
                    chain: chain 
                };
            });

            const nativeBalRaw = isSolana ? (nativeData.lamports || nativeData.solana || '0') : (nativeData.balance || '0');
            const nativeDecimals = nativeConfig.decimals;
            const nativeBalVal = parseFloat(nativeBalRaw) / Math.pow(10, nativeDecimals);
            
            if (nativeBalVal > 0) {
                const nativePrice = priceData.usdPrice || 0;
                const nativeUsdValue = nativeBalVal * nativePrice;
                
                const nativeToken: WalletBalance = {
                    token_address: 'NATIVE',
                    symbol: nativeConfig.symbol,
                    name: nativeConfig.name,
                    logo: nativeConfig.logo,
                    decimals: nativeDecimals,
                    balance: nativeBalRaw,
                    possible_spam: false,
                    verified_contract: true,
                    usd_value: nativeUsdValue,
                    price_usd: nativePrice,
                    chain: chain
                };
                
                processedTokens.unshift(nativeToken);
            }

            return processedTokens;

        } catch (error) {
            console.error("Failed to fetch wallet balances:", error);
            // Return empty array to trigger N/A in ChainRouter instead of crashing
            return [];
        }
    }
};
