import { Wallet, Smartphone, Layers, Landmark, Gift } from 'lucide-react';

const METHODS = [
    { key: 'cash', label: 'Cash', icon: Wallet },
    { key: 'prompt', label: 'Prompt', icon: Smartphone },
    { key: 'both', label: 'Both', icon: Layers },
    { key: 'till', label: 'Till', icon: Landmark },
    { key: 'reward', label: 'Reward', icon: Gift },
];

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod }) {
    return (
        <div className="grid grid-cols-5 gap-2 mb-6">
            {METHODS.map(({ key, label, icon: Icon }) => {
                const active = paymentMethod === key;
                const activeClasses = key === 'reward'
                    ? 'bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/10'
                    : 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10';
                const inactiveClasses = key === 'reward'
                    ? 'border-gray-200 bg-gray-50 text-gray-600 hover:border-purple-500/40'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40';
                return (
                    <button
                        key={key}
                        onClick={() => setPaymentMethod(key)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                            active ? activeClasses : inactiveClasses
                        }`}
                    >
                        <Icon size={16} /> {label}
                    </button>
                );
            })}
        </div>
    );
}
