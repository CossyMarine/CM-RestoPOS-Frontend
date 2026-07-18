import { useState, useEffect, useMemo } from 'react';
import { Eye, RefreshCw, Filter, ShieldAlert, Wallet, ReceiptText } from 'lucide-react';
import API from '../../api/axios';
import ViewItemsModal from './ViewItemsModal';

export default function DashboardOverview() {
    const [revenueToday, setRevenueToday] = useState({ totalRevenue: 0, paidReceiptsCount: 0 });
    const [unpaid, setUnpaid] = useState([]);
    const [paid, setPaid] = useState([]);
    const [voidCount, setVoidCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewing, setViewing] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rev, unpaidRes, paidRes, voidsRes] = await Promise.all([
                API.get('/revenue/today'),
                API.get('/receipts'),
                API.get('/receipts/paid'),
                API.get('/void-requests'),
            ]);
            setRevenueToday(rev.data);
            setUnpaid(unpaidRes.data);
            setPaid(paidRes.data);
            setVoidCount(voidsRes.data.length);
        } catch (err) {
            console.error('Failed to load dashboard metrics', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const combined = useMemo(() => {
        const all = [...unpaid, ...paid].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        if (!dateFrom && !dateTo) return all.slice(0, 15);

        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;

        return all.filter((r) => {
            const created = new Date(r.createdAt);
            if (from && created < from) return false;
            if (to && created > to) return false;
            return true;
        });
    }, [unpaid, paid, dateFrom, dateTo]);

    const filteredRevenue = useMemo(() => {
        if (!dateFrom && !dateTo) return revenueToday.totalRevenue;
        return combined
            .filter((r) => r.status === 'paid')
            .reduce((sum, r) => sum + r.subtotal, 0);
    }, [combined, dateFrom, dateTo, revenueToday]);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white">Dashboard Overview</h2>
                    <p className="text-sm text-gray-500">Live summary across today's activity</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 p-2 rounded-lg text-sm">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-orange-500"
                    />
                    <span className="text-gray-600">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-orange-500"
                    />
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-semibold transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    icon={Wallet}
                    label={dateFrom || dateTo ? 'Revenue (filtered)' : 'Total Revenue Today'}
                    value={`KES ${filteredRevenue.toLocaleString()}`}
                />
                <MetricCard
                    icon={ReceiptText}
                    label={dateFrom || dateTo ? 'Receipts (filtered)' : 'Total Receipts Today'}
                    value={combined.length}
                />
                <MetricCard
                    icon={ShieldAlert}
                    label="Active Void Requests"
                    value={voidCount}
                    accent
                />
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white mb-4">Recent Receipts</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-500 font-semibold border-b border-gray-800">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Waiter</th>
                                <th className="p-3">Table</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/70 text-gray-300">
                            {combined.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-gray-600">
                                        No receipts in this range
                                    </td>
                                </tr>
                            ) : (
                                combined.map((r) => (
                                    <tr key={r._id} className="hover:bg-gray-800/40 transition-colors">
                                        <td className="p-3 font-bold text-orange-400">{r.billId}</td>
                                        <td className="p-3">{r.waiterName || '—'}</td>
                                        <td className="p-3 font-semibold">Table {r.tableNumber}</td>
                                        <td className="p-3 font-bold text-white">KES {r.subtotal.toLocaleString()}</td>
                                        <td className="p-3 text-xs text-gray-500">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            <StatusPill status={r.status} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => setViewing(r)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-400 text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `Table ${viewing.tableNumber} · ${viewing.waiterName || 'No waiter'}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.mealName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
            />
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, accent }) {
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider font-bold text-gray-500">{label}</p>
                <Icon size={18} className={accent ? 'text-orange-500' : 'text-gray-600'} />
            </div>
            <h3 className={`text-2xl font-black mt-1 ${accent ? 'text-orange-500' : 'text-white'}`}>{value}</h3>
        </div>
    );
}

function StatusPill({ status }) {
    const styles = {
        unpaid: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        voided: 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return (
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles[status] || styles.unpaid}`}>
            {status}
        </span>
    );
              }
