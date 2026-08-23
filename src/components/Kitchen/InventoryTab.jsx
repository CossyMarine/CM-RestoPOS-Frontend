import { useState, useEffect } from 'react';
import { PackageMinus, Search, AlertTriangle, X, ClipboardList } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import UsageReport from '../Inventory/UsageReport';

export default function InventoryTab() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [logTarget, setLogTarget] = useState(null); // the item currently being logged against
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('used');
const [wasteReason, setWasteReason] = useState('spoiled');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showUsageReport, setShowUsageReport] = useState(false);

    const fetchItems = async () => {
        try {
            const res = await API.get('/inventory/items');
            setItems(res.data);
        } catch (err) {
            console.error('Failed to fetch inventory items', err);
            toast.error('Could not load inventory');
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const openLogModal = (item) => {
        setLogTarget(item);
        setQuantity('');
        setReason('used');
        setNote('');
    };

    const closeLogModal = () => setLogTarget(null);

    const submitUsage = async () => {
        if (!quantity || parseFloat(quantity) <= 0) {
            toast.error('Enter a valid quantity');
            return;
        }
        setSubmitting(true);
        try {
            const res = reason === 'waste'
                ? await API.post('/inventory/waste', {
                      item: logTarget._id,
                      unit: logTarget.unit?._id,
                      quantity: Number(quantity),
                      reason: wasteReason,
                      note,
                  })
                : await API.post('/inventory/usage', {
                      item: logTarget._id,
                      quantity: Number(quantity),
                      reason,
                      note,
                  });
            setItems((prev) => prev.map((i) => (i._id === logTarget._id ? res.data.item : i)));
            toast.success('Usage logged');
            closeLogModal();
        } catch (err) {
            console.error('Failed to log usage', err);
            toast.error(err.response?.data?.message || 'Could not log usage');
        }
        setSubmitting(false);
    };

    const filtered = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
    );

    const isLowStock = (item) => item.reorderLevel > 0 && item.currentStock <= item.reorderLevel;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-black text-gray-800">Kitchen Inventory</h2>
                    <p className="text-sm text-gray-500">Log what you use — stock updates instantly</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUsageReport(true)}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-gray-700 px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors shrink-0"
                    >
                        <ClipboardList size={15} className="text-orange-500" />
                        Usage
                    </button>
                    <div className="relative w-64">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search items…"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <p className="text-gray-400 text-sm col-span-full text-center py-16 font-medium">
                        No inventory items found
                    </p>
                ) : (
                    filtered.map((item) => (
                        <div
                            key={item._id}
                            className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${
                                isLowStock(item) ? 'border-red-300' : 'border-gray-200'
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                                    {isLowStock(item) && (
                                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                            <AlertTriangle size={10} /> Low
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-black text-gray-800 mt-2">
                                    {item.currentStock.toLocaleString()}
                                    <span className="text-sm font-bold text-gray-400 ml-1">{item.unit?.abbreviation}</span>
                                </p>
                                <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                                    {item.category}
                                </span>
                            </div>
                            <button
                                onClick={() => openLogModal(item)}
                                className="mt-4 w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-sm font-bold transition-colors"
                            >
                                <PackageMinus size={15} />
                                Log Usage
                            </button>
                        </div>
                    ))
                )}
            </div>

            {logTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-gray-800">Log usage — {logTarget.name}</h3>
                            <button onClick={closeLogModal} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 mb-4">
                            Currently in stock: <span className="font-bold text-gray-700">
                                {logTarget.currentStock.toLocaleString()} {logTarget.unit?.abbreviation}
                            </span>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                    Quantity ({logTarget.unit?.abbreviation})
                                </label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Reason</label>
                                <div className="flex gap-2">
                                    {[
                                        { key: 'used', label: 'Used in orders' },
                                        { key: 'waste', label: 'Wastage' },
                                    ].map((r) => (
                                        <button
                                            key={r.key}
                                            onClick={() => setReason(r.key)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                                reason === r.key
                                                    ? 'bg-orange-500 text-white border-orange-500'
                                                    : 'bg-white text-gray-500 border-gray-200'
                                            }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
{reason === 'waste' && (
    <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Why?</label>
        <select
            value={wasteReason}
            onChange={(e) => setWasteReason(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
        >
            <option value="spoiled">Spoiled</option>
            <option value="expired">Expired</option>
            <option value="damaged">Damaged</option>
            <option value="spillage">Spillage</option>
            <option value="other">Other</option>
        </select>
    </div>
)}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Note (optional)</label>
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="e.g. Lunch service, spoiled batch"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                                />
                            </div>

                            <button
                                onClick={submitUsage}
                                disabled={submitting}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {submitting ? 'Saving…' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUsageReport && <UsageReport onClose={() => setShowUsageReport(false)} />}
        </div>
    );
            }
