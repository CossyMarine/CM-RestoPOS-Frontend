import { X } from 'lucide-react';

export default function ViewItemsModal({ open, onClose, title, subtitle, items = [], total }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-4">
                    <div>
                        <h3 className="text-lg font-black text-white">{title}</h3>
                        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No items to show</p>
                    ) : (
                        items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-800/70 text-sm">
                                <span className="text-gray-300">
                                    {i.name} <span className="text-gray-500 font-semibold">× {i.qty}</span>
                                </span>
                                <span className="font-bold text-gray-100">KES {(i.qty * i.price).toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>

                {total !== undefined && (
                    <div className="border-t border-gray-800 mt-4 pt-3 flex justify-between font-black text-white">
                        <span>Total</span>
                        <span className="text-orange-500">KES {Number(total).toLocaleString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
                        }
