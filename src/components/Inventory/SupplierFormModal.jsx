// src/components/Inventory/SupplierFormModal.jsx
import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

export default function SupplierFormModal({ supplier, onClose, onSaved }) {
    const isEdit = Boolean(supplier);
    const [form, setForm] = useState({
        name: supplier?.name || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        contactPerson: supplier?.contactPerson || '',
        address: supplier?.address || '',
        note: supplier?.note || '',
    });
    const [submitting, setSubmitting] = useState(false);

    const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Supplier name is required');
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                const res = await API.put(`/inventory/suppliers/${supplier._id}`, form);
                toast.success('Supplier updated');
                onSaved(res.data);
            } else {
                const res = await API.post('/inventory/suppliers', form);
                toast.success('Supplier added');
                onSaved(res.data);
            }
        } catch (err) {
            console.error('Failed to save supplier', err);
            toast.error(err.response?.data?.message || 'Could not save this supplier');
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
                        <Truck size={18} className="text-orange-500" />
                        <h3 className="font-black text-gray-800">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Supplier Name *</label>
                        <input
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                            placeholder="e.g. Fresh Farms Ltd"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
                            <input
                                value={form.phone}
                                onChange={(e) => update('phone', e.target.value)}
                                placeholder="07xx xxx xxx"
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => update('email', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Contact Person</label>
                        <input
                            value={form.contactPerson}
                            onChange={(e) => update('contactPerson', e.target.value)}
                            placeholder="Who to call there"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Address</label>
                        <input
                            value={form.address}
                            onChange={(e) => update('address', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
                        <textarea
                            value={form.note}
                            onChange={(e) => update('note', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                        {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
                    </button>
                </div>
            </form>
        </div>
    );
}