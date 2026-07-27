import ItemImage from './ItemImage';

export default function OrderCard({ order, isNew, age, isCritical, isLate, sizeCfg, resolveImg, onToggleItem, onAcknowledge, onMarkDone }) {
    const allReady = (order.items || []).every((it) => it.ready);

    return (
        <div
            className={`rounded-2xl p-6 border-2 transition-all shadow-sm bg-white ${
                isNew
                    ? 'border-red-500 bg-red-50/50 animate-pulse ring-4 ring-red-500/10'
                    : isCritical
                    ? 'border-red-500 bg-red-50/30'
                    : isLate
                    ? 'border-amber-400 bg-amber-50/30'
                    : 'border-gray-200 hover:border-gray-300'
            }`}
        >
            <div
                className={`-mx-6 -mt-6 mb-4 px-6 py-3 rounded-t-2xl flex items-center justify-between gap-3 ${
                    isCritical ? 'bg-red-600' : isLate ? 'bg-amber-500' : 'bg-gray-900'
                }`}
            >
                <span className="font-black text-base sm:text-lg text-white uppercase tracking-wide truncate flex items-center gap-2">
                    👤 {order.waiterName || 'Online order'}
                </span>
                <span className="text-sm font-black text-white/90 whitespace-nowrap shrink-0">
                    {age} min ago
                </span>
            </div>

            <div className="mb-4">
                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Table</div>
                <div className={`${sizeCfg.table} font-black leading-none text-orange-500`}>
                    {order.tableNumber}
                </div>
            </div>

            <div className="space-y-2 mb-6">
                {(order.items || []).map((item, i) => {
                    const isAdded = !!item.addedAt;
                    return (
                        <button
                            key={i}
                            onClick={() => onToggleItem(order, i)}
                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors border ${
                                item.ready
                                    ? 'bg-emerald-50/60 border-emerald-200'
                                    : isAdded
                                    ? 'bg-amber-50 border-amber-300'
                                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <span
                                className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                    item.ready ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                                }`}
                            >
                                {item.ready && <span className="text-xs font-bold">✓</span>}
                            </span>
                            <ItemImage src={resolveImg(item)} alt={item.mealName} className={`${sizeCfg.img} w-auto aspect-square`} />
                            <span className={`font-bold ${sizeCfg.name} flex-1 ${item.ready ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                    {item.mealName}
                                    {isAdded && !item.ready && (
                                        <span className="text-[10px] font-black uppercase tracking-wide bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded">
                                            Added
                                        </span>
                                    )}
                                </span>
                                <span className={`block font-semibold ${sizeCfg.price} ${item.ready ? 'text-gray-400' : 'text-orange-500'}`}>
                                    KSh {Number(item.unitPrice).toLocaleString()}
                                </span>
                            </span>
                            <span className={`font-black ${sizeCfg.qty} text-orange-500`}>×{item.quantity}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-2">
                {isNew && (
                    <button
                        onClick={() => onAcknowledge(order._id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-xl text-sm shadow-sm transition-colors"
                    >
                        🔕 Acknowledge
                    </button>
                )}
                <button
                    onClick={() => onMarkDone(order._id)}
                    className={`flex-1 font-black py-3 rounded-xl text-sm transition-all shadow-sm ${
                        allReady
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                            : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                >
                    ✅ Serve Order
                </button>
            </div>
        </div>
    );
}
