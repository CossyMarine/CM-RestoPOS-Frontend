import { useState, useMemo, useEffect } from 'react';
import { Wallet, Landmark, Smartphone, Gift, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

export default function ComboPayModal({ receipt, onClose, onPaid }) {
    const due = receipt ? Number((receipt.subtotal - (receipt.amountPaid || 0)).toFixed(2)) : 0;

    const [cash, setCash] = useState('');
    const [till, setTill] = useState('');
    const [reward, setReward] = useState('');
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [promptPhone, setPromptPhone] = useState('');
    const [applying, setApplying] = useState(false);
    const [sendingPrompt, setSendingPrompt] = useState(false);
    const [mpesaState, setMpesaState] = useState('idle'); // idle | pending | success | failed
    const [mpesaMessage, setMpesaMessage] = useState('');
    const [remaining, setRemaining] = useState(due);

    // Re-sync balance + clear stale inputs whenever a new receipt is selected for payment.
    useEffect(() => {
        if (receipt) {
            setRemaining(Number((receipt.subtotal - (receipt.amountPaid || 0)).toFixed(2)));
            setCash(''); setTill(''); setReward(''); setRewardIdentifier('');
            setPromptPhone(''); setMpesaState('idle'); setMpesaMessage('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receipt?._id]);

    const entered = (parseFloat(cash) || 0) + (parseFloat(till) || 0) + (parseFloat(reward) || 0);
    const afterApply = useMemo(() => Number((remaining - entered).toFixed(2)), [remaining, entered]);

    if (!receipt) return null;

    const reset = () => {
        setCash(''); setTill(''); setReward(''); setRewardIdentifier('');
        setPromptPhone(''); setMpesaState('idle'); setMpesaMessage('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleApply = async () => {
        if (entered <= 0) { toast.error('Enter at least one amount'); return; }
        if (afterApply < -0.01) { toast.error('That adds up to more than the balance due'); return; }
        if (parseFloat(reward) > 0 && !rewardIdentifier.trim()) {
            toast.error("Enter the customer's registered email or phone for the reward portion");
            return;
        }
        setApplying(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: parseFloat(cash) || 0,
                tillAmount: parseFloat(till) || 0,
                rewardAmount: parseFloat(reward) || 0,
                rewardIdentifier: rewardIdentifier.trim() || undefined,
            });
            toast.success(res.data.message);
            setRemaining(res.data.balanceRemaining);
            setCash(''); setTill(''); setReward(''); setRewardIdentifier('');
            if (res.data.balanceRemaining <= 0) {
                onPaid?.();
                handleClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setApplying(false);
    };

    const handleSendPrompt = async () => {
        if (!promptPhone.trim()) { toast.error("Enter the customer's M-Pesa number"); return; }
        setSendingPrompt(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: promptPhone.trim(),
                cashAmount: 0, // remaining balance already reflects any cash/till/reward already applied
            });
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setSendingPrompt(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-black text-gray-800 mb-1">Process Payment</h3>
                <p className="text-gray-400 text-sm mb-4">{receipt.billId} · Table {receipt.tableNumber}</p>

                <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-orange-500">KES {remaining.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">balance due</span>
                </div>

                {mpesaState === 'idle' || mpesaState === 'failed' ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold"><Wallet size={12} /> Cash</label>
                                <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold"><Landmark size={12} /> Till</label>
                                <input type="number" value={till} onChange={(e) => setTill(e.target.value)} placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500" />
                            </div>
                        </div>

                        <div className="mb-4 border border-purple-100 bg-purple-50/50 rounded-xl p-3">
                            <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold"><Gift size={12} className="text-purple-500" /> Reward</label>
                            <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="0"
                                className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-800 mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400" />
                            {parseFloat(reward) > 0 && (
                                <input type="text" value={rewardIdentifier} onChange={(e) => setRewardIdentifier(e.target.value)}
                                    placeholder="Customer's registered email or phone"
                                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400" />
                            )}
                        </div>

                        <div className={`text-sm font-bold mb-6 ${afterApply < 0 ? 'text-red-500' : afterApply === 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {afterApply < 0
                                ? `Over by KES ${Math.abs(afterApply).toLocaleString()}`
                                : `Remaining after this: KES ${afterApply.toLocaleString()}`}
                        </div>

                        <div className="flex gap-3 mb-6">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors">
                                Close
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={applying || entered <= 0 || afterApply < -0.01}
                                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {applying ? 'Applying…' : 'Apply'}
                            </button>
                        </div>

                        {remaining > 0 && (
                            <div className="border-t border-gray-100 pt-5">
                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-bold"><Smartphone size={12} /> Finish remainder on M-Pesa Prompt</label>
                                <div className="flex gap-2 mt-2">
                                    <input type="tel" value={promptPhone} onChange={(e) => setPromptPhone(e.target.value)} placeholder="07XXXXXXXX"
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500" />
                                    <button onClick={handleSendPrompt} disabled={sendingPrompt}
                                        className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-colors disabled:opacity-50">
                                        {sendingPrompt ? '…' : `Send KES ${remaining.toLocaleString()}`}
                                    </button>
                                </div>
                                {mpesaState === 'failed' && <p className="text-xs text-red-500 mt-2">{mpesaMessage}</p>}
                            </div>
                        )}
                    </>
                ) : mpesaState === 'pending' ? (
                    <div className="text-center py-4">
                        <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-700 font-bold mb-1">Waiting for confirmation…</p>
                        <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                        <button onClick={handleClose} className="text-xs font-semibold text-gray-400 hover:text-red-500">
                            Close (payment will still confirm in the background)
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
