import { Wallet, Smartphone, Layers, Landmark, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function PaymentModal({
    selected,
    due,
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    cashPortion,
    setCashPortion,
    mpesaPhone,
    setMpesaPhone,
    tillAmount,
    setTillAmount,
    bothMethod,
    setBothMethod,
    processing,
    mpesaState,
    mpesaMessage,
    cashChange,
    tillPortion,
    addReward,
    setAddReward,
    rewardIdentifier,
    setRewardIdentifier,
    resetPaymentState,
    handleCashPay,
    handleTillPay,
    handleCashTillPay,
    handleSendStk,
    handleRetryMpesa,
}) {
    if (!selected) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-black text-gray-800 mb-2">Process Payment</h3>
                <p className="text-gray-400 text-sm mb-6">
                    {selected.billId} · Table {selected.tableNumber}
                    {selected.status === 'partial' && (
                        <span className="ml-2 text-blue-600 font-bold">· Partially paid</span>
                    )}
                </p>

                <div className="mb-1 text-3xl font-black text-orange-500">
                    KES {due.toLocaleString()}
                </div>
                {selected.amountPaid > 0 && (
                    <p className="text-xs text-gray-400 mb-6">
                        Balance due · KES {selected.amountPaid.toLocaleString()} already paid of KES {selected.subtotal.toLocaleString()}
                    </p>
                )}
                {!selected.amountPaid && <div className="mb-6" />}

                {mpesaState === 'idle' && (
                    <>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                    paymentMethod === 'cash'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Wallet size={16} /> Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('prompt')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                    paymentMethod === 'prompt'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Smartphone size={16} /> Prompt
                            </button>
                            <button
                                onClick={() => setPaymentMethod('both')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                    paymentMethod === 'both'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Layers size={16} /> Both
                            </button>
                            <button
                                onClick={() => setPaymentMethod('till')}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                    paymentMethod === 'till'
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                }`}
                            >
                                <Landmark size={16} /> Till
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
                                    placeholder={due}
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
                                    Prompt amount: <span className="font-bold text-gray-700">KES {due.toLocaleString()}</span>
                                </p>
                            </div>
                        )}

                        {paymentMethod === 'both' && (
                            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setBothMethod('prompt')}
                                        className={`py-2 rounded-lg font-bold text-[11px] border transition-all ${
                                            bothMethod === 'prompt'
                                                ? 'bg-orange-500 border-orange-500 text-white'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        Cash + Prompt
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBothMethod('till')}
                                        className={`py-2 rounded-lg font-bold text-[11px] border transition-all ${
                                            bothMethod === 'till'
                                                ? 'bg-orange-500 border-orange-500 text-white'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        Cash + Till
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                        Cash Received
                                    </label>
                                    <input
                                        type="number"
                                        value={cashPortion}
                                        onChange={(e) => setCashPortion(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                        placeholder="e.g. 300"
                                    />
                                </div>
                                {bothMethod === 'prompt' && (
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                            Customer M-Pesa Number (Prompt Portion)
                                        </label>
                                        <input
                                            type="tel"
                                            value={mpesaPhone}
                                            onChange={(e) => setMpesaPhone(e.target.value)}
                                            placeholder="07XXXXXXXX"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                        />
                                    </div>
                                )}
                                <p className="text-xs text-gray-400">
                                    {bothMethod === 'till' ? 'Till amount (auto)' : 'Prompt amount (auto)'}:{' '}
                                    <span className="font-bold text-gray-700">KES {tillPortion.toLocaleString()}</span>
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
                                        placeholder={due}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod && (
                            <div className="mb-6 border border-purple-100 bg-purple-50/50 rounded-xl p-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={addReward}
                                        onChange={(e) => setAddReward(e.target.checked)}
                                    />
                                    This customer has an account — credit reward points
                                </label>
                                {addReward && (
                                    <input
                                        type="text"
                                        value={rewardIdentifier}
                                        onChange={(e) => setRewardIdentifier(e.target.value)}
                                        placeholder="Their registered email or phone"
                                        className="w-full mt-2 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                                    />
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={resetPaymentState}
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
                                        : paymentMethod === 'both' && bothMethod === 'till'
                                        ? handleCashTillPay
                                        : handleSendStk
                                }
                                disabled={
                                    !paymentMethod ||
                                    processing ||
                                    (paymentMethod === 'cash' && cashChange !== null && cashChange < 0)
                                }
                                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {processing
                                    ? 'Processing…'
                                    : paymentMethod === 'cash' ||
                                      paymentMethod === 'till' ||
                                      (paymentMethod === 'both' && bothMethod === 'till')
                                    ? 'Confirm Payment'
                                    : 'Send Prompt'}
                            </button>
                        </div>
                    </>
                )}

                {(mpesaState === 'sending' || mpesaState === 'pending') && (
                    <div className="text-center py-4">
                        <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
                        <p className="text-gray-700 font-bold mb-1">
                            {mpesaState === 'sending' ? 'Sending prompt…' : 'Waiting for confirmation…'}
                        </p>
                        <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                        <button
                            onClick={resetPaymentState}
                            className="text-xs font-semibold text-gray-400 hover:text-red-500"
                        >
                            Close (payment will still confirm in the background)
                        </button>
                    </div>
                )}

                {mpesaState === 'success' && (
                    <div className="text-center py-4">
                        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                        <p className="text-gray-800 font-black">Payment Received</p>
                    </div>
                )}

                {mpesaState === 'failed' && (
                    <div className="text-center py-4">
                        <XCircle size={36} className="text-red-500 mx-auto mb-3" />
                        <p className="text-gray-700 font-bold mb-1">Payment not completed</p>
                        <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={resetPaymentState}
                                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRetryMpesa}
                                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors shadow-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
                            }
