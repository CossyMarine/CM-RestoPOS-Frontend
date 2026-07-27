import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
    RefreshCw, Search, ChevronLeft, ChevronRight, Landmark, Smartphone,
    Wallet, Gift, Layers, CheckCircle2, XCircle, Eye, Clock, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import PaymentDetailsModal from './PaymentDetailsModal';
import ConfirmModal from './ConfirmModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const METHOD_META = {
    cash:          { label: 'Cash',        icon: Wallet,     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    mpesa_till:    { label: 'M-Pesa Till', icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_paybill: { label: 'Paybill',     icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_pochi:   { label: 'Pochi',       icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_stk:     { label: 'STK Push',    icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    manual_till:   { label: 'Manual Till', icon: Landmark,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
    reward:        { label: 'Reward',      icon: Gift,       color: 'text-pink-600 bg-pink-50 border-pink-200' },
    both:          { label: 'Split',       icon: Layers,     color: 'text-slate-600 bg-slate-100 border-slate-200' },
};

function MethodPill({ method }) {
    const meta = METHOD_META[method] || { label: method || '—', icon: Wallet, color: 'text-gray-500 bg-gray-50 border-gray-200' };
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${meta.color}`}>
            <Icon size={11} /> {meta.label}
        </span>
    );
}

// --- Helper Functions for Kenyan Time (UTC+3) ---
const getKenyanDate = () => {
    const now = new Date();
    const eatString = now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" });
    return new Date(eatString);
};

const getDateRangePreset = (preset) => {
    const eatNow = getKenyanDate();
    
    // Start & End of today (00:00:00 to 23:59:59.999)
    const todayStart = new Date(eatNow.getFullYear(), eatNow.getMonth(), eatNow.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(eatNow.getFullYear(), eatNow.getMonth(), eatNow.getDate(), 23, 59, 59, 999);

    switch (preset) {
        case 'TODAY':
            return { startDate: todayStart, endDate: todayEnd };

        case 'THIS_WEEK': {
            const dayOfWeek = todayStart.getDay(); // 0 is Sunday
            const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
            const startOfWeek = new Date(todayStart);
            startOfWeek.setDate(todayStart.getDate() - diffToMon);
            return { startDate: startOfWeek, endDate: todayEnd };
        }

        case 'LAST_7_DAYS': {
            const start7Days = new Date(todayStart);
            start7Days.setDate(todayStart.getDate() - 6);
            return { startDate: start7Days, endDate: todayEnd };
        }

        case 'THIS_MONTH': {
            const startOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1, 0, 0, 0, 0);
            return { startDate: startOfMonth, endDate: todayEnd };
        }

        case 'LAST_30_DAYS': {
            const start30Days = new Date(todayStart);
            start30Days.setDate(todayStart.getDate() - 29);
            return { startDate: start30Days, endDate: todayEnd };
        }

        default:
            return { startDate: todayStart, endDate: todayEnd };
    }
};

const formatKES = (amount) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(amount || 0);
};

export default function PaymentsView({ onPendingChange }) {
    const [tab, setTab] = useState('all');

    // ---- Date Presets & Custom Ranges ----
    const [activePreset, setActivePreset] = useState('TODAY');
    const defaultRange = useMemo(() => getDateRangePreset('TODAY'), []);
    
    const [dateFrom, setDateFrom] = useState(defaultRange.startDate.toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(defaultRange.endDate.toISOString().split('T')[0]);

    // ---- All transactions ----
    const [transactions, setTransactions] = useState([]);
    const [txPage, setTxPage] = useState(1);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [txTotal, setTxTotal] = useState(0);
    const [txLoading, setTxLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('');

    // ---- Pending confirmations ----
    const [pending, setPending] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { entry, action }
    const [working, setWorking] = useState(false);

    // ---- View bill modal ----
    const [viewing, setViewing] = useState(null);

    // Sync Preset buttons with input date range
    const handlePresetChange = (presetId) => {
        setActivePreset(presetId);
        const { startDate, endDate } = getDateRangePreset(presetId);
        setDateFrom(startDate.toISOString().split('T')[0]);
        setDateTo(endDate.toISOString().split('T')[0]);
    };

    const fetchTransactions = useCallback(async (page = 1) => {
        setTxLoading(true);
        try {
            const params = { page, limit: 15 };
            if (search) params.q = search;
            if (methodFilter) params.method = methodFilter;
            
            if (dateFrom) {
                const s = new Date(dateFrom + 'T00:00:00');
                params.from = s.toISOString();
            }
            if (dateTo) {
                const e = new Date(dateTo + 'T23:59:59.999');
                params.to = e.toISOString();
            }

            const res = await API.get('/payments/transactions', { params });
            setTransactions(res.data.transactions || []);
            setTxPage(res.data.page || 1);
            setTxTotalPages(res.data.totalPages || 1);
            setTxTotal(res.data.total || 0);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
            toast.error('Failed to load transactions');
        }
        setTxLoading(false);
    }, [search, methodFilter, dateFrom, dateTo]);

    const fetchPending = useCallback(async () => {
        setPendingLoading(true);
        try {
            const res = await API.get('/payments/pending');
            const list = res.data.pending || [];
            setPending(list);
            if (onPendingChange) onPendingChange(list.length);
        } catch (err) {
            console.error('Failed to fetch pending payments', err);
        }
        setPendingLoading(false);
    }, [onPendingChange]);

    useEffect(() => {
        fetchTransactions(1);
    }, [fetchTransactions]);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    // Socket connectivity for real-time pending alerts
    useEffect(() => {
        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socket.on('payment:pending', () => {
            fetchPending();
        });
        socket.on('payment:confirmed', () => {
            fetchPending();
            fetchTransactions(txPage);
        });
        return () => socket.disconnect();
    }, [fetchPending, fetchTransactions, txPage]);

    const openViewer = async (receiptId) => {
        try {
            const res = await API.get(`/receipts/${receiptId}`);
            setViewing(res.data);
        } catch (err) {
            console.error('Failed to load receipt details', err);
            toast.error('Could not load bill details');
        }
    };

    const runPendingAction = async () => {
        if (!pendingAction) return;
        const { entry, action } = pendingAction;
        setWorking(true);
        try {
            if (action === 'confirm') {
                await API.post(`/payments/pending/${entry.paymentId}/confirm`);
                toast.success(`Payment confirmed for ${entry.billId}`);
            } else {
                await API.post(`/payments/pending/${entry.paymentId}/reject`);
                toast.info(`Payment rejected for ${entry.billId}`);
            }
            setPendingAction(null);
            fetchPending();
            fetchTransactions(txPage);
        } catch (err) {
            console.error('Action failed', err);
            toast.error(err.response?.data?.message || 'Action failed');
        }
        setWorking(false);
    };

    // Calculate aggregated metrics for Summary Cards
    const totals = useMemo(() => {
        return transactions.reduce(
            (acc, t) => {
                const amount = Number(t.amount || 0);
                const method = (t.method || '').toLowerCase();

                acc.totalMoney += amount;

                if (method === 'cash') {
                    acc.totalCash += amount;
                } else if (method === 'reward' || method === 'rewards' || method === 'points') {
                    acc.totalReward += amount;
                } else if (
                    method === 'mpesa_till' || 
                    method === 'manual_till' || 
                    method === 'till' || 
                    method === 'mpesa_paybill' || 
                    method === 'mpesa_pochi'
                ) {
                    acc.totalTill += amount;
                } else if (method === 'mpesa_stk' || method === 'stk' || method === 'prompt') {
                    acc.totalPrompt += amount;
                }

                return acc;
            },
            { totalMoney: 0, totalCash: 0, totalReward: 0, totalTill: 0, totalPrompt: 0 }
        );
    }, [transactions]);

    const presets = [
        { id: 'TODAY', label: 'Today (EAT)' },
        { id: 'THIS_WEEK', label: 'This Week' },
        { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
        { id: 'THIS_MONTH', label: 'This Month' },
        { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
    ];

    const cards = [
        { title: 'Total Money', value: totals.totalMoney, color: 'border-l-indigo-500 bg-indigo-50/50 text-indigo-700' },
        { title: 'Total Cash', value: totals.totalCash, color: 'border-l-emerald-500 bg-emerald-50/50 text-emerald-700' },
        { title: 'Paid using Reward', value: totals.totalReward, color: 'border-l-pink-500 bg-pink-50/50 text-pink-700' },
        { title: 'Till Payment', value: totals.totalTill, color: 'border-l-blue-500 bg-blue-50/50 text-blue-700' },
        { title: 'Prompt Payment', value: totals.totalPrompt, color: 'border-l-purple-500 bg-purple-50/50 text-purple-700' },
    ];

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header and Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payments & Ledger</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage payment logs and confirm incoming M-Pesa/Till transactions</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setTab('all')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            tab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        All Transactions
                    </button>
                    <button
                        onClick={() => setTab('pending')}
                        className={`relative px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            tab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Pending Confirmations
                        {pending.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-black animate-pulse">
                                {pending.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card, idx) => (
                    <div 
                        key={idx} 
                        className={`p-4 rounded-xl border-l-4 bg-white border border-gray-200/80 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${card.color}`}
                    >
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            {card.title}
                        </span>
                        <span className="text-xl font-black mt-2 text-gray-900">
                            {formatKES(card.value)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Filter Bar (Presets + Custom Range + Search) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {presets.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => handlePresetChange(preset.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activePreset === preset.id
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/60'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Calendar Range Inputs & Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600">
                        <Calendar size={14} className="text-gray-400 ml-1" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setActivePreset('CUSTOM');
                                setDateFrom(e.target.value);
                            }}
                            className="bg-transparent border-none text-gray-800 focus:outline-none"
                        />
                        <span className="text-gray-400 font-normal">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setActivePreset('CUSTOM');
                                setDateTo(e.target.value);
                            }}
                            className="bg-transparent border-none text-gray-800 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => fetchTransactions(1)}
                        className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={txLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Tab Views */}
            {tab === 'all' && (
                <>
                    {/* Search & Method Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by receipt #, reference, or customer..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                            />
                        </div>
                        <select
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            <option value="">All Payment Methods</option>
                            <option value="cash">Cash</option>
                            <option value="mpesa_till">M-Pesa Till</option>
                            <option value="mpesa_paybill">Paybill</option>
                            <option value="mpesa_pochi">Pochi</option>
                            <option value="mpesa_stk">STK Push</option>
                            <option value="manual_till">Manual Till</option>
                            <option value="reward">Reward Points</option>
                            <option value="both">Split Payment</option>
                        </select>
                    </div>

                    {/* Table View */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 font-semibold text-xs">
                                        <th className="p-3.5">Receipt #</th>
                                        <th className="p-3.5">Date & Time (EAT)</th>
                                        <th className="p-3.5">Method</th>
                                        <th className="p-3.5">Reference</th>
                                        <th className="p-3.5 text-right">Amount</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    {txLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-orange-500" />
                                                Loading transaction logs...
                                            </td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                                No transactions match your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((t) => (
                                            <tr key={t._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-3.5 font-bold text-gray-900">{t.receiptNo || t._id?.slice(-6)}</td>
                                                <td className="p-3.5 text-xs text-gray-500">
                                                    {new Date(t.createdAt || t.date).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                                                </td>
                                                <td className="p-3.5">
                                                    <MethodPill method={t.method} />
                                                </td>
                                                <td className="p-3.5 text-xs font-mono text-gray-500">{t.reference || '—'}</td>
                                                <td className="p-3.5 text-right font-black text-gray-900">
                                                    KES {Number(t.amount).toLocaleString()}
                                                </td>
                                                <td className="p-3.5 text-right">
                                                    <button
                                                        onClick={() => openViewer(t._id || t.receiptId)}
                                                        className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-bold transition-colors"
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

                        {/* Pagination Footer */}
                        {!txLoading && txTotalPages > 1 && (
                            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                                <button
                                    onClick={() => fetchTransactions(Math.max(1, txPage - 1))}
                                    disabled={txPage <= 1}
                                    className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500 transition-colors"
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <span className="text-xs font-semibold text-gray-500">
                                    Page {txPage} of {txTotalPages} · {txTotal} transactions
                                </span>
                                <button
                                    onClick={() => fetchTransactions(Math.min(txTotalPages, txPage + 1))}
                                    disabled={txPage >= txTotalPages}
                                    className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500 transition-colors"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === 'pending' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    {pendingLoading ? (
                        <div className="text-center py-16 text-gray-400">
                            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-orange-500" />
                            Loading pending confirmations...
                        </div>
                    ) : pending.length === 0 ? (
                        <div className="text-center py-16">
                            <Clock size={28} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No payments waiting confirmation</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-400 font-semibold border-b border-gray-100 text-xs">
                                        <th className="p-3">Bill ID</th>
                                        <th className="p-3">Table</th>
                                        <th className="p-3">Submitted By</th>
                                        <th className="p-3">Reference</th>
                                        <th className="p-3 text-right">Amount</th>
                                        <th className="p-3">Submitted (EAT)</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    {pending.map((p) => (
                                        <tr key={p.paymentId} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                                            <td className="p-3 font-bold text-orange-500">{p.billId}</td>
                                            <td className="p-3 font-semibold text-gray-800">Table {p.tableNumber}</td>
                                            <td className="p-3 font-medium">{p.paidByName}</td>
                                            <td className="p-3 text-xs text-gray-500 font-mono">{p.reference}</td>
                                            <td className="p-3 text-right font-black text-gray-800">KES {Number(p.amount).toLocaleString()}</td>
                                            <td className="p-3 text-xs text-gray-400">
                                                {new Date(p.submittedAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                                            </td>
                                            <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => openViewer(p.receiptId)}
                                                    className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <button
                                                    onClick={() => setPendingAction({ entry: p, action: 'confirm' })}
                                                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors"
                                                >
                                                    <CheckCircle2 size={14} /> Confirm
                                                </button>
                                                <button
                                                    onClick={() => setPendingAction({ entry: p, action: 'reject' })}
                                                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-bold transition-colors"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Receipt Modal */}
            <PaymentDetailsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                receipt={viewing}
            />

            {/* Confirmation Dialog Modal */}
            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'confirm' ? 'Confirm this payment?' : 'Reject this payment?'}
                description={
                    pendingAction?.action === 'confirm'
                        ? `This applies KES ${Number(pendingAction?.entry?.amount).toLocaleString()} to ${pendingAction?.entry?.billId}. Make sure you've verified the till/M-Pesa message before confirming.`
                        : `The customer's claimed payment is discarded and the bill stays unpaid. Use this if the till message can't be verified.`
                }
                confirmLabel={pendingAction?.action === 'confirm' ? 'Confirm Payment' : 'Reject'}
                tone={pendingAction?.action === 'confirm' ? 'default' : 'danger'}
                loading={working}
                onConfirm={runPendingAction}
                onClose={() => setPendingAction(null)}
            />
        </div>
    );
}
