// src/components/Inventory/StockPage.jsx
// StockPage.jsx — top of file
import API from '../../api/axios';
import StockDetailsModal from './StockDetailsModal';
import { Search, Eye, PackageSearch } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatQty, formatShortDate, getStockStatus, buildNearestExpiryMap, STATUS_FILTER_OPTIONS } from './inventoryLabels';
import { useState, useEffect, useCallback, useMemo } from 'react';
export default function StockPage({ initialFilters }) {
    const [loading, setLoading] = useState(true);
    const [balances, setBalances] = useState([]);
    const [locations, setLocations] = useState([]);
    const [nearestExpiryMap, setNearestExpiryMap] = useState(new Map());

    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState(initialFilters?.status || 'all');

    const [selected, setSelected] = useState(null); // stock row opened in details modal

    const load = async () => {
        setLoading(true);
        try {
            const [balancesRes, locationsRes, batchesRes] = await Promise.all([
                API.get('/inventory/stock/locations'),
                API.get('/inventory/locations'),
                API.get('/inventory/batches', { params: { status: 'active' } }),
            ]);
            setBalances(balancesRes.data || []);
            setLocations((locationsRes.data || []).filter((l) => l.isActive !== false));
            setNearestExpiryMap(buildNearestExpiryMap(batchesRes.data || []));
        } catch (err) {
            console.error('Failed to load stock', err);
            toast.error('Failed to load stock');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const rows = useMemo(() => {
        return balances
            .filter((b) => b.item) // guard against orphaned stock rows
            .map((b) => {
                const key = `${b.item._id}_${b.location._id}`;
                const nearestExpiryDate = nearestExpiryMap.get(key) || null;
                const status = getStockStatus({
                    available: b.quantity,
                    reorderLevel: b.item.reorderLevel,
                    nearestExpiryDate,
                });
                return {
                    id: b._id,
                    item: b.item,
                    location: b.location,
                    quantity: b.quantity,
                    nearestExpiryDate,
                    status,
                };
            });
    }, [balances, nearestExpiryMap]);

    const categories = useMemo(() => {
        const set = new Set(rows.map((r) => r.item.category || 'General'));
        return [...set].sort();
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows
            .filter((r) => !q || r.item.name.toLowerCase().includes(q))
            .filter((r) => locationFilter === 'all' || r.location._id === locationFilter)
            .filter((r) => categoryFilter === 'all' || (r.item.category || 'General') === categoryFilter)
            .filter((r) => statusFilter === 'all' || r.status.key === statusFilter)
            .sort((a, b) => a.item.name.localeCompare(b.item.name));
    }, [rows, search, locationFilter, categoryFilter, statusFilter]);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search ingredients or products…"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="filter-select">
                    <option value="all">All Locations</option>
                    {locations.map((l) => (
                        <option key={l._id} value={l._id}>{l.name}</option>
                    ))}
                </select>

                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="filter-select">
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                    {STATUS_FILTER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-5 py-3">Category</th>
                            <th className="px-5 py-3">Available</th>
                            <th className="px-5 py-3">Location</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Expiry</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading stock…</td></tr>
                        ) : filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <PackageSearch size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            {balances.length === 0 ? 'No stock recorded yet' : 'No items match your filters'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((r) => (
                                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3 font-bold text-gray-800">{r.item.name}</td>
                                    <td className="px-5 py-3 text-gray-500">{r.item.category || 'General'}</td>
                                    <td className="px-5 py-3 text-gray-700 font-semibold">
                                        {formatQty(r.quantity, r.item.unit?.abbreviation)}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">{r.location.name}</td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border ${r.status.classes}`}>
                                            {r.status.emoji} {r.status.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-500">
                                        {r.nearestExpiryDate ? formatShortDate(r.nearestExpiryDate) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setSelected(r)}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selected && (
                <StockDetailsModal
                    itemId={selected.item._id}
                    locationId={selected.location._id}
                    onClose={() => setSelected(null)}
                />
            )}

            <style>{`
                .filter-select {
                    background: rgb(249 250 251);
                    border: 1px solid rgb(229 231 235);
                    border-radius: 0.75rem;
                    padding: 0.55rem 0.75rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: rgb(55 65 81);
                }
                .filter-select:focus {
                    outline: none;
                    border-color: rgb(249 115 22);
                }
            `}</style>
        </div>
    );
}