// src/components/Inventory/ExpiringSoonPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { formatQty, formatShortDate, daysUntil } from './inventoryLabels';

const WINDOW_OPTIONS = [
    { value: 3, label: 'Next 3 days' },
    { value: 7, label: 'Next 7 days' },
    { value: 14, label: 'Next 14 days' },
    { value: 30, label: 'Next 30 days' },
];

export default function ExpiringSoonPage() {
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState([]);
    const [itemsById, setItemsById] = useState(new Map());
    const [windowDays, setWindowDays] = useState(7);
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');

    const load = async (days) => {
        setLoading(true);
        try {
            const [batchesRes, itemsRes] = await Promise.all([
                API.get('/inventory/batches/expiring', { params: { days } }),
                API.get('/inventory/items'),
            ]);
            setBatches(batchesRes.data?.batches || []);
            setItemsById(new Map((itemsRes.data || []).map((i) => [i._id, i])));
        } catch (err) {
            console.error('Failed to load expiring batches', err);
            toast.error('Failed to load expiring stock');
        }
        setLoading(false);
    };

    useEffect(() => {
        load(windowDays);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [windowDays]);

    const locations = useMemo(() => {
        const map = new Map();
        batches.forEach((b) => { if (b.location) map.set(b.location._id, b.location.name); });
        return [...map.entries()];
    }, [batches]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return batches
            .filter((b) => !q || b.inventoryItem?.name?.toLowerCase().includes(q))
            .filter((b) => locationFilter === 'all' || b.location?._id === locationFilter)
            .map((b) => ({
                ...b,
                days: daysUntil(b.expiryDate),
                unitAbbr: itemsById.get(b.inventoryItem?._id)?.unit?.abbreviation,
            }));
    }, [batches, search, locationFilter, itemsById]);

    const expiredCount = rows.filter((r) => r.days <= 0).length;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search items…"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-orange-400"
                >
                    <option value="all">All Locations</option>
                    {locations.map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                    ))}
                </select>

                <select
                    value={windowDays}
                    onChange={(e) => setWindowDays(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-orange-400"
                >
                    {WINDOW_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {!loading && expiredCount > 0 && (
                <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
                    <p className="text-xs font-bold text-red-600">Already expired</p>
                    <p className="text-sm font-black text-red-600">{expiredCount} batch{expiredCount !== 1 ? 'es' : ''}</p>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-5 py-3">Location</th>
                            <th className="px-5 py-3">Quantity</th>
                            <th className="px-5 py-3">Batch</th>
                            <th className="px-5 py-3">Expires</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading…</td></tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <Clock size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            Nothing expiring in this window 👍
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3 font-bold text-gray-800">{r.inventoryItem?.name || 'Item'}</td>
                                    <td className="px-5 py-3 text-gray-500">{r.location?.name || '—'}</td>
                                    <td className="px-5 py-3 text-gray-700 font-semibold">{formatQty(r.quantity, r.unitAbbr)}</td>
                                    <td className="px-5 py-3 text-gray-400 text-xs">{r.batchNumber}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-xs font-bold ${
                                            r.days <= 0 ? 'text-red-600' : r.days <= 3 ? 'text-amber-600' : 'text-gray-500'
                                        }`}>
                                            {r.days <= 0 ? 'Expired' : `In ${r.days}d`} · {formatShortDate(r.expiryDate)}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}