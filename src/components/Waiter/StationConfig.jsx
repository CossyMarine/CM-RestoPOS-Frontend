export default function StationConfig({ waiters, waiterName, onWaiterChange, tableNumber, onTableChange, hideTableField }) {
  useEffect(() => {
    if (waiters.length === 1 && waiterName !== waiters[0].fullName) {
      onWaiterChange(waiters[0].fullName);
    }
  }, [waiters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Assigned Server</label>
        {waiters.length === 1 ? (
          <div className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold text-stone-800">
            {waiters[0].fullName}
          </div>
        ) : (
          <select
            value={waiterName}
            onChange={(e) => onWaiterChange(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select identity...</option>
            {waiters.map((w) => <option key={w.id} value={w.fullName}>{w.fullName}</option>)}
          </select>
        )}
      </div>

      {!hideTableField && (
        <div className="w-32">
          <label className="block text-xs font-bold uppercase text-stone-400 mb-1">Table Destination</label>
          <input
            type="text" inputMode="numeric" placeholder="No."
            value={tableNumber} onChange={(e) => onTableChange(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}
    </div>
  );
}
