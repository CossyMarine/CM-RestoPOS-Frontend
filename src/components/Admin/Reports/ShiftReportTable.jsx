import { formatKenyanDateTime } from '../../../utils/formatDate';

const fmt = (n) => n === null || n === undefined ? '—' : `KSh ${Number(n).toLocaleString()}`;

const varianceClass = (v) => {
    if (v === null || v === undefined) return 'text-gray-400';
    if (v === 0) return 'text-emerald-600';
    return v > 0 ? 'text-amber-600' : 'text-red-600';
};

export default function ShiftReportTable({ shifts }) {
    const safeShifts = Array.isArray(shifts) ? shifts : [];
    if (safeShifts.length === 0) {
        return <p className="text-gray-400 text-sm text-center py-10">No shifts in this range</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase tracking-widest border-b border-gray-200">
                        <th className="py-2 pr-4">Accountant</th>
                        <th className="py-2 pr-4">Opened</th>
                        <th className="py-2 pr-4">Closed</th>
                        <th className="py-2 pr-4">Opening Float</th>
                        <th className="py-2 pr-4">Closing Cash</th>
                        <th className="py-2 pr-4">Cash Variance</th>
                        <th className="py-2 pr-4">Closing Till</th>
                        <th className="py-2 pr-4">Till Variance</th>
                        <th className="py-2 pr-4">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {safeShifts.map((s) => (
                        <tr key={s.shiftId} className="border-b border-gray-100">
                            <td className="py-2.5 pr-4 font-semibold text-gray-800">{s.openedBy?.fullName || '—'}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{formatKenyanDateTime(s.openedAt)}</td>
                            <td className="py-2.5 pr-4 text-gray-500">{s.closedAt ? formatKenyanDateTime(s.closedAt) : '—'}</td>
                            <td className="py-2.5 pr-4">{fmt(s.openingFloat)}</td>
                            <td className="py-2.5 pr-4">{fmt(s.closingCashCount)}</td>
                            <td className={`py-2.5 pr-4 font-bold ${varianceClass(s.variance)}`}>
                                {s.variance === null ? '—' : `${s.variance > 0 ? '+' : ''}${fmt(s.variance)}`}
                            </td>
                            <td className="py-2.5 pr-4">{fmt(s.closingTillCount)}</td>
                            <td className={`py-2.5 pr-4 font-bold ${varianceClass(s.tillVariance)}`}>
                                {s.tillVariance === null ? '—' : `${s.tillVariance > 0 ? '+' : ''}${fmt(s.tillVariance)}`}
                            </td>
                            <td className="py-2.5 pr-4">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}