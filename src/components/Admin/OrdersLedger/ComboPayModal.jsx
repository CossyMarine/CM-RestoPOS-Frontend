// src/components/Admin/OrdersLedger/ComboPayModal.jsx
import { useState, useEffect } from 'react';
import { Wallet, Smartphone, Layers, Landmark, Gift, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import PrintReceipt from '../../PrintReceipt';

export default function ComboPayModal({ receipt, onClose, onPaid }) {
    const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' | 'prompt' | 'both' | 'till' | 'reward'
    const [amountPaid, setAmountPaid] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [tillAmount, setTillAmount] = useState('');
    const [rewardAmount, setRewardAmount] = useState('');
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [processing, setProcessing] = useState(false);
    const [mpesaState, setMpesaState] = useState('idle'); // idle | pending | failed
    const [mpesaMessage, setMpesaMessage] = useState('');
    const [remaining, setRemaining] = useState(0);

    // ---- Print-on-payment (global admin setting) ----
    const [allowPrinting, setAllowPrinting] = useState(false);
    const [printTarget, setPrintTarget] = useState(null);

    // ---- "Both" — cash + till entered simultaneously, applied together ----
    const [comboCash, setComboCash] = useState('');
    const [comboTill, setComboTill] = useState('');
    const [comboPromptPhone, setComboPromptPhone] = useState('');
    const [comboApplying, setComboApplying] = useState(false);
    const [comboSendingPrompt, setComboSendingPrompt] = useState(false);

    // Load the global "allow printing during payment" setting once.
    useEffect(() => {
        API.get('/settings')
            .then((res) => setAllowPrinting(!!res.data.allowPrintingDuringPayment))
            .catch(() => setAllowPrinting(false));
    }, []);

    // Declared BEFORE the effect below uses it — avoids the TDZ crash.
    const reset = () => {
        setPaymentMethod('');
        setAmountPaid('');
        setMpesaPhone('');
        setTillAmount('');
        setRewardAmount('');
        setRewardIdentifier('');
        setMpesaState('idle');
        setMpesaMessage('');
        setComboCash('');
        setComboTill('');
        setComboPromptPhone('');
    };

    const handleClose = () => { reset(); onClose(); };

    const refreshAfterPayment = () => onPaid?.();

    // Prints the receipt with its payment breakdown once a bill is fully
    // settled — gated by the admin's "allow printing during payment" toggle.
    const printPaidReceipt = (paidReceipt) => {
        if (!allowPrinting || !paidReceipt) return;
        setPrintTarget(paidReceipt);
        setTimeout(() => {
            window.print();
            API.patch(`/receipts/${paidReceipt._id}/print`).catch(() => {});
            setPrintTarget(null);
        }, 150);
    };

    // Re-sync balance + clear stale inputs whenever a new receipt is selected for payment.
    useEffect(() => {
        if (receipt) {
            setRemaining(Number((receipt.subtotal - (receipt.amountPaid || 0)).toFixed(2)));
        }
        reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receipt?._id]);

    if (!receipt) return null;

    const cashChange = paymentMethod === 'cash' && amountPaid
        ? parseFloat(amountPaid) - remaining
        : null;

    const rewardRemainder = paymentMethod === 'reward'
        ? Math.max(Number((remaining - (parseFloat(rewardAmount) || 0)).toFixed(2)), 0)
        : remaining;

    // Both: live combined total + remaining, recalculates as either field changes.
    const comboEntered = (parseFloat(comboCash) || 0) + (parseFloat(comboTill) || 0);
    const comboAfterApply = Number((remaining - comboEntered).toFixed(2));

    // ---- Cash (full balance only) ----
    const handleCashPay = async () => {
        const received = parseFloat(amountPaid);
        if (isNaN(received) || received < remaining) {
            toast.error('Amount received cannot be less than the balance due');
            return;
        }
        setProcessing(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay`, { amountPaid: received });
            toast.success('Payment recorded');
            printPaidReceipt(res.data.receipt);
            reset();
            onPaid?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    // ---- Till (partial or full) ----
    const handleTillPay = async () => {
        const amt = parseFloat(tillAmount);
        if (isNaN(amt) || amt <= 0 || amt > remaining) {
            toast.error(`Enter an amount between 1 and ${remaining}`);
            return;
        }
        setProcessing(true);
        try {
            const res = await API.post('/wallet/pay/manual', { receiptId: receipt._id, amount: amt });
            toast.success('Payment recorded');
            const newRemaining = Number((remaining - amt).toFixed(2));
            if (newRemaining <= 0) {
                // NOTE: confirm this endpoint returns `receipt` in its response body.
                // If it doesn't, swap for a GET /receipts/:id fetch before printing.
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                setRemaining(newRemaining);
                setTillAmount('');
                setPaymentMethod('');
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    // ---- Prompt (standalone, full remaining balance) ----
    const handleSendStk = async () => {
        if (!mpesaPhone.trim()) {
            toast.error('Enter the M-Pesa phone number');
            return;
        }
        setProcessing(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: mpesaPhone.trim(),
                cashAmount: 0,
            });
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setProcessing(false);
    };

    const handleRetryMpesa = async () => {
        try {
            await API.post(`/receipts/${receipt._id}/mpesa/cancel`);
        } catch (err) {
            console.error('Failed to reset M-Pesa state', err);
        }
        setMpesaState('idle');
        setMpesaMessage('');
    };

    // ---- Reward (partial or full, redeems the customer's own points) ----
    const handleRewardPay = async () => {
        const amt = parseFloat(rewardAmount);
        if (isNaN(amt) || amt <= 0 || amt > remaining) {
            toast.error(`Enter an amount between 1 and ${remaining}`);
            return;
        }
        if (!rewardIdentifier.trim()) {
            toast.error("Enter the customer's registered email or phone");
            return;
        }
        setProcessing(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: 0,
                tillAmount: 0,
                rewardAmount: amt,
                rewardIdentifier: rewardIdentifier.trim(),
            });
            toast.success(res.data.message);
            const newRemaining = res.data.balanceRemaining ?? Number((remaining - amt).toFixed(2));
            if (newRemaining <= 0) {
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                setRemaining(newRemaining);
                setRewardAmount('');
                setRewardIdentifier('');
                setPaymentMethod('');
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    // ---- Both: apply Cash + Till together in one call ----
    const handleComboApply = async () => {
        if (comboEntered <= 0) { toast.error('Enter at least one amount'); return; }
        if (comboAfterApply < -0.01) { toast.error('That adds up to more than the balance due'); return; }
        setComboApplying(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: parseFloat(comboCash) || 0,
                tillAmount: parseFloat(comboTill) || 0,
                rewardAmount: 0,
            });
            toast.success(res.data.message);
            const newRemaining = res.data.balanceRemaining ?? 0;
            setRemaining(newRemaining);
            setComboCash('');
            setComboTill('');
            if (newRemaining <= 0) {
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setComboApplying(false);
    };

    // ---- Both: finish whatever's left on M-Pesa prompt ----
    const handleComboSendPrompt = async () => {
        if (!comboPromptPhone.trim()) { toast.error("Enter the customer's M-Pesa number"); return; }
        setComboSendingPrompt(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: comboPromptPhone.trim(),
                cashAmount: 0, // remaining already reflects any cash/till already applied
            });
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setComboSendingPrompt(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-black text-gray-800 mb-2">Process Payment</h3>
                <p className="text-gray-400 text-sm mb-6">
                    {receipt.billId} · Table {receipt.tableNumber}
                    {receipt.status === 'partial' && (
                        <span className="ml-2 text-blue-600 font-bold">· Partially paid</span>
                    )}
                </p>

                <div className="mb-1 text-3xl font-black text-orange-500">
                    KES {remaining.toLocaleString()}
                </div>
                {receipt.amountPaid > 0 && (
                    <p className="text-xs text-gray-400 mb-6">
                        Balance due · KES {receipt.amountPaid.toLocaleString()} already paid of KES {receipt.subtotal.toLocaleString()}
                    </p>
                )}
                {!receipt.amountPaid && <div className="mb-6" />}

                {(mpesaState === 'idle' || mpesaState === 'failed') && (
                    <>
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                                    paymentMethod === 'cash'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Wallet size={16} /> Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('prompt')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                                    paymentMethod === 'prompt'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Smartphone size={16} /> Prompt
                            </button>
                            <button
                                onClick={() => setPaymentMethod('both')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                                    paymentMethod === 'both'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Layers size={16} /> Both
                            </button>
                            <button
                                onClick={() => setPaymentMethod('till')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                                    paymentMethod === 'till'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Landmark size={16} /> Till
                            </button>
                            <button
                                onClick={() => setPaymentMethod('reward')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[10px] ${
                                    paymentMethod === 'reward'
                                        ? 'bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-purple-500/40'
                                }`}
                            >
                                <Gift size={16} /> Reward
                            </button>
                        </div>

                        {paymentMethod === 'cash' && (
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
                            </div>
                        )}

                        {paymentMethod === 'prompt' && (
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
                        )}

                        {paymentMethod === 'till' && (
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
                            </div>
                        )}

                        {paymentMethod === 'reward' && (
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
                        )}

                        {/* ---- Both: Cash + Till entered together, applied in one action ---- */}
                        {paymentMethod === 'both' && (
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

                                {/* Live — recalculates the instant either field changes, never stuck on the full total */}
                                <div className={`text-sm font-bold mb-4 ${comboAfterApply < 0 ? 'text-red-500' : comboAfterApply === 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                    {comboAfterApply < 0
                                        ? `Over by KES ${Math.abs(comboAfterApply).toLocaleString()}`
                                        : `Remaining after this: KES ${comboAfterApply.toLocaleString()}`}
                                </div>

                                <div className="flex gap-3 mb-4">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleComboApply}
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
                                                onClick={handleComboSendPrompt}
                                                disabled={comboSendingPrompt}
                                                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold transition-colors disabled:opacity-50"
                                            >
                                                {comboSendingPrompt ? '…' : `Send KES ${remaining.toLocaleString()}`}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer for the other 4 methods — Both has its own Apply/Cancel above */}
                        {paymentMethod !== 'both' && (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={
                                        paymentMethod === 'cash'
                                            ? handleCashPay
                                            : paymentMethod === 'till'
                                            ? handleTillPay
                                            : paymentMethod === 'reward'
                                            ? handleRewardPay
                                            : handleSendStk
                                    }
                                    disabled={
                                        !paymentMethod ||
                                        processing ||
                                        (paymentMethod === 'cash' && cashChange !== null && cashChange < 0)
                                    }
                                    className={`flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-50 shadow-sm ${
                                        paymentMethod === 'reward' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'
                                    }`}
                                >
                                    {processing
                                        ? 'Processing…'
                                        : paymentMethod === 'reward'
                                        ? 'Apply Points'
                                        : paymentMethod === 'cash' || paymentMethod === 'till'
                                        ? 'Confirm Payment'
                                        : 'Send Prompt'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {mpesaState === 'pending' && (
                    <div className="text-center py-4">
                        <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-700 font-bold mb-1">Waiting for confirmation…</p>
                        <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                        <button
                            onClick={handleClose}
                            className="text-xs font-semibold text-gray-400 hover:text-red-500"
                        >
                            Close (payment will still confirm in the background)
                        </button>
                    </div>
                )}
            </div>

            <PrintReceipt receipt={printTarget} />
        </div>
    );
}
