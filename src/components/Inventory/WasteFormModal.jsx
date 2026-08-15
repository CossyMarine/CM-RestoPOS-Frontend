// src/components/Inventory/WasteFormModal.jsx
import { useState, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const REASONS = [
    { value: 'spoiled', label: 'Spoiled' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'spillage', label: 'Spillage' },
    { value: 'other', label: 'Other' },
];

export default function WasteFormModal({ onClose, onSaved }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [itemId, setItemId] = useState('');
    const [locationId, setLocationId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('spoiled');
    const [note, setNote] = useState('');

    const [balances, setBalances] = useState([]);
    const [balancesLoading, setBalancesLoading] = useState(false);
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
            const store = locs.find((l) => l.code === 'STORE');
            setLocationId((store || locs[0])?._id || '');
        } catch (err) {
            console.error('Failed to load waste form data', err);
            toast.error('Could not load items and locations');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!itemId) {
            setBalances([]);
            return;
        }
        let cancelled = false;
        setBalancesLoading(true);
        API.get(`/inventory/stock/items/${itemId}`)
            .then((res) => {
                if (!cancelled) setBalances(res.data || []);
            })
            .catch((err) => console.error('Failed to load stock balances', err))
            .finally(() => {
                if (!cancelled) setBalancesLoading(false);
            });
        return () => { cancelled = true; };
    }, [itemId]);

    const selectedItem = items.find((i) => i._id === itemId);
    const balanceHere = balances.find((b) => b.location?._id === locationId);
    const availableHere = Number(balanceHere?.quantity || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!itemId || !locationId) {
            toast.error('Choose an item and a location');
            return;
        }
        const qty = Number(quantity);
        if (!qty || qty <= 0) {
            toast.error('Enter a quantity greater than 0');
            return;
        }
        if (qty > availableHere) {
            toast.error(`Only ${availableHere.toLocaleString()} ${selectedItem?.unit?.abbreviation || ''} available there`);
            return;
        }

        const payload = {
            item: itemId,
            location: locationId,
            quantity: qty,
            unit: selectedItem.unit?._id,
            reason,
            note: note.trim(),
        };

        setSubmitting(true);
        try {
            const res = await API.post('/inventory/waste', payload);
            toast.success('Waste recorded');
            onSaved(res.data);
        } catch (err) {
            console.error('Failed to record waste', err);
            toast.error(err.response?.data?.message || 'Could not record this waste');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Trash2 size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">Record Waste</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>
                ) : (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Item</label>
                            <select
                                value={itemId}
                                onChange={(e) => setItemId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            >
                                <option value="">Select an item…</option>
                                {items.map((i) => (
                                    <option key={i._id} value={i._id}>{i.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Location</label>
                            <select
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            >
                                {locations.map((l) => (
                                    <option key={l._id} value={l._id}>{l.name}</option>
                                ))}
                            </select>
                            {itemId && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {balancesLoading
                                        ? 'Checking stock…'
                                        : `${availableHere.toLocaleString()} ${selectedItem?.unit?.abbreviation || ''} available there`}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                                    Quantity {selectedItem?.unit?.abbreviation ? `(${selectedItem.unit.abbreviation})` : ''}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Reason</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                                >
                                    {REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
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

                        <p className="text-[11px] text-gray-400">
                            The stock that expires soonest is removed first automatically.
                        </p>
                    </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || loading}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                        {submitting ? 'Recording…' : 'Record Waste'}
                    </button>
                </div>
            </form>
        </div>
    );
}