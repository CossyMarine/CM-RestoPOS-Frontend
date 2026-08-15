// src/components/Inventory/ProductionDetailModal.jsx
import { useState } from 'react';
import { X, ChefHat, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { formatKES, formatQty, formatShortDate } from './inventoryLabels';

const STATUS_STYLES = {
    completed: { label: 'Completed', classes: 'bg-green-50 text-green-700 border-green-200' },
    pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-600 border-red-200' },
};

export default function ProductionDetailModal({ production, onClose, onCancelled }) {
    const [busy, setBusy] = useState(false);
    const status = STATUS_STYLES[production.status] || STATUS_STYLES.completed;
    const totalCost = (production.ingredientsUsed || []).reduce((s, i) => s + (i.totalCost || 0), 0);

    const handleCancel = async () => {
        if (!window.confirm('Undo this batch? The ingredients used will be put back into stock and this prepared food will be removed.')) return;
        setBusy(true);
        try {
            await API.delete(`/inventory/production/${production._id}`);
            toast.success('Batch undone — ingredients restored');
            onCancelled(production._id);
        } catch (err) {
            console.error('Failed to cancel production', err);
            toast.error(err.response?.data?.message || 'Could not undo this batch');
        }
        setBusy(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <ChefHat size={16} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-800">{production.producedItem?.name}</h3>
                            <p className="text-xs text-gray-400">{production.location?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status.classes}`}>
                            {status.label}
                        </span>
                        <p className="text-sm font-black text-gray-700">
                            {formatQty(production.quantityProduced, production.unit?.abbreviation)} made
                        </p>
                    </div>

                    {production.note && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">{production.note}</p>}

                    <div>
                        <h4 className="text-sm font-black text-gray-800 mb-3">Ingredients Used</h4>
                        <div className="space-y-2">
                            {(production.ingredientsUsed || []).map((ing, idx) => (
                                <div key={idx} className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-2.5">
                                    <p className="text-sm font-semibold text-gray-700">{ing.inventoryItem?.name || 'Ingredient'}</p>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-700">
                                            {formatQty(ing.quantityUsed, ing.unit?.abbreviation || ing.inventoryItem?.unit?.abbreviation)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">{formatKES(ing.totalCost)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-right text-xs font-bold text-gray-500 mt-2">Total cost: {formatKES(totalCost)}</p>
                    </div>

                    <p className="text-[11px] text-gray-400">
                        Prepared by {production.producedBy?.fullName || 'someone'} on {formatShortDate(production.createdAt)}
                    </p>

                    {production.status === 'completed' && (
                        <button
                            onClick={handleCancel}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 disabled:opacity-50 pt-2 border-t border-gray-100"
                        >
                            <Undo2 size={13} /> {busy ? 'Undoing…' : 'Undo This Batch'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}