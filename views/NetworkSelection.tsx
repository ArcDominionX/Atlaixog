import React from 'react';
import { Check } from 'lucide-react';

interface NetworkSelectionProps {
    onSelect: (network: string) => void;
    onBack: () => void;
}

export const NetworkSelection: React.FC<NetworkSelectionProps> = ({ onSelect, onBack }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-main animate-fade-in text-center">
            <div className="mb-8">
                <img src="./logo.png" alt="Logo" className="w-20 h-20 mx-auto object-contain mb-4" onError={(e) => e.currentTarget.src='https://via.placeholder.com/80'} />
                <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
                <p className="text-text-medium">Select the blockchain you primarily trade on</p>
            </div>

            <div className="w-full max-w-sm space-y-4 mb-8">
                <div 
                    onClick={() => onSelect('solana')}
                    className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-card-hover hover:border-text-dark transition-all group"
                >
                    <img src="https://cryptologos.cc/logos/solana-sol-logo.png" className="w-8 h-8 rounded-full" />
                    <span className="font-semibold text-lg">Solana</span>
                    <Check className="ml-auto text-text-dark group-hover:text-primary-green" size={20} />
                </div>
                <div 
                    onClick={() => onSelect('ethereum')}
                    className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 cursor-pointer hover:bg-card-hover hover:border-text-dark transition-all group"
                >
                    <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" className="w-8 h-8 rounded-full" />
                    <span className="font-semibold text-lg">Ethereum</span>
                    <Check className="ml-auto text-text-dark group-hover:text-primary-green" size={20} />
                </div>
            </div>

            <div className="flex items-center justify-between w-full max-w-sm">
                <button onClick={onBack} className="text-text-medium hover:text-text-light font-semibold">Back</button>
                <button onClick={() => onSelect('solana')} className="px-6 py-3 bg-primary-green text-main font-bold rounded-lg hover:bg-primary-green-light transition-colors">
                    Get Started!
                </button>
            </div>
        </div>
    );
};