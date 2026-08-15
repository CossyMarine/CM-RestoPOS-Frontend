// src/components/Inventory/ProductionFormModal.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChefHat, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { itemTypeLabel } from './inventoryLabels';

const emptyLine = () => ({
    key: Math.random().toString(36).slice(2),
    itemId: '',
    quantity: '',
});

export default function ProductionFormModal({ onClose, onSaved }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [producedItemId, setProducedItemId] = useState('');
    const [quantityProduced, setQuantityProduced] = useState('');
    const [locationId, setLocationId] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [note, setNote] = useState('');
    const [lines, setLines] = useState([emptyLine()]);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, locationsRes] = await Promise.all([
                API.get('/inventory/items'),
                API.get('/inventory/locations'),
            ]);
            setItems((itemsRes.data || []).filter((i) => i.isActive));
            const locs = (locationsRes.data || []).filter((l) => l.isActive !== false);
            setLocations(locs);
            const kitchen = locs.find((l) => l.code === 'KITCHEN');
            setLocationId((kitchen || locs[0])?._id || '');
        } catch (err) {
            console.error('Failed to load production form data', err);
            toast.error('Could not load items and locations');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const itemsById = useMemo(() => new Map(items.map((i) => [i._id, i])), [items]);
    const producedItem = itemsById.get(producedItemId);

    // An item can't be used as its own ingredient.
    const ingredientChoices = useMemo(
        () => items.filter((i) => i._id !== producedItemId),
        [items, producedItemId]
    );

    const updateLine = (key, patch) => {
        setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

    const estimatedCost = lines.reduce((sum, l) => {
        const item = itemsById.get(l.itemId);
        return sum + (Number(l.quantity) || 0) * (item?.costPerUnit || 0);
    }, 0);
    const costPerOutputUnit = Number(quantityProduced) > 0 ? estimatedCost / Number(quantityProduced) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!producedItemId) {
            toast.error('Choose what you\u2019re preparing');
            return;
        }
        if (!Number(quantityProduced) || Number(quantityProduced) <= 0) {
            toast.error('Enter how much you produced');
            return;
        }
        if (!locationId) {
            toast.error('Choose where this was prepared');
            return;
        }
        const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
        if (validLines.length === 0) {
            toast.error('Add at least one ingredient that was used');
            return;
        }
        const seen = new Set();
        for (const l of validLines) {
            if (seen.has(l.itemId)) {
                toast.error('The same ingredient is listed twice — combine them into one line');
                return;
            }
            seen.add(l.itemId);
        }

        const payload = {
            producedItem: producedItemId,
            quantityProduced: Number(quantityProduced),
            unit: producedItem.unit?._id,
            location: locationId,
            note: note.trim(),
            ...(batchNumber.trim() ? { batchNumber: batchNumber.trim() } : {}),
            ...(expiryDate ? { expiryDate } : {}),
            ingredientsUsed: validLines.map((l) => {
                const item = itemsById.get(l.itemId);
                return {
                    inventoryItem: l.itemId,
                    quantityUsed: Number(l.quantity),
                    unit: item.unit?._id,
                };
            }),
        };

        setSubmitting(true);
        try {
            const res = await API.post('/inventory/production', payload);
            toast.success('Prepared food logged');
            onSaved(res.data);
        } catch (err) {
            console.error('Failed to record production', err);
            toast.error(err.response?.data?.message || 'Could not record this batch');
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
                        <ChefHat size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">Prepare Food</h3>
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
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">What did you prepare?</label>
                                <select
                                    value={producedItemId}
                                    onChange={(e) => setProducedItemId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
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
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                                    Quantity Made {producedItem?.unit?.abbreviation ? `(${producedItem.unit.abbreviation})` : ''}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={quantityProduced}
                                    onChange={(e) => setQuantityProduced(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Where</label>
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
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                                What ingredients did it use?
                            </label>

                            {lines.map((line) => {
                                const item = itemsById.get(line.itemId);
                                return (
                                    <div
                                        key={line.key}
                                        className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2 items-end"
                                    >
                                        <div>
                                            <label className="text-[11px] text-gray-500 block mb-1">Ingredient</label>
                                            <select
                                                value={line.itemId}
                                                onChange={(e) => updateLine(line.key, { itemId: e.target.value })}
                                                className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
                                            >
                                                <option value="">Select an ingredient…</option>
                                                {ingredientChoices.map((i) => (
                                                    <option key={i._id} value={i._id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-500 block mb-1">
                                                Used {item?.unit?.abbreviation ? `(${item.unit.abbreviation})` : ''}
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
                                        <button
                                            type="button"
                                            onClick={() => removeLine(line.key)}
                                            disabled={lines.length === 1}
                                            className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                            title="Remove ingredient"
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
                                <Plus size={14} /> Add another ingredient
                            </button>

                            {Number(quantityProduced) > 0 && estimatedCost > 0 && (
                                <p className="text-right text-xs text-gray-400">
                                    Estimated cost: KES {estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    {' '}(~KES {costPerOutputUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })} per {producedItem?.unit?.abbreviation || 'unit'})
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Batch label (optional)</label>
                                <input
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                    placeholder="Auto-generated if left blank"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Use by (optional)</label>
                                <input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>
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
                        {submitting ? 'Saving…' : 'Log Prepared Food'}
                    </button>
                </div>
            </form>
        </div>
    );
}