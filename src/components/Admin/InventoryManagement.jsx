import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Boxes, PackagePlus, Ruler, AlertTriangle, ClipboardList } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import UsageReport from '../Inventory/UsageReport';

const EMPTY_ITEM = { name: '', unit: '', category: 'General', costPerUnit: '', reorderLevel: '' };
const EMPTY_UNIT = { name: '', abbreviation: '' };
const EMPTY_STOCK = { item: '', quantity: '', costPerUnit: '', note: '' };

export default function InventoryManagement() {
    const [subTab, setSubTab] = useState('items'); // 'items' | 'stock' | 'units'

    const [items, setItems] = useState([]);
    const [units, setUnits] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [summary, setSummary] = useState({ currentStockValue: 0, lowStockCount: 0 });

    const [itemForm, setItemForm] = useState(EMPTY_ITEM);
    const [editingItemId, setEditingItemId] = useState(null);
    const [savingItem, setSavingItem] = useState(false);
    const [pendingDeleteItem, setPendingDeleteItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(false);

    const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
    const [savingUnit, setSavingUnit] = useState(false);
    const [pendingDeleteUnit, setPendingDeleteUnit] = useState(null);
    const [deletingUnit, setDeletingUnit] = useState(false);

    const [stockForm, setStockForm] = useState(EMPTY_STOCK);
    const [savingStock, setSavingStock] = useState(false);

    const [showUsageReport, setShowUsageReport] = useState(false);

    const fetchItems = async () => {
        try {
            const res = await API.get('/inventory/items');
            setItems(res.data);
        } catch (err) {
            console.error('Failed to fetch inventory items', err);
            toast.error('Failed to load inventory items');
        }
    };

    const fetchUnits = async () => {
        try {
            const res = await API.get('/inventory/units');
            setUnits(res.data);
        } catch (err) {
            console.error('Failed to fetch units', err);
            toast.error('Failed to load units');
        }
    };

    const fetchStockHistory = async () => {
        try {
            const res = await API.get('/inventory/stock', { params: { limit: 25 } });
            setStockHistory(res.data.entries || []);
        } catch (err) {
            console.error('Failed to fetch stock history', err);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await API.get('/inventory/summary');
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch inventory summary', err);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchUnits();
        fetchStockHistory();
        fetchSummary();
    }, []);

    /* ---------------- ITEMS ---------------- */

    const startEditItem = (item) => {
        setEditingItemId(item._id);
        setItemForm({
            name: item.name,
            unit: item.unit?._id || '',
            category: item.category,
            costPerUnit: item.costPerUnit,
            reorderLevel: item.reorderLevel,
        });
    };

    const cancelEditItem = () => {
        setEditingItemId(null);
        setItemForm(EMPTY_ITEM);
    };

    const saveItem = async () => {
        if (!itemForm.name || !itemForm.unit) {
            toast.error('Name and unit are required');
            return;
        }
        setSavingItem(true);
        try {
            const payload = {
                name: itemForm.name,
                unit: itemForm.unit,
                category: itemForm.category || 'General',
                costPerUnit: itemForm.costPerUnit === '' ? 0 : parseFloat(itemForm.costPerUnit),
                reorderLevel: itemForm.reorderLevel === '' ? 0 : parseFloat(itemForm.reorderLevel),
            };

            if (editingItemId) {
                await API.put(`/inventory/items/${editingItemId}`, payload);
                toast.success('Item updated');
            } else {
                await API.post('/inventory/items', payload);
                toast.success('Item added to inventory');
            }

            cancelEditItem();
            fetchItems();
            fetchSummary();
        } catch (err) {
            console.error('Failed to save item', err);
            toast.error(err.response?.data?.message || 'Failed to save item');
        }
        setSavingItem(false);
    };

    const confirmDeleteItem = async () => {
        setDeletingItem(true);
        try {
            const res = await API.delete(`/inventory/items/${pendingDeleteItem._id}`);
            toast.success(res.data.message || 'Item removed');
            setPendingDeleteItem(null);
            fetchItems();
            fetchSummary();
        } catch (err) {
            console.error('Failed to delete item', err);
            toast.error('Failed to delete item');
        }
        setDeletingItem(false);
    };

    /* ---------------- UNITS ---------------- */

    const saveUnit = async () => {
        if (!unitForm.name || !unitForm.abbreviation) {
            toast.error('Name and abbreviation are required');
            return;
        }
        setSavingUnit(true);
        try {
            await API.post('/inventory/units', unitForm);
            toast.success('Unit added');
            setUnitForm(EMPTY_UNIT);
            fetchUnits();
        } catch (err) {
            console.error('Failed to save unit', err);
            toast.error(err.response?.data?.message || 'Failed to save unit');
        }
        setSavingUnit(false);
    };

    const confirmDeleteUnit = async () => {
        setDeletingUnit(true);
        try {
            await API.delete(`/inventory/units/${pendingDeleteUnit._id}`);
            toast.success('Unit deleted');
            setPendingDeleteUnit(null);
            fetchUnits();
        } catch (err) {
            console.error('Failed to delete unit', err);
            toast.error(err.response?.data?.message || 'Failed to delete unit — it may be in use');
        }
        setDeletingUnit(false);
    };

    /* ---------------- STOCK ---------------- */

    const onPickStockItem = (itemId) => {
        const selected = items.find((i) => i._id === itemId);
        setStockForm((prev) => ({
            ...prev,
            item: itemId,
            costPerUnit: selected ? selected.costPerUnit : prev.costPerUnit,
        }));
    };

    const submitStock = async () => {
        if (!stockForm.item || !stockForm.quantity || stockForm.costPerUnit === '') {
            toast.error('Item, quantity and cost per unit are required');
            return;
        }
        setSavingStock(true);
        try {
            await API.post('/inventory/stock', {
                item: stockForm.item,
                quantity: parseFloat(stockForm.quantity),
                costPerUnit: parseFloat(stockForm.costPerUnit),
                note: stockForm.note,
            });
            toast.success('Stock added');
            setStockForm(EMPTY_STOCK);
            fetchItems();
            fetchStockHistory();
            fetchSummary();
        } catch (err) {
            console.error('Failed to add stock', err);
            toast.error(err.response?.data?.message || 'Failed to add stock');
        }
        setSavingStock(false);
    };

    const isLowStock = (item) => item.reorderLevel > 0 && item.currentStock <= item.reorderLevel;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Inventory</h2>
                    <p className="text-sm text-gray-500">Stock, ingredients and usage — fully custom to this kitchen</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <SummaryCard label="Current Stock Value" value={`KES ${summary.currentStockValue?.toLocaleString() || 0}`} />
                    <SummaryCard
                        label="Low Stock Items"
                        value={summary.lowStockCount || 0}
                        tone={summary.lowStockCount > 0 ? 'danger' : 'default'}
                    />
                    <button
                        onClick={() => setShowUsageReport(true)}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
                    >
                        <ClipboardList size={15} className="text-orange-500" />
                        Usage Report
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200 w-fit">
                {[
                    { key: 'items', label: 'Items', icon: Boxes },
                    { key: 'stock', label: 'Add Stock', icon: PackagePlus },
                    { key: 'units', label: 'Units', icon: Ruler },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setSubTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            subTab === tab.key
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                                : 'text-gray-500 hover:text-orange-500'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'items' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                            <h3 className="text-base font-black text-gray-800">
                                {editingItemId ? 'Edit Item' : 'Add Item'}
                            </h3>
                            {editingItemId && (
                                <button onClick={cancelEditItem} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <Field label="Item Name">
                                <input
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    placeholder="e.g. Tomatoes, Cooking Gas, Rice"
                                    className="input"
                                />
                            </Field>

                            <Field label="Unit">
                                <select
                                    value={itemForm.unit}
                                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select unit…</option>
                                    {units.map((u) => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.abbreviation})
                                        </option>
                                    ))}
                                </select>
                                {units.length === 0 && (
                                    <p className="text-xs text-orange-500 mt-1">
                                        No units yet — add one in the "Units" tab first.
                                    </p>
                                )}
                            </Field>

                            <Field label="Category">
                                <input
                                    value={itemForm.category}
                                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                                    placeholder="e.g. Vegetables, Dry Goods, Beverages"
                                    className="input"
                                />
                            </Field>

                            <Field label="Cost Per Unit (KES)">
                                <input
                                    type="number"
                                    value={itemForm.costPerUnit}
                                    onChange={(e) => setItemForm({ ...itemForm, costPerUnit: e.target.value })}
                                    placeholder="0"
                                    className="input"
                                />
                            </Field>

                            <Field label="Reorder Level (optional)">
                                <input
                                    type="number"
                                    value={itemForm.reorderLevel}
                                    onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })}
                                    placeholder="Alert when stock falls to/below this"
                                    className="input"
                                />
                            </Field>

                            <button
                                onClick={saveItem}
                                disabled={savingItem}
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 mt-2"
                            >
                                <Plus size={16} />
                                {savingItem ? 'Saving…' : editingItemId ? 'Save Changes' : 'Add Item'}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                            Inventory Items ({items.length})
                        </h3>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {items.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-10 font-medium">
                                    No inventory items yet
                                </p>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item._id}
                                        className={`border rounded-xl p-4 flex justify-between items-center bg-gray-50/50 transition-colors ${
                                            isLowStock(item) ? 'border-red-300' : 'border-gray-200 hover:border-orange-500/40'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                                                {!item.isActive && (
                                                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                        Inactive
                                                    </span>
                                                )}
                                                {isLowStock(item) && (
                                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                                                        <AlertTriangle size={10} /> Low Stock
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {item.currentStock.toLocaleString()} {item.unit?.abbreviation} in stock ·
                                                {' '}KES {item.costPerUnit.toLocaleString()}/{item.unit?.abbreviation}
                                            </p>
                                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded mt-1 inline-block">
                                                {item.category}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0 ml-2">
                                            <button
                                                onClick={() => startEditItem(item)}
                                                className="text-gray-400 hover:text-orange-500 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => setPendingDeleteItem(item)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'stock' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                            Add Stock
                        </h3>
                        <div className="space-y-4">
                            <Field label="Item">
                                <select
                                    value={stockForm.item}
                                    onChange={(e) => onPickStockItem(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Select item…</option>
                                    {items.filter((i) => i.isActive).map((i) => (
                                        <option key={i._id} value={i._id}>
                                            {i.name} ({i.unit?.abbreviation})
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Quantity Added">
                                <input
                                    type="number"
                                    value={stockForm.quantity}
                                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                                    placeholder="e.g. 50"
                                    className="input"
                                />
                            </Field>

                            <Field label="Cost Per Unit (KES)">
                                <input
                                    type="number"
                                    value={stockForm.costPerUnit}
                                    onChange={(e) => setStockForm({ ...stockForm, costPerUnit: e.target.value })}
                                    placeholder="Purchase price paid"
                                    className="input"
                                />
                            </Field>

                            <Field label="Note (optional)">
                                <input
                                    value={stockForm.note}
                                    onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                                    placeholder="e.g. Supplier name, invoice #"
                                    className="input"
                                />
                            </Field>

                            {stockForm.quantity && stockForm.costPerUnit && (
                                <p className="text-xs text-gray-500">
                                    Total cost: <span className="font-bold text-gray-700">
                                        KES {(parseFloat(stockForm.quantity) * parseFloat(stockForm.costPerUnit)).toLocaleString()}
                                    </span>
                                </p>
                            )}

                            <button
                                onClick={submitStock}
                                disabled={savingStock}
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 mt-2"
                            >
                                <PackagePlus size={16} />
                                {savingStock ? 'Saving…' : 'Add Stock'}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                            Recent Restocks
                        </h3>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                            {stockHistory.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-10 font-medium">No stock entries yet</p>
                            ) : (
                                stockHistory.map((entry) => (
                                    <div
                                        key={entry._id}
                                        className="border border-gray-200 rounded-xl p-3 flex justify-between items-center bg-gray-50/50"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{entry.item?.name}</p>
                                            <p className="text-xs text-gray-500">
                                                +{entry.quantity.toLocaleString()} @ KES {entry.costPerUnit.toLocaleString()} each
                                                {entry.addedBy?.fullName ? ` · by ${entry.addedBy.fullName}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="font-bold text-orange-500 text-sm">
                                                KES {entry.totalCost.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(entry.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'units' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                            Add Measurement Unit
                        </h3>
                        <div className="space-y-4">
                            <Field label="Unit Name">
                                <input
                                    value={unitForm.name}
                                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                                    placeholder="e.g. Kilogram, Sag, Korogoro"
                                    className="input"
                                />
                            </Field>
                            <Field label="Abbreviation">
                                <input
                                    value={unitForm.abbreviation}
                                    onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                                    placeholder="e.g. kg, sag, kor"
                                    className="input"
                                />
                            </Field>
                            <button
                                onClick={saveUnit}
                                disabled={savingUnit}
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 mt-2"
                            >
                                <Plus size={16} />
                                {savingUnit ? 'Saving…' : 'Add Unit'}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                            Units ({units.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {units.length === 0 ? (
                                <p className="text-gray-400 text-sm col-span-full text-center py-10 font-medium">
                                    No units yet
                                </p>
                            ) : (
                                units.map((u) => (
                                    <div
                                        key={u._id}
                                        className="border border-gray-200 rounded-xl p-3 flex justify-between items-center bg-gray-50/50"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.abbreviation}</p>
                                        </div>
                                        <button
                                            onClick={() => setPendingDeleteUnit(u)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                open={!!pendingDeleteItem}
                title="Delete inventory item?"
                description={`Remove "${pendingDeleteItem?.name}" from inventory? If it has stock history it will be deactivated instead.`}
                confirmLabel="Delete"
                tone="danger"
                loading={deletingItem}
                onConfirm={confirmDeleteItem}
                onClose={() => setPendingDeleteItem(null)}
            />

            <ConfirmModal
                open={!!pendingDeleteUnit}
                title="Delete unit?"
                description={`Remove "${pendingDeleteUnit?.name}"? This fails if any item still uses it.`}
                confirmLabel="Delete"
                tone="danger"
                loading={deletingUnit}
                onConfirm={confirmDeleteUnit}
                onClose={() => setPendingDeleteUnit(null)}
            />

            {showUsageReport && <UsageReport onClose={() => setShowUsageReport(false)} />}

            <style>{`
                .input {
                    width: 100%;
                    background: rgb(249 250 251);
                    border: 1px solid rgb(229 231 235);
                    border-radius: 0.75rem;
                    padding: 0.6rem 0.85rem;
                    font-size: 0.875rem;
                    color: rgb(31 41 55);
                }
                .input:focus {
                    outline: none;
                    border-color: rgb(249 115 22);
                    background: white;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
                }
                .input::placeholder {
                    color: rgb(156 163 175);
                }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}

function SummaryCard({ label, value, tone = 'default' }) {
    return (
        <div className={`px-4 py-2.5 rounded-xl border ${tone === 'danger' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
            <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
            <p className={`text-lg font-black ${tone === 'danger' ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
        </div>
    );
                }
