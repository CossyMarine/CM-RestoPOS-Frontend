import { Gift } from 'lucide-react';

export default function RewardPayModal({
    rewardPayTarget,
    setRewardPayTarget,
    rewardPayIdentifier,
    setRewardPayIdentifier,
    rewardPayProcessing,
    handlePayWithReward,
    balanceDue,
}) {
    if (!rewardPayTarget) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-xl font-black text-gray-800 mb-1 flex items-center gap-2">
                    <Gift size={18} className="text-purple-500" /> Pay with Reward
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                    {rewardPayTarget.billId} · Balance KES {balanceDue(rewardPayTarget).toLocaleString()}
                </p>
                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                    Customer Email or Phone
                </label>
                <input
                    type="text"
                    value={rewardPayIdentifier}
                    onChange={(e) => setRewardPayIdentifier(e.target.value)}
                    placeholder="Registered email or phone"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                />
                <div className="flex gap-3">
                    <button
                        onClick={() => { setRewardPayTarget(null); setRewardPayIdentifier(''); }}
                        className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePayWithReward}
                        disabled={rewardPayProcessing}
                        className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {rewardPayProcessing ? 'Processing…' : 'Apply Points'}
                    </button>
                </div>
            </div>
        </div>
    );
}
