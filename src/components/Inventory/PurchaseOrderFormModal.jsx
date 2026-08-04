// src/components/Inventory/PurchaseOrderFormModal.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { itemTypeLabel } from './inventoryLabels';

const emptyLine = () => ({
    key: Math.random().toString(36).slice(2),
    itemId: '',
    quantity: '',
    costPerUnit: '',
});

export default function PurchaseOrderFormModal({ purchaseOrder, onClose, onSaved }) {
    const isEdit = Boolean(purchaseOrder);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [supplierId, setSupplierId] = useState(purchaseOrder?.supplier?._id || '');
    const [locationId, setLocationId] = useState(purchaseOrder?.location?._id || '');
    const [note, setNote] = useState(purchaseOrder?.note || '');
    const [lines, setLines] = useState(
        purchaseOrder?.items?.length
            ? purchaseOrder.items.map((i) => ({
                  key: Math.random().toString(36).slice(2),
                  itemId: i.inventoryItem?._id || i.inventoryItem,
                  quantity: String(i.quantityOrdered),
                  costPerUnit: String(i.costPerUnit),
              }))
            : [emptyLine()]
    );
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, locationsRes, suppliersRes] = await Promise.all([
                API.get('/inventory/items'),
                API.get('/inventory/locations'),
                API.get('/inventory/suppliers'),
            ]);
            setItems((itemsRes.data || []).filter((i) => i.isActive));
            const locs = (locationsRes.data || []).filter((l) => l.isActive !== false);
            setLocations(locs);
            setSuppliers((suppliersRes.data || []).filter((s) => s.isActive));
            if (!isEdit) {
                const store = locs.find((l) => l.code === 'STORE');
                setLocationId((store || locs[0])?._id || '');
            }
        } catch (err) {
            console.error('Failed to load order form data', err);
            toast.error('Could not load items, locations and suppliers');
        }
        setLoading(false);
    }, [isEdit]);

    useEffect(() => {
        load();
    }, [load]);

    const itemsById = useMemo(() => new Map(items.map((i) => [i._id, i])), [items]);

    const updateLine = (key, patch) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const handleItemSelect = (key, itemId) => {
        const item = itemsById.get(itemId);
        updateLine(key, { itemId, costPerUnit: item?.costPerUnit != null ? String(item.costPerUnit) : '' });
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

    const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.costPerUnit) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!supplierId) {
            toast.error('Choose a supplier');
            return;
        }
        if (!locationId) {
            toast.error('Choose where this order should go');
            return;
        }
        const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
        if (validLines.length === 0) {
            toast.error('Add at least one item with a quantity');
            return;
        }
        for (const l of validLines) {
            if (l.costPerUnit === '' || Number(l.costPerUnit) < 0) {
                toast.error('Every item needs a cost per unit');
                return;
            }
        }
        const seen = new Set();
        for (const l of validLines) {
            if (seen.has(l.itemId)) {
                toast.error('The same item is on this order twice — combine them into one line');
                return;
            }
            seen.add(l.itemId);
        }

        const payload = {
            supplier: supplierId,
            location: locationId,
            note: note.trim(),
            items: validLines.map((l) => {
                const item = itemsById.get(l.itemId);
                return {
                    inventoryItem: l.itemId,
                    quantityOrdered: Number(l.quantity),
                    unit: item.unit?._id,
                    costPerUnit: Number(l.costPerUnit),
                };
            }),
        };

        setSubmitting(true);
        try {
            const res = isEdit
                ? await API.put(`/inventory/purchase-orders/${purchaseOrder._id}`, payload)
                : await API.post('/inventory/purchase-orders', payload);
            toast.success(isEdit ? 'Order updated' : 'Order created as a draft');
            onSaved(res.data);
        } catch (err) {
            console.error('Failed to save purchase order', err);
            toast.error(err.response?.data?.message || 'Could not save this order');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <ClipboardList size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">{isEdit ? `Edit Order ${purchaseOrder.poNumber}` : 'New Order'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>
                ) : (
                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Supplier</label>
                                <select
                                    value={supplierId}
                                    onChange={(e) => setSupplierId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                >
                                    <option value="">Select a supplier…</option>
                                    {suppliers.map((s) => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Deliver To</label>
                                <select
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                >
                                    {locations.map((l) => (
                                        <option key={l._id} value={l._id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">What do you want to order?</label>

                            {lines.map((line) => {
                                const item = itemsById.get(line.itemId);
                                return (
                                    <div
                                        key={line.key}
                                        className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end"
                                    >
                                        <div>
                                            <label className="text-[11px] text-gray-500 block mb-1">Item</label>
                                            <select
                                                value={line.itemId}
                                                onChange={(e) => handleItemSelect(line.key, e.target.value)}
                                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                                            >
                                                <option value="">Select an item…</option>
                                                {items.map((i) => (
                                                    <option key={i._id} value={i._id}>
                                                        {i.name} ({itemTypeLabel(i.itemType)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-500 block mb-1">
                                                Quantity {item?.unit?.abbreviation ? `(${item.unit.abbreviation})` : ''}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-500 block mb-1">Cost/unit (KES)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={line.costPerUnit}
                                                onChange={(e) => updateLine(line.key, { costPerUnit: e.target.value })}
                                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeLine(line.key)}
                                            disabled={lines.length === 1}
                                            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={addLine}
                                className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600"
                            >
                                <Plus size={14} /> Add another item
                            </button>

                            <p className="text-right text-sm font-black text-gray-700">
                                Estimated total: KES {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Notes (optional)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            />
                        </div>
                    </div>
                )}

                <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || loading}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                        {submitting ? 'Saving…' : isEdit ? 'Save Draft' : 'Save as Draft'}
                    </button>
                </div>
            </form>
        </div>
    );
}