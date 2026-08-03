// src/components/Admin/Inventory/MoveStock.jsx
import { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { itemTypeLabel } from './inventoryLabels';

export default function MoveStock() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [locations, setLocations] = useState([]);

    const [itemId, setItemId] = useState('');
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');

    const [balances, setBalances] = useState([]); // per-location stock for the selected item
    const [balancesLoading, setBalancesLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, locationsRes] = await Promise.all([
                API.get('/inventory/items'),
                API.get('/inventory/locations'),
            ]);
            const locs = (locationsRes.data || []).filter((l) => l.isActive !== false);
            setItems((itemsRes.data || []).filter((i) => i.isActive));
            setLocations(locs);

            const store = locs.find((l) => l.code === 'STORE');
            const kitchen = locs.find((l) => l.code === 'KITCHEN');
            if (store) setFromLocation(store._id);
            if (kitchen) setToLocation(kitchen._id);
        } catch (err) {
            console.error('Failed to load move-stock form data', err);
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
            .catch((err) => {
                console.error('Failed to load stock balances', err);
            })
            .finally(() => {
                if (!cancelled) setBalancesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [itemId]);

    const selectedItem = items.find((i) => i._id === itemId);
    const fromBalance = balances.find((b) => b.location?._id === fromLocation);
    const availableAtSource = Number(fromBalance?.quantity || 0);

    const resetForm = () => {
        setQuantity('');
        setNote('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!itemId || !fromLocation || !toLocation) {
            toast.error('Choose an item, a source and a destination');
            return;
        }
        if (fromLocation === toLocation) {
            toast.error('Source and destination must be different');
            return;
        }
        const qty = Number(quantity);
        if (!qty || qty <= 0) {
            toast.error('Enter a quantity greater than 0');
            return;
        }
        if (qty > availableAtSource) {
            toast.error(`Only ${availableAtSource.toLocaleString()} ${selectedItem?.unit?.abbreviation || ''} available there`);
            return;
        }

        setSubmitting(true);
        try {
            await API.post('/inventory/transfers', {
                item: itemId,
                quantity: qty,
                fromLocation,
                toLocation,
                note: note.trim(),
            });
            toast.success('Stock moved');
            resetForm();
            // Refresh balances for this item so the "available" figure stays current
            const res = await API.get(`/inventory/stock/items/${itemId}`);
            setBalances(res.data || []);
        } catch (err) {
            console.error('Failed to move stock', err);
            toast.error(err.response?.data?.message || 'Could not move this stock');
        }
        setSubmitting(false);
    };

    if (loading) {
        return <p className="text-gray-400 text-sm text-center py-16 font-medium">Loading…</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6 max-w-2xl">
            <div className="flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-orange-500" />
                <h3 className="font-black text-gray-800">Move Stock</h3>
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Item</label>
                <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">From</label>
                    <select
                        value={fromLocation}
                        onChange={(e) => setFromLocation(e.target.value)}
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
                                : `${availableAtSource.toLocaleString()} ${selectedItem?.unit?.abbreviation || ''} available`}
                        </p>
                    )}
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">To</label>
                    <select
                        value={toLocation}
                        onChange={(e) => setToLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                    >
                        {locations.map((l) => (
                            <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                    </select>
                </div>
            </div>

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
                    className="w-full sm:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />
            </div>

            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Notes (optional)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />
            </div>

            <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
            >
                {submitting ? 'Moving…' : 'Move Stock'}
            </button>
        </form>
    );
}