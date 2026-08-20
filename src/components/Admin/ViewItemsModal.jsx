import { X, Tag, Percent } from 'lucide-react';

// `receipt` (new, preferred): pass the full receipt object and this renders
// the complete subtotal → discount → tax → total breakdown automatically.
// `total` (legacy): still supported as a plain fallback number for any
// caller that hasn't been updated yet — shows a flat "Total" row only.
export default function ViewItemsModal({ open, onClose, title, subtitle, items = [], total, receipt, payment }) {
    if (!open) return null;

    const subtotal = receipt?.subtotal ?? total;
    const discountAmount = receipt?.discount?.amount || 0;
    const discountLabel = receipt?.discount?.kind === 'percent'
        ? `Discount (${receipt.discount.value}%${receipt.discount.reason ? ` · ${receipt.discount.reason}` : ''})`
        : receipt?.discount?.kind === 'fixed'
            ? `Discount${receipt.discount.reason ? ` (${receipt.discount.reason})` : ''}`
            : null;
    const taxAmount = receipt?.tax?.amount || 0;
    const taxLabel = receipt?.tax?.ratePercent
        ? `Tax (${receipt.tax.ratePercent}%${receipt.tax.inclusive ? ', incl.' : ''})`
        : 'Tax';
    const grandTotal = receipt?.totalDue ?? total ?? subtotal;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-4">
                    <div>
                        <h3 className="text-lg font-black text-white">{title}</h3>
                        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No items to show</p>
                    ) : (
                        items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800/70 text-sm">
                                <span className="text-gray-300">
                                    {i.name} <span className="text-gray-500 font-semibold">× {i.qty}</span>
                                </span>
                                <span className="font-bold text-gray-100">KES {(i.qty * i.price).toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>

                {subtotal !== undefined && (
                    <div className="border-t border-gray-800 mt-4 pt-3 space-y-1.5">
                        {(discountAmount > 0 || taxAmount > 0) && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-semibold text-gray-300">KES {Number(subtotal).toLocaleString()}</span>
                            </div>
                        )}

                        {discountAmount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <Tag size={12} /> {discountLabel}
                                </span>
                                <span className="font-semibold text-orange-400">−KES {Number(discountAmount).toLocaleString()}</span>
                            </div>
                        )}

                        {taxAmount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <Percent size={12} /> {taxLabel}
                                </span>
                                <span className="font-semibold text-gray-300">KES {Number(taxAmount).toLocaleString()}</span>
                            </div>
                        )}

                        <div className="flex justify-between font-black text-white pt-1.5 border-t border-gray-800/70">
                            <span>Total</span>
                            <span className="text-orange-500">KES {Number(grandTotal).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {payment && (
                    <div className="border-t border-gray-800 mt-4 pt-4 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">
                            Payment Details
                        </p>

                        {payment.method === 'cash' && (
                            <>
                                <PaymentRow label="Cash" value={`KES ${Number(payment.cashAmount || 0).toLocaleString()}`} />
                                {payment.changeGiven > 0 && (
                                    <PaymentRow label="Change" value={`KES ${Number(payment.changeGiven).toLocaleString()}`} accent />
                                )}
                            </>
                        )}

                        {payment.method === 'mpesa_till' && (
                            <PaymentRow label="Till" value={`KES ${Number(payment.tillAmount || 0).toLocaleString()}`} />
                        )}

                        {payment.method === 'both' && (
                            <>
                                <PaymentRow label="Cash" value={`KES ${Number(payment.cashAmount || 0).toLocaleString()}`} />
                                <PaymentRow label="Till" value={`KES ${Number(payment.tillAmount || 0).toLocaleString()}`} />
                            </>
                        )}

                        {payment.mpesaReceiptNumber && (
                            <PaymentRow label="M-Pesa Ref" value={payment.mpesaReceiptNumber} />
                        )}

                        {payment.paidAt && (
                            <PaymentRow label="Time Paid" value={new Date(payment.paidAt).toLocaleString()} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentRow({ label, value, accent }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-bold ${accent ? 'text-emerald-400' : 'text-gray-100'}`}>{value}</span>
        </div>
    );
}