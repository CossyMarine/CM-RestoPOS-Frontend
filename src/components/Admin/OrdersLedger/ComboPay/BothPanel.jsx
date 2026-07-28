import { Wallet, Landmark, Smartphone } from 'lucide-react';
import GiveRewardBlock from './GiveRewardBlock';

export default function BothPanel({
    comboCash, setComboCash, comboTill, setComboTill,
    comboAfterApply, comboEntered, remaining,
    comboApplying, onApply, onCancel,
    comboPromptPhone, setComboPromptPhone, comboSendingPrompt, onSendPrompt,
    ...rewardProps
}) {
    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold">
                        <Wallet size={12} /> Cash
                    </label>
                    <input
                        type="number"
                        value={comboCash}
                        onChange={(e) => setComboCash(e.target.value)}
                        placeholder="0"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold">
                        <Landmark size={12} /> Till
                    </label>
                    <input
                        type="number"
                        value={comboTill}
                        onChange={(e) => setComboTill(e.target.value)}
                        placeholder="0"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                    />
                </div>
            </div>

            <div className={`text-sm font-bold mb-4 ${comboAfterApply < 0 ? 'text-red-500' : comboAfterApply === 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                {comboAfterApply < 0
                    ? `Over by KES ${Math.abs(comboAfterApply).toLocaleString()}`
                    : `Remaining after this: KES ${comboAfterApply.toLocaleString()}`}
            </div>

            <GiveRewardBlock {...rewardProps} />

            <div className="flex gap-3 mb-4">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onApply}
                    disabled={comboApplying || comboEntered <= 0 || comboAfterApply < -0.01}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                >
                    {comboApplying ? 'Applying…' : 'Apply'}
                </button>
            </div>

            {remaining > 0 && (
                <div className="border-t border-gray-100 pt-5">
                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold">
                        <Smartphone size={12} /> Finish remainder on M-Pesa Prompt
                    </label>
                    <div className="flex gap-2 mt-2">
                        <input
                            type="tel"
                            value={comboPromptPhone}
                            onChange={(e) => setComboPromptPhone(e.target.value)}
                            placeholder="07XXXXXXXX"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                        />
                        <button
                            onClick={onSendPrompt}
                            disabled={comboSendingPrompt}
                            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            {comboSendingPrompt ? '…' : `Send KES ${remaining.toLocaleString()}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
