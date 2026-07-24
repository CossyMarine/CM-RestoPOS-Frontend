import { formatDate } from '../../utils/formatDate';
import { formatDuration } from '../../utils/kitchenFormat';

export default function HistoryTab({
    orders,
    loading,
    page,
    totalPages,
    total,
    filters,
    setFilters,
    onApply,
    onClear,
    onLoadPage,
    onViewDetail,
}) {
    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end shadow-sm">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-gray-400 font-bold block mb-1">Search</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        placeholder="Waiter, table, item..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                    >
                        <option value="">All</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Waiter</label>
                    <input
                        type="text"
                        value={filters.waiterName}
                        onChange={(e) => setFilters((f) => ({ ...f, waiterName: e.target.value }))}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-32"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">Table</label>
                    <input
                        type="text"
                        value={filters.tableNumber}
                        onChange={(e) => setFilters((f) => ({ ...f, tableNumber: e.target.value }))}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 w-20"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">From</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-400 font-bold block mb-1">To</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500"
                    />
                </div>
                <button onClick={onApply} className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm">
                    Apply
                </button>
                <button onClick={onClear} className="text-gray-400 hover:text-gray-600 text-sm font-semibold px-2 py-2 transition-colors">
                    Clear
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase border-b border-gray-100 font-semibold">
                        <tr>
                            <th className="text-left px-4 py-3">Table</th>
                            <th className="text-left px-4 py-3">Waiter / Source</th>
                            <th className="text-left px-4 py-3">Items</th>
                            <th className="text-left px-4 py-3">Placed</th>
                            <th className="text-left px-4 py-3">Prep Time</th>
                            <th className="text-left px-4 py-3">Status</th>
                            <th className="text-left px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-600">
                        {loading && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium">Loading…</td></tr>
                        )}
                        {!loading && orders.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-medium">No orders match these filters.</td></tr>
                        )}
                        {!loading && orders.map((o) => (
                            <tr key={o._id} className="hover:bg-gray-50/70 transition-colors">
                                <td className="px-4 py-3 font-bold text-orange-500">{o.tableNumber}</td>
                                <td className="px-4 py-3 font-medium">{o.waiterName || o.customerName || 'Online'}</td>
                                <td className="px-4 py-3 text-gray-500">
                                    {(o.items || []).slice(0, 2).map((it) => it.mealName).join(', ')}
                                    {o.items && o.items.length > 2 ? ` +${o.items.length - 2} more` : ''}
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(o.createdAt)}</td>
                                <td className="px-4 py-3 text-gray-400 text-xs">{formatDuration(o.prepSeconds)}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                        o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : o.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => onViewDetail(o)} className="text-orange-500 hover:text-orange-600 font-semibold text-xs transition-colors">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                <span>{total} orders total</span>
                <div className="flex items-center gap-3">
                    <button
                        disabled={page <= 1}
                        onClick={() => onLoadPage(page - 1)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 shadow-sm font-semibold text-gray-600"
                    >
                        Prev
                    </button>
                    <span className="font-medium">Page {page} of {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => onLoadPage(page + 1)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 shadow-sm font-semibold text-gray-600"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
