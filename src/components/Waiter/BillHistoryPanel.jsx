import { Search, ChevronLeft, ChevronRight, Printer, PackagePlus, Trash2, Eye } from "lucide-react";
import { formatKenyanDateTime } from "../../utils/formatDate";

export default function BillHistoryPanel({
  receipts,
  page,
  totalPages,
  total,
  loading,
  search,
  onSearchChange,
  onPageChange,
  onPrint,
  onAddItems,
  onRequestVoid,
  onView,
  showWaiterColumn,
}) {
  return (
    <div className="max-w-7xl mx-auto px-5 mt-6 space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search bill ID, table, or waiter..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-stone-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-stone-50 font-semibold text-stone-700"
          />
        </div>
        <span className="text-xs text-stone-400 font-semibold">
          {total} total bills {showWaiterColumn && "· showing all waiters"}
        </span>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-500 uppercase font-bold border-b border-stone-200">
                <th className="p-4">Bill</th>
                <th className="p-4">Table</th>
                {showWaiterColumn && <th className="p-4">Waiter</th>}
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {loading && (
                <tr>
                  <td colSpan={showWaiterColumn ? 6 : 5} className="p-8 text-center text-stone-400">
                    Loading bill history...
                  </td>
                </tr>
              )}
              {!loading && receipts.length === 0 && (
                <tr>
                  <td colSpan={showWaiterColumn ? 6 : 5} className="p-8 text-center text-stone-400">
                    No bills found
                  </td>
                </tr>
              )}
              {!loading &&
                receipts.map((bill) => (
                  <tr key={bill._id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-bold text-stone-900">
                      {bill.billId}
                      <div className="text-[10px] text-stone-400 font-normal mt-0.5">
                        {formatKenyanDateTime(bill.createdAt)}
                      </div>
                    </td>
                    <td className="p-4 font-bold">Table {bill.tableNumber}</td>
                    {showWaiterColumn && (
                      <td className="p-4 text-stone-600 font-semibold">{bill.waiterName || "—"}</td>
                    )}
                    <td className="p-4 text-stone-900 font-black">KSh {(bill.totalDue ?? bill.subtotal).toLocaleString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          bill.status === "voided"
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : bill.status === "paid"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}
                      >
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onView(bill)}
                          className="flex items-center gap-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2.5 py-1.5 rounded-lg transition-colors font-bold text-[10px]"
                          title="View bill items"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => onPrint(bill)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1.5 rounded-lg transition-colors font-bold text-[10px]"
                          title="Reprint"
                        >
                          <Printer size={12} /> Reprint
                        </button>
                        {bill.status === "unpaid" && (
                          <>
                            <button
                              onClick={() => onAddItems(bill)}
                              className="flex items-center gap-1 text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-100 px-2.5 py-1.5 rounded-lg transition-colors font-bold text-[10px]"
                              title="Add menu items"
                            >
                              <PackagePlus size={12} /> Add Menu
                            </button>
                            <button
                              onClick={() => onRequestVoid(bill)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-100 px-2.5 py-1.5 rounded-lg transition-colors font-bold text-[10px]"
                              title="Request void"
                            >
                              <Trash2 size={12} /> Void
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs font-bold text-stone-500 disabled:opacity-30 hover:text-stone-800"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs font-semibold text-stone-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 text-xs font-bold text-stone-500 disabled:opacity-30 hover:text-stone-800"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
                      }
