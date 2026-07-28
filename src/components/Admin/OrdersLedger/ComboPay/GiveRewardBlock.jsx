import { Gift } from 'lucide-react';

export default function GiveRewardBlock({ giveReward, setGiveReward, giveRewardIdentifier, setGiveRewardIdentifier }) {
    return (
        <div className="mb-4 border border-emerald-100 bg-emerald-50/50 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={giveReward}
                    onChange={(e) => setGiveReward(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-600"
                />
                <span className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                    <Gift size={14} /> Give Reward
                </span>
            </label>
            {giveReward && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-xs text-emerald-700 uppercase tracking-widest mb-1 block font-bold">
                        Customer Email or Phone
                    </label>
                    <input
                        type="text"
                        value={giveRewardIdentifier}
                        onChange={(e) => setGiveRewardIdentifier(e.target.value)}
                        placeholder="Registered email or phone"
                        className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400"
                    />
                    <p className="text-[11px] text-emerald-700/70 mt-1">
                        Cashback is credited according to the current reward settings.
                    </p>
                </div>
            )}
        </div>
    );
}
