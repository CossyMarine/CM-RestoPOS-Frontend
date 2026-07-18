import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Plus, UtensilsCrossed, X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';

const CATEGORY_SUGGESTIONS = ['main', 'snack', 'drink', 'side', 'dessert'];

const EMPTY_FORM = { name: '', description: '', price: '', category: 'main', imageUrl: '', imagePublicId: '' };

export default function MenuManagement() {
    const [menu, setMenu] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const fileRef = useRef();

    const fetchMenu = async () => {
        try {
            const res = await API.get('/menu');
            setMenu(res.data);
        } catch (err) {
            console.error('Failed to fetch menu', err);
            toast.error('Failed to load menu items');
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const startEdit = (item) => {
        setEditingId(item._id);
        setForm({
            name: item.name,
            description: item.description || '',
            price: item.price,
            category: item.category,
            imageUrl: item.imageUrl || '',
            imagePublicId: item.imagePublicId || '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        if (fileRef.current) fileRef.current.value = '';
    };

    // Upload picked image (from device gallery) straight to Cloudinary via backend
    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Max file size is 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const res = await API.post('/menu/upload-image', formData);
            setForm((prev) => ({
                ...prev,
                imageUrl: res.data.url,
                imagePublicId: res.data.publicId,
            }));
            toast.success('Image uploaded');
        } catch (err) {
            console.error('Failed to upload image', err);
            toast.error(err.response?.data?.message || 'Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
        if (fileRef.current) fileRef.current.value = '';
    };

    const saveItem = async () => {
        if (!form.name || !form.price) {
            toast.error('Name and price are required');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                description: form.description,
                price: parseFloat(form.price),
                category: form.category || 'main',
                imageUrl: form.imageUrl || null,
                imagePublicId: form.imagePublicId || null,
            };

            if (editingId) {
                await API.put(`/menu/${editingId}`, payload);
                toast.success('Menu item updated');
            } else {
                await API.post('/menu', payload);
                toast.success('Menu item added');
            }

            cancelEdit();
            fetchMenu();
        } catch (err) {
            console.error('Failed to save menu item', err);
            toast.error(err.response?.data?.message || 'Failed to save menu item');
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await API.delete(`/menu/${pendingDelete._id}`);
            toast.success('Menu item deleted');
            setPendingDelete(null);
            fetchMenu();
        } catch (err) {
            console.error('Failed to delete menu item', err);
            toast.error('Failed to delete menu item');
        }
        setDeleting(false);
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Manage Menu</h2>
                <p class="text-sm text-gray-500">Add, edit, or remove items from the live menu</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                        <h3 className="text-base font-black text-gray-800">
                            {editingId ? 'Edit Item' : 'Add Item'}
                        </h3>
                        {editingId && (
                            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Field label="Dish Name">
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Nyama Choma Platter"
                                className="input"
                            />
                        </Field>

                        <Field label="Category">
                            <input
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                placeholder="main"
                                list="category-suggestions"
                                className="input"
                            />
                            <datalist id="category-suggestions">
                                {CATEGORY_SUGGESTIONS.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </Field>

                        <Field label="Price (KES)">
                            <input
                                type="number"
                                value={form.price}
                                onChange={(e) => setForm({ ...form, price: e.target.value })}
                                placeholder="1200"
                                className="input"
                            />
                        </Field>

                        <Field label="Description">
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Optional short description"
                                rows={2}
                                className="input resize-none"
                            />
                        </Field>

                        <Field label="Dish Image">
                            <div className="space-y-2">
                                {form.imageUrl && (
                                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                        <img
                                            src={form.imageUrl}
                                            alt="Preview"
                                            className="h-14 w-14 rounded-lg object-cover shrink-0"
                                        />
                                        <span className="text-xs text-gray-400 truncate flex-1">Image attached</span>
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                            title="Remove image"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-orange-400 hover:text-orange-500 transition-all disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <>
                                            <ImageIcon size={15} className="animate-pulse" /> Uploading…
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={15} />
                                            {form.imageUrl ? 'Change image' : 'Upload from gallery'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </Field>

                        <button
                            onClick={saveItem}
                            disabled={saving || uploading}
                            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50 mt-2"
                        >
                            <Plus size={16} />
                            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Menu'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                        Live Menu Items ({menu.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[540px] overflow-y-auto pr-1">
                        {menu.length === 0 ? (
                            <p className="text-gray-400 text-sm col-span-full text-center py-10 font-medium">
                                No menu items yet
                            </p>
                        ) : (
                            menu.map((item) => (
                                <div
                                    key={item._id}
                                    className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-gray-50/50 hover:border-orange-500/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <UtensilsCrossed size={16} className="text-gray-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                                            <p className="text-xs text-orange-500 font-bold mt-0.5">
                                                KES {item.price.toLocaleString()}
                                            </p>
                                            <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                {item.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 ml-2">
                                        <button
                                            onClick={() => startEdit(item)}
                                            className="text-gray-400 hover:text-orange-500 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => setPendingDelete(item)}
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

            <ConfirmModal
                open={!!pendingDelete}
                title="Delete menu item?"
                description={`Remove "${pendingDelete?.name}" from the live menu? This can't be undone.`}
                confirmLabel="Delete"
                tone="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            />

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

// Keep field definitions intact
function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}
