// src/components/Inventory/ReceiveStock.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, PackagePlus, ClipboardList, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { itemTypeLabel } from './inventoryLabels';

const OTHER_SUPPLIER = '__other__';

const emptyLine = () => ({
    key: Math.random().toString(36).slice(2),
    itemId: '',
    quantity: '',
    costPerUnit: '',
    expiryDate: '',
});

const linesFromPurchaseOrder = (po) =>
    (po.items || [])
        .filter((i) => Number(i.quantityOrdered) - Number(i.quantityReceived || 0) > 0)
        .map((i) => ({
            key: Math.random().toString(36).slice(2),
            itemId: i.inventoryItem?._id || i.inventoryItem,
            quantity: String(Number(i.quantityOrdered) - Number(i.quantityReceived || 0)),
            costPerUnit: String(i.costPerUnit),
            expiryDate: '',
        }));

// purchaseOrder: optional, full populated PO object — locks supplier/location/items
// to that order and tags the receiving so the backend auto-updates the PO's
// received quantities and status.
export default function ReceiveStock({ purchaseOrder = null, onExitOrderMode, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [locationId, setLocationId] = useState(purchaseOrder?.location?._id || '');
    const [supplierId, setSupplierId] = useState(purchaseOrder?.supplier?._id || '');
    const [supplierNameFallback, setSupplierNameFallback] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState(purchaseOrder ? linesFromPurchaseOrder(purchaseOrder) : [emptyLine()]);
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
            if (!purchaseOrder) {
                const store = locs.find((l) => l.code === 'STORE');
                setLocationId((store || locs[0])?._id || '');
            }
        } catch (err) {
            console.error('Failed to load receive-stock form data', err);
            toast.error('Could not load items and locations');
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Re-sync the form whenever the target purchase order changes.
    useEffect(() => {
        if (purchaseOrder) {
            setLocationId(purchaseOrder.location?._id || '');
            setSupplierId(purchaseOrder.supplier?._id || '');
            setLines(linesFromPurchaseOrder(purchaseOrder));
        }
    }, [purchaseOrder]);

    const itemsById = useMemo(() => new Map(items.map((i) => [i._id, i])), [items]);

    const updateLine = (key, patch) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const handleItemSelect = (key, itemId) => {
        const item = itemsById.get(itemId);
        updateLine(key, {
            itemId,
            costPerUnit: item?.costPerUnit != null ? String(item.costPerUnit) : '',
        });
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

    const resetForm = () => {
        setSupplierId(purchaseOrder?.supplier?._id || '');
        setSupplierNameFallback('');
        setNote('');
        setLines(purchaseOrder ? linesFromPurchaseOrder(purchaseOrder) : [emptyLine()]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!locationId) {
            toast.error('Choose where this stock is going');
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

        const usingOther = !purchaseOrder && supplierId === OTHER_SUPPLIER;
        const selectedSupplier = suppliers.find((s) => s._id === supplierId);

        const payload = {
            ...(!usingOther && supplierId ? { supplier: supplierId } : {}),
            ...(purchaseOrder ? { purchaseOrder: purchaseOrder._id } : {}),
            supplierName: usingOther ? supplierNameFallback.trim() : (selectedSupplier?.name || purchaseOrder?.supplier?.name || ''),
            location: locationId,
            note: note.trim(),
            items: validLines.map((l) => {
                const item = itemsById.get(l.itemId);
                return {
                    inventoryItem: l.itemId,
                    quantity: Number(l.quantity),
                    unit: item.unit?._id,
                    costPerUnit: Number(l.costPerUnit),
                    ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
                };
            }),
        };

        setSubmitting(true);
        try {
            await API.post('/inventory/receiving', payload);
            toast.success('Stock received');
            resetForm();
            load();
            onSuccess?.();
            if (purchaseOrder) onExitOrderMode?.();
        } catch (err) {
            console.error('Failed to record receiving', err);
            toast.error(err.response?.data?.message || 'Could not record this delivery');
        }
        setSubmitting(false);
    };

    if (loading) {
        return <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PackagePlus size={18} className="text-orange-500" />
                    <h3 className="font-black text-gray-800">Receive Stock</h3>
                </div>
                {purchaseOrder && (
                    <button
                        type="button"
                        onClick={onExitOrderMode}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                        <X size={13} /> Receive manually instead
                    </button>
                )}
            </div>

            {purchaseOrder && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-xl px-3 py-2.5">
                    <ClipboardList size={14} />
                    Receiving against order <span className="font-black">{purchaseOrder.poNumber}</span> — supplier and items are locked to match this order.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                        Where is it going?
                    </label>
                    <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        disabled={Boolean(purchaseOrder)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 disabled:opacity-60"
                    >
                        {locations.map((l) => (
                            <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                        Supplier
                    </label>
                    {purchaseOrder ? (
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 font-semibold">
                            {purchaseOrder.supplier?.name}
                        </div>
                    ) : (
                        <>
                            <select
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            >
                                <option value="">Not specified</option>
                                {suppliers.map((s) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                                <option value={OTHER_SUPPLIER}>Other / not listed…</option>
                            </select>
                            {supplierId === OTHER_SUPPLIER && (
                                <input
                                    value={supplierNameFallback}
                                    onChange={(e) => setSupplierNameFallback(e.target.value)}
                                    placeholder="Supplier name"
                                    className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                    What did you receive?
                </label>

                {lines.map((line) => {
                    const item = itemsById.get(line.itemId);
                    return (
                        <div
                            key={line.key}
                            className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end"
                        >
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Item</label>
                                {purchaseOrder ? (
                                    <div className="px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-semibold truncate">
                                        {item?.name || 'Item'}
                                    </div>
                                ) : (
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
                                )}
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
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Best before (optional)</label>
                                <input
                                    type="date"
                                    value={line.expiryDate}
                                    onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })}
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

                {!purchaseOrder && (
                    <button
                        type="button"
                        onClick={addLine}
                        className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600"
                    >
                        <Plus size={14} /> Add another item
                    </button>
                )}
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Notes (optional)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything the next person should know about this delivery"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
            >
                {submitting ? 'Recording…' : 'Record Delivery'}
            </button>
        </form>
    );
}