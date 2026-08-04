// src/components/Inventory/PurchaseOrderDetailModal.jsx
import { useState } from 'react';
import { X, ClipboardList, Pencil, Send, Ban, PackagePlus } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { formatKES, formatQty, formatShortDate } from './inventoryLabels';

const STATUS_STYLES = {
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
    ordered: { label: 'Ordered', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
    partially_received: { label: 'Partially Received', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    received: { label: 'Received', classes: 'bg-green-50 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 border-red-200' },
};

export default function PurchaseOrderDetailModal({ purchaseOrder, onClose, onEdit, onChanged, onReceive }) {
    const [busy, setBusy] = useState(false);
    const status = STATUS_STYLES[purchaseOrder.status] || STATUS_STYLES.draft;

    const total = (purchaseOrder.items || []).reduce((s, i) => s + (i.totalCost || 0), 0);

    const runAction = async (action, confirmMessage) => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        setBusy(true);
        try {
            const res = await API.post(`/inventory/purchase-orders/${purchaseOrder._id}/${action}`);
            toast.success(action === 'order' ? 'Order sent' : 'Order cancelled');
            onChanged(res.data);
        } catch (err) {
            console.error(`Failed to ${action} purchase order`, err);
            toast.error(err.response?.data?.message || 'Could not update this order');
        }
        setBusy(false);
    };

    const canEdit = purchaseOrder.status === 'draft';
    const canSend = purchaseOrder.status === 'draft';
    const canCancel = !['received', 'cancelled'].includes(purchaseOrder.status);
    const canReceive = ['ordered', 'partially_received'].includes(purchaseOrder.status);

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <ClipboardList size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-800">{purchaseOrder.poNumber}</h3>
                            <p className="text-xs text-gray-400">{purchaseOrder.supplier?.name} · {purchaseOrder.location?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canEdit && (
                            <button onClick={() => onEdit(purchaseOrder)} className="text-gray-400 hover:text-orange-500" title="Edit">
                                <Pencil size={17} />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status.classes}`}>
                            {status.label}
                        </span>
                        <p className="text-sm font-black text-gray-700">{formatKES(total)}</p>
                    </div>

                    {purchaseOrder.note && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">{purchaseOrder.note}</p>}

                    <div>
                        <h4 className="text-sm font-black text-gray-800 mb-3">Items</h4>
                        <div className="space-y-2">
                            {(purchaseOrder.items || []).map((item, idx) => {
                                const ordered = Number(item.quantityOrdered || 0);
                                const received = Number(item.quantityReceived || 0);
                                const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
                                const unitAbbr = item.unit?.abbreviation || item.inventoryItem?.unit?.abbreviation;
                                return (
                                    <div key={idx} className="border border-gray-100 rounded-xl px-3 py-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="text-sm font-semibold text-gray-700">{item.inventoryItem?.name || 'Item'}</p>
                                            <p className="text-xs font-bold text-gray-500">
                                                {formatQty(received, unitAbbr)} / {formatQty(ordered, unitAbbr)}
                                            </p>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-orange-400'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400">
                        Ordered by {purchaseOrder.orderedBy?.fullName || 'someone'} on {formatShortDate(purchaseOrder.createdAt)}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        {canReceive && (
                            <button
                                onClick={() => onReceive(purchaseOrder)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-colors"
                            >
                                <PackagePlus size={14} /> Receive Against This Order
                            </button>
                        )}
                        {canSend && (
                            <button
                                onClick={() => runAction('order')}
                                disabled={busy}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors"
                            >
                                <Send size={14} /> Send Order
                            </button>
                        )}
                        {canCancel && (
                            <button
                                onClick={() => runAction('cancel', 'Cancel this order? This can\u2019t be undone.')}
                                disabled={busy}
                                className="flex items-center gap-1.5 px-4 py-2 text-red-500 hover:text-red-600 font-bold text-xs disabled:opacity-50"
                            >
                                <Ban size={14} /> Cancel Order
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}