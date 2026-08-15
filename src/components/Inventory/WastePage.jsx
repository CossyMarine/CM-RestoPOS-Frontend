// src/components/Inventory/WastePage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import WasteFormModal from './WasteFormModal';
import { formatKES, formatQty, formatShortDate } from './inventoryLabels';

const REASON_LABELS = {
    spoiled: 'Spoiled',
    damaged: 'Damaged',
    expired: 'Expired',
    spillage: 'Spillage',
    other: 'Other',
};

const REASON_FILTERS = [
    { value: 'all', label: 'All Reasons' },
    { value: 'spoiled', label: 'Spoiled' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'spillage', label: 'Spillage' },
    { value: 'other', label: 'Other' },
];

export default function WastePage() {
    const [loading, setLoading] = useState(true);
    const [wastes, setWastes] = useState([]);
    const [search, setSearch] = useState('');
    const [reasonFilter, setReasonFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [undoingId, setUndoingId] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/waste');
            setWastes(res.data || []);
        } catch (err) {
            console.error('Failed to load waste records', err);
            toast.error('Failed to load waste records');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return wastes
            .filter((w) => !q || w.item?.name?.toLowerCase().includes(q))
            .filter((w) => reasonFilter === 'all' || w.reason === reasonFilter);
    }, [wastes, search, reasonFilter]);

    const totalValue = filtered
        .filter((w) => w.status !== 'cancelled')
        .reduce((s, w) => s + (w.totalValue || 0), 0);

    const handleSaved = (saved) => {
        setWastes((prev) => [saved, ...prev]);
        setFormOpen(false);
    };

    const handleUndo = async (waste) => {
        if (!window.confirm('Undo this waste record? The stock will be put back.')) return;
        setUndoingId(waste._id);
        try {
            await API.delete(`/inventory/waste/${waste._id}`);
            toast.success('Waste undone — stock restored');
            setWastes((prev) => prev.map((w) => (w._id === waste._id ? { ...w, status: 'cancelled' } : w)));
        } catch (err) {
            console.error('Failed to undo waste', err);
            toast.error(err.response?.data?.message || 'Could not undo this record');
        }
        setUndoingId(null);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center flex-1">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search wasted items…"
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                        />
                    </div>
                    <select
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-orange-400"
                    >
                        {REASON_FILTERS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => setFormOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                    <Plus size={15} /> Record Waste
                </button>
            </div>

            {!loading && filtered.length > 0 && (
                <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
                    <p className="text-xs font-bold text-red-600">Total waste value shown</p>
                    <p className="text-sm font-black text-red-600">{formatKES(totalValue)}</p>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-5 py-3">Quantity</th>
                            <th className="px-5 py-3">Location</th>
                            <th className="px-5 py-3">Reason</th>
                            <th className="px-5 py-3">Value</th>
                            <th className="px-5 py-3">Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <Trash2 size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            {wastes.length === 0 ? 'No waste recorded yet 👍' : 'Nothing matches your filters'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((w) => (
                                <tr key={w._id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${w.status === 'cancelled' ? 'opacity-50' : ''}`}>
                                    <td className="px-5 py-3 font-bold text-gray-800">{w.item?.name || 'Item'}</td>
                                    <td className="px-5 py-3 text-gray-700 font-semibold">
                                        {formatQty(w.quantity, w.unit?.abbreviation)}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">{w.location?.name || '—'}</td>
                                    <td className="px-5 py-3">
                                        <span className="text-[11px] font-bold px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                                            {REASON_LABELS[w.reason] || w.reason}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-700 font-semibold">{formatKES(w.totalValue)}</td>
                                    <td className="px-5 py-3 text-gray-500">{formatShortDate(w.createdAt)}</td>
                                    <td className="px-5 py-3 text-right">
                                        {w.status === 'cancelled' ? (
                                            <span className="text-[11px] font-bold text-gray-400 uppercase">Undone</span>
                                        ) : (
                                            <button
                                                onClick={() => handleUndo(w)}
                                                disabled={undoingId === w._id}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 disabled:opacity-50"
                                            >
                                                <Undo2 size={14} /> {undoingId === w._id ? 'Undoing…' : 'Undo'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {formOpen && <WasteFormModal onClose={() => setFormOpen(false)} onSaved={handleSaved} />}
        </div>
    );
}