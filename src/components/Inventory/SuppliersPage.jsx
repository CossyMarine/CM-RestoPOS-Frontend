// src/components/Inventory/SuppliersPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Truck, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import SupplierFormModal from './SupplierFormModal';
import SupplierDetailModal from './SupplierDetailModal';

export default function SuppliersPage() {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState('');

    const [formTarget, setFormTarget] = useState(null); // null closed, {} = add, supplier obj = edit
    const [detailTarget, setDetailTarget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/suppliers');
            setSuppliers(res.data || []);
        } catch (err) {
            console.error('Failed to load suppliers', err);
            toast.error('Failed to load suppliers');
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return suppliers
            .filter((s) => !q || s.name.toLowerCase().includes(q) || s.contactPerson?.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers, search]);

    const handleSaved = (saved) => {
        setSuppliers((prev) => {
            const exists = prev.some((s) => s._id === saved._id);
            return exists ? prev.map((s) => (s._id === saved._id ? saved : s)) : [...prev, saved];
        });
        setFormTarget(null);
        setDetailTarget((prev) => (prev && prev._id === saved._id ? saved : prev));
    };

    const handleDeactivated = (id) => {
        setSuppliers((prev) => prev.map((s) => (s._id === id ? { ...s, isActive: false } : s)));
        setDetailTarget(null);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <div className="p-5 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search suppliers…"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>
                <button
                    onClick={() => setFormTarget({})}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors shrink-0"
                >
                    <Plus size={15} /> Add Supplier
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[11px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Supplier</th>
                            <th className="px-5 py-3">Contact Person</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm font-medium">Loading suppliers…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-16">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <Truck size={28} className="text-gray-300" />
                                        <p className="text-gray-400 text-sm font-medium">
                                            {suppliers.length === 0 ? 'No suppliers added yet' : 'No suppliers match your search'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((s) => (
                                <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                    <td className="px-5 py-3 font-bold text-gray-800">{s.name}</td>
                                    <td className="px-5 py-3 text-gray-500">{s.contactPerson || '—'}</td>
                                    <td className="px-5 py-3 text-gray-500">{s.phone || '—'}</td>
                                    <td className="px-5 py-3 text-gray-500">{s.email || '—'}</td>
                                    <td className="px-5 py-3">
                                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${
                                            s.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                                        }`}>
                                            {s.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <button
                                            onClick={() => setDetailTarget(s)}
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

            {formTarget !== null && (
                <SupplierFormModal
                    supplier={formTarget._id ? formTarget : null}
                    onClose={() => setFormTarget(null)}
                    onSaved={handleSaved}
                />
            )}

            {detailTarget && (
                <SupplierDetailModal
                    supplier={detailTarget}
                    onClose={() => setDetailTarget(null)}
                    onEdit={(s) => { setDetailTarget(null); setFormTarget(s); }}
                    onDeactivated={handleDeactivated}
                />
            )}
        </div>
    );
}