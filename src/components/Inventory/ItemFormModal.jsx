// src/components/Inventory/ItemFormModal.jsx
import { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const ITEM_TYPES = [
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'finished_product', label: 'Finished Product' },
    { value: 'consumable', label: 'Consumable' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'mro', label: 'MRO (Maintenance/Repair/Ops)' },
];

export default function ItemFormModal({ item, onClose, onSaved }) {
    const isEdit = Boolean(item);
    const [units, setUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [form, setForm] = useState({
        name: item?.name || '',
        unit: item?.unit?._id || item?.unit || '',
        itemType: item?.itemType || 'raw_material',
        category: item?.category || '',
        costPerUnit: item?.costPerUnit ?? 0,
        reorderLevel: item?.reorderLevel ?? 0,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        API.get('/inventory/units')
            .then((res) => setUnits(res.data || []))
            .catch(() => toast.error('Failed to load units'))
            .finally(() => setLoadingUnits(false));
    }, []);

    const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Item name is required'); return; }
        if (!form.unit) { toast.error('Pick a unit of measurement'); return; }

        setSubmitting(true);
        try {
            if (isEdit) {
                const res = await API.put(`/inventory/items/${item._id}`, form);
                toast.success('Item updated');
                onSaved(res.data);
            } else {
                const res = await API.post('/inventory/items', form);
                toast.success('Item added — receive stock to bring it into inventory');
                onSaved(res.data);
            }
        } catch (err) {
            console.error('Failed to save item', err);
            toast.error(err.response?.data?.message || 'Could not save this item');
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
                        <Package size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">{isEdit ? 'Edit Item' : 'Add New Item'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Item Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                            placeholder="e.g. Tomatoes"
                            className="modal-input"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Unit</label>
                            <select
                                value={form.unit}
                                onChange={(e) => update('unit', e.target.value)}
                                className="modal-input"
                                disabled={loadingUnits}
                            >
                                <option value="">{loadingUnits ? 'Loading…' : 'Select unit'}</option>
                                {units.map((u) => (
                                    <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Item Type</label>
                            <select
                                value={form.itemType}
                                onChange={(e) => update('itemType', e.target.value)}
                                className="modal-input"
                            >
                                {ITEM_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Category</label>
                        <input
                            value={form.category}
                            onChange={(e) => update('category', e.target.value)}
                            placeholder="e.g. Vegetables (optional — defaults to General)"
                            className="modal-input"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Cost per Unit (KES)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.costPerUnit}
                                onChange={(e) => update('costPerUnit', parseFloat(e.target.value) || 0)}
                                className="modal-input"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Reorder Level</label>
                            <input
                                type="number"
                                min="0"
                                value={form.reorderLevel}
                                onChange={(e) => update('reorderLevel', parseFloat(e.target.value) || 0)}
                                className="modal-input"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">0 = no low-stock alert</p>
                        </div>
                    </div>

                    {!isEdit && (
                        <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                            This just creates the item definition, at zero stock. Use <strong>Receive Stock</strong> afterward to bring actual quantity in.
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300"
                    >
                        {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
                    </button>
                </div>

                <style>{`
                    .modal-input {
                        width: 100%;
                        background: rgb(249 250 251);
                        border: 1px solid rgb(229 231 235);
                        border-radius: 0.75rem;
                        padding: 0.55rem 0.75rem;
                        font-size: 0.875rem;
                        color: rgb(31 41 55);
                    }
                    .modal-input:focus {
                        outline: none;
                        border-color: rgb(249 115 22);
                        background: white;
                    }
                `}</style>
            </form>
        </div>
    );
}