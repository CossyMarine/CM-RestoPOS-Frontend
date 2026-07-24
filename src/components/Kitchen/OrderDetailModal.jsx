import ItemImage from './ItemImage';
import { formatDate } from '../../utils/formatDate';
import { formatDuration } from '../../utils/kitchenFormat';

export default function OrderDetailModal({ order, onClose, resolveImg }) {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4" onClick={onClose}>
            <div
                className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Table</div>
                        <div className="text-4xl font-black text-orange-500">{order.tableNumber}</div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                        <div className="text-gray-400 text-xs font-bold">Waiter / Source</div>
                        <div className="font-semibold text-gray-800">{order.waiterName || order.customerName || 'Online order'}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs font-bold">Status</div>
                        <div className="font-semibold text-gray-800 capitalize">{order.status}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs font-bold">Placed</div>
                        <div className="font-semibold text-gray-800">{formatDate(order.createdAt)}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 text-xs font-bold">Time to Serve</div>
                        <div className="font-semibold text-gray-800">{formatDuration(order.prepSeconds)}</div>
                    </div>
                </div>

                <div className="space-y-2">
                    {(order.items || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                            <ItemImage src={resolveImg(item)} alt={item.mealName} className="h-12 w-12" />
                            <span className="font-bold flex-1 text-gray-800">{item.mealName}</span>
                            <span className="font-black text-orange-500">×{item.quantity}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
