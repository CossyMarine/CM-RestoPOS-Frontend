import { Wallet, Landmark, Smartphone } from 'lucide-react';
import GiveRewardBlock from './GiveRewardBlock';

export function CashPanel({ amountPaid, setAmountPaid, remaining, cashChange, ...rewardProps }) {
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                Amount Received
            </label>
            <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                placeholder={remaining}
            />
            {amountPaid && (
                <p className={`text-sm font-medium mt-2 ${cashChange < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {cashChange < 0
                        ? `Short by KES ${Math.abs(cashChange).toLocaleString()} — cannot accept`
                        : `Change: KES ${cashChange.toFixed(2)}`}
                </p>
            )}
            <div className="mt-4"><GiveRewardBlock {...rewardProps} /></div>
        </div>
    );
}

export function TillPanel({ tillAmount, setTillAmount, remaining, ...rewardProps }) {
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                    Amount (partial or full)
                </label>
                <input
                    type="number"
                    value={tillAmount}
                    onChange={(e) => setTillAmount(e.target.value)}
                    placeholder={remaining}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                />
            </div>
            <GiveRewardBlock {...rewardProps} />
        </div>
    );
}

export function PromptPanel({ mpesaPhone, setMpesaPhone, remaining }) {
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                    Customer M-Pesa Number
                </label>
                <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                />
            </div>
            <p className="text-xs text-gray-400">
                Prompt amount: <span className="font-bold text-gray-700">KES {remaining.toLocaleString()}</span>
            </p>
        </div>
    );
}

export function RewardPanel({ rewardAmount, setRewardAmount, rewardIdentifier, setRewardIdentifier, rewardRemainder, remaining }) {
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3 border border-purple-100 bg-purple-50/50 rounded-xl p-3">
            <div>
                <label className="text-xs text-purple-700 uppercase tracking-widest mb-1 block font-bold">
                    Reward Amount (partial or full)
                </label>
                <input
                    type="number"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    placeholder={remaining}
                    className="w-full bg-white border border-purple-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                />
            </div>
            <div>
                <label className="text-xs text-purple-700 uppercase tracking-widest mb-1 block font-bold">
                    Customer Email or Phone
                </label>
                <input
                    type="text"
                    value={rewardIdentifier}
                    onChange={(e) => setRewardIdentifier(e.target.value)}
                    placeholder="Registered email or phone"
                    className="w-full bg-white border border-purple-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                />
            </div>
            {rewardAmount && (
                <p className="text-xs font-semibold text-purple-700">
                    Remaining after this: KES {rewardRemainder.toLocaleString()}
                </p>
            )}
        </div>
    );
}
