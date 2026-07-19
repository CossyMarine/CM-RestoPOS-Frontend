export default function StationConfig({ waiters, waiterName, onWaiterChange, tableNumber, onTableChange }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Assigned Server</label>
        <select
          value={waiterName}
          onChange={(e) => onWaiterChange(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select identity...</option>
          {waiters.map((w) => (
            <option key={w.id} value={w.fullName}>
              {w.fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="w-32">
        <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Table Destination</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="No."
          value={tableNumber}
          onChange={(e) => onTableChange(e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
    </div>
  );
}
