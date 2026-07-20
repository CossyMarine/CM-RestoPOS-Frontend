import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
    Eye, RefreshCw, Wallet, Smartphone, Layers, Landmark, Search,
    ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Gift,
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ViewItemsModal from './ViewItemsModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function OrdersLedger() {
    const [tab, setTab] = useState('unpaid');
    const [unpaid, setUnpaid] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);

    // ---- "All" tab: paginated history, search, date filter, today summary ----
    const [allReceipts, setAllReceipts] = useState([]);
    const [allPage, setAllPage] = useState(1);
    const [allTotalPages, setAllTotalPages] = useState(1);
    const [allTotal, setAllTotal] = useState(0);
    const [allLoading, setAllLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [summary, setSummary] = useState({ paidToday: 0, paidTodayCount: 0, unpaidToday: 0, unpaidTodayCount: 0 });

    // ---- Payment modal ----
    const [selected, setSelected] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' | 'prompt' | 'both' | 'till'
    const [amountPaid, setAmountPaid] = useState('');
    const [cashPortion, setCashPortion] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [tillAmount, setTillAmount] = useState('');
    const [tillReference, setTillReference] = useState('');
    const [processing, setProcessing] = useState(false);
    const [mpesaState, setMpesaState] = useState('idle'); // idle | sending | pending | success | failed
    const [mpesaMessage, setMpesaMessage] = useState('');
    const pollTimer = useRef(null);
    const pollAttempts = useRef(0);

    // ---- Add-reward-before-confirming ----
    const [addReward, setAddReward] = useState(false);
    const [rewardIdentifier, setRewardIdentifier] = useState('');

    // ---- Pay-with-customer-reward (separate action) ----
    const [rewardPayTarget, setRewardPayTarget] = useState(null); // receipt
    const [rewardPayIdentifier, setRewardPayIdentifier] = useState('');
    const [rewardPayProcessing, setRewardPayProcessing] = useState(false);

    // ---- Quick lists (unpaid/paid tabs + tab counts) ----
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [unpaidRes, paidRes] = await Promise.all([
                API.get('/receipts'),
                API.get('/receipts/paid'),
            ]);
            setUnpaid(unpaidRes.data);
            setPaidList(paidRes.data);
        } catch (err) {
            console.error('Failed to fetch receipts', err);
            toast.error('Failed to load receipts');
        }
        setLoading(false);
    }, []);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await API.get('/receipts/summary/today');
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch summary', err);
        }
    }, []);

    const fetchAllReceipts = useCallback(async (page = 1) => {
        setAllLoading(true);
        try {
            const params = { page, limit: 10, q: search || undefined };
            if (dateFrom) params.from = new Date(dateFrom).toISOString();
            if (dateTo) params.to = new Date(dateTo).toISOString();
            const res = await API.get('/receipts/history', { params });
            setAllReceipts(res.data.receipts);
            setAllPage(res.data.page);
            setAllTotalPages(res.data.totalPages);
            setAllTotal(res.data.total);
        } catch (err) {
            console.error('Failed to fetch bill history', err);
            toast.error('Failed to load bill history');
        }
        setAllLoading(false);
    }, [search, dateFrom, dateTo]);

    useEffect(() => {
        fetchData();
        fetchSummary();
    }, [fetchData, fetchSummary]);

    useEffect(() => {
        if (tab !== 'all') return;
        const t = setTimeout(() => fetchAllReceipts(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, search, dateFrom, dateTo]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('receipt:paid', () => {
            fetchData();
            fetchSummary();
            if (tab === 'all') fetchAllReceipts(allPage);
        });
        socket.on('receipt:updated', () => {
            fetchData();
            if (tab === 'all') fetchAllReceipts(allPage);
        });
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

    // ---- Payment flow ----

    const resetPaymentState = () => {
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = null;
        pollAttempts.current = 0;
        setSelected(null);
        setPaymentMethod('');
        setAmountPaid('');
        setCashPortion('');
        setMpesaPhone('');
        setTillAmount('');
        setTillReference('');
        setMpesaState('idle');
        setMpesaMessage('');
        setAddReward(false);
        setRewardIdentifier('');
    };

    const refreshAfterPayment = () => {
        fetchData();
        fetchSummary();
        if (tab === 'all') fetchAllReceipts(allPage);
    };

    const balanceDue = (r) => Number((r.subtotal - (r.amountPaid || 0)).toFixed(2));

    // After ANY successful payment, optionally credit the reward program
    const maybeCreditReward = async (amountJustPaid) => {
        if (!addReward || !rewardIdentifier.trim()) return;
        try {
            const res = await API.post('/wallet/admin/add-reward', {
                identifier: rewardIdentifier.trim(),
                amountSpent: amountJustPaid,
            });
            toast.success(res.data.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not credit reward points');
        }
    };

    const handleCashPay = async () => {
        const due = balanceDue(selected);
        const received = parseFloat(amountPaid);
        if (isNaN(received) || received < due) {
            toast.error('Amount received cannot be less than the balance due');
            return;
        }
        setProcessing(true);
        try {
            await API.patch(`/receipts/${selected._id}/pay`, { amountPaid: received });
            await maybeCreditReward(due);
            toast.success('Payment recorded');
            resetPaymentState();
            refreshAfterPayment();
        } catch (err) {
            console.error('Payment failed', err);
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const handleTillPay = async () => {
        const due = balanceDue(selected);
        const amt = parseFloat(tillAmount);
        if (isNaN(amt) || amt <= 0 || amt > due) {
            toast.error(`Enter an amount between 1 and ${due}`);
            return;
        }
        if (!tillReference.trim()) {
            toast.error("Enter the M-Pesa code or the customer's full name");
            return;
        }
        setProcessing(true);
        try {
            await API.post('/wallet/pay/manual', {
                receiptId: selected._id,
                amount: amt,
                reference: tillReference.trim(),
            });
            await maybeCreditReward(amt);
            toast.success('Payment recorded');
            resetPaymentState();
            refreshAfterPayment();
        } catch (err) {
            console.error('Till payment failed', err);
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const startPolling = (receiptId, amountBeingPaid) => {
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollAttempts.current = 0;

        pollTimer.current = setInterval(async () => {
            pollAttempts.current += 1;
            try {
                const res = await API.get(`/receipts/${receiptId}/mpesa/status`);
                if (res.data.status === 'success') {
                    clearInterval(pollTimer.current);
                    setMpesaState('success');
                    toast.success('M-Pesa payment received');
                    await maybeCreditReward(amountBeingPaid);
                    refreshAfterPayment();
                    setTimeout(resetPaymentState, 1200);
                } else if (res.data.status === 'failed') {
                    clearInterval(pollTimer.current);
                    setMpesaState('failed');
                    setMpesaMessage(res.data.message || 'Payment was not completed');
                }
            } catch (err) {
                console.error('Status check failed', err);
            }

            if (pollAttempts.current >= 30) {
                clearInterval(pollTimer.current);
                setMpesaState((current) => {
                    if (current === 'pending') {
                        setMpesaMessage('No confirmation received yet. Ask the customer to check their phone, or try again.');
                        return 'failed';
                    }
                    return current;
                });
            }
        }, 4000);
    };

    const handleSendStk = async () => {
        if (!mpesaPhone.trim()) {
            toast.error('Enter the M-Pesa phone number');
            return;
        }
        const due = balanceDue(selected);
        let cashAmount = 0;
        if (paymentMethod === 'both') {
            cashAmount = parseFloat(cashPortion);
            if (isNaN(cashAmount) || cashAmount <= 0 || cashAmount >= due) {
                toast.error('Cash amount must be more than 0 and less than the balance due');
                return;
            }
        }

        setMpesaState('sending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${selected._id}/mpesa/initiate`, {
                phone: mpesaPhone.trim(),
                cashAmount,
            });
            setMpesaState('pending');
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
            startPolling(selected._id, due);
        } catch (err) {
            console.error('STK push failed', err);
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
    };

    const handleRetryMpesa = async () => {
        try {
            await API.post(`/receipts/${selected._id}/mpesa/cancel`);
        } catch (err) {
            console.error('Failed to reset M-Pesa state', err);
        }
        setMpesaState('idle');
        setMpesaMessage('');
    };

    const due = selected ? balanceDue(selected) : 0;

    const tillPortion = selected
        ? paymentMethod === 'both'
            ? Math.max(due - (parseFloat(cashPortion) || 0), 0)
            : due
        : 0;

    const cashChange = selected && paymentMethod === 'cash' && amountPaid
        ? parseFloat(amountPaid) - due
        : null;

    // ---- Pay with customer reward ----
    const handlePayWithReward = async () => {
        if (!rewardPayIdentifier.trim()) {
            toast.error("Enter the customer's registered email or phone");
            return;
        }
        setRewardPayProcessing(true);
        try {
            const res = await API.post('/wallet/admin/pay-with-reward', {
                identifier: rewardPayIdentifier.trim(),
                receiptId: rewardPayTarget._id,
            });
            toast.success(res.data.message);
            setRewardPayTarget(null);
            setRewardPayIdentifier('');
            refreshAfterPayment();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not redeem points');
        }
        setRewardPayProcessing(false);
    };

    // ---- Display helpers ----

    const paymentInfo = (r) =>
        r.status === 'paid' || r.status === 'partial'
            ? {
                  method: r.paymentMethod,
                  cashAmount: r.cashAmount,
                  tillAmount: r.tillAmount,
                  amountPaid: r.amountPaid,
                  changeGiven: r.changeGiven,
                  mpesaReceiptNumber: r.mpesaReceiptNumber,
                  paidAt: r.paidAt,
              }
            : null;

    const rowHighlight = (status) => {
        if (status === 'paid') return 'bg-emerald-50/40 hover:bg-emerald-50/70';
        if (status === 'voided') return 'bg-red-50/40 hover:bg-red-50/70';
        if (status === 'partial') return 'bg-blue-50/40 hover:bg-blue-50/70';
        return 'bg-amber-50/40 hover:bg-amber-50/70';
    };

    const rows = tab === 'unpaid' ? unpaid : tab === 'paid' ? paidList : allReceipts;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Orders & Receipts</h2>
                    <p className="text-sm text-gray-500">Track unpaid bills and payment history</p>
                </div>
                <button
                    onClick={() => { fetchData(); fetchSummary(); if (tab === 'all') fetchAllReceipts(allPage); }}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading || allLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Today summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-bold text-emerald-600">Paid Today</p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">
                        KES {(summary.paidToday || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{summary.paidTodayCount || 0} receipts</p>
                </div>
                <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-bold text-amber-600">Unpaid Today</p>
                    <h3 className="text-2xl font-black text-gray-800 mt-1">
                        KES {(summary.unpaidToday || 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{summary.unpaidTodayCount || 0} receipts</p>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['unpaid', 'paid', 'all'].map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); if (t === 'all') fetchAllReceipts(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                            tab === t
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                                : 'bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm'
                        }`}
                    >
                        {t === 'all' ? `All (${allTotal})` : `${t} (${t === 'unpaid' ? unpaid.length : paidList.length})`}
                    </button>
                ))}
            </div>

            {tab === 'all' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Bill ID or waiter..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    <input
                        type="datetime-local"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                        type="datetime-local"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    />
                    {(search || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                            className="text-xs font-bold text-gray-400 hover:text-red-500"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Table</th>
                                <th className="p-3">Waiter</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Balance Due</th>
                                <th className="p-3">Date</th>
                                {tab === 'all' && <th className="p-3">Status</th>}
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {(tab === 'all' ? allLoading : loading) ? (
                                <tr>
                                    <td colSpan={8} className="p-6 text-center text-gray-400 font-medium">
                                        Loading…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-6 text-center text-gray-400 font-medium">
                                        No {tab === 'all' ? '' : tab} receipts
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r._id} className={`transition-colors ${tab === 'all' ? rowHighlight(r.status) : 'hover:bg-gray-50/70'}`}>
                                        <td className="p-3 font-bold text-orange-500">{r.billId}</td>
                                        <td className="p-3 font-semibold text-gray-800">Table {r.tableNumber}</td>
                                        <td className="p-3 font-medium">{r.waiterName || '—'}</td>
                                        <td className="p-3 font-bold text-gray-800">KES {r.subtotal.toLocaleString()}</td>
                                        <td className="p-3 font-semibold text-gray-600">
                                            KES {balanceDue(r).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-xs text-gray-400">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </td>
                                        {tab === 'all' && (
                                            <td className="p-3">
                                                <StatusPill status={r.status} />
                                            </td>
                                        )}
                                        <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewing(r)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            {['unpaid', 'partial'].includes(r.status) && (
                                                <>
                                                    <button
                                                        onClick={() => setSelected(r)}
                                                        className="text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors"
                                                    >
                                                        Pay
                                                    </button>
                                                    <button
                                                        onClick={() => setRewardPayTarget(r)}
                                                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 text-xs font-bold transition-colors"
                                                    >
                                                        <Gift size={13} /> Reward
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {tab === 'all' && allTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                        <button
                            onClick={() => fetchAllReceipts(Math.max(1, allPage - 1))}
                            disabled={allPage <= 1}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="text-xs font-semibold text-gray-500">
                            Page {allPage} of {allTotalPages} · {allTotal} bills
                        </span>
                        <button
                            onClick={() => fetchAllReceipts(Math.min(allTotalPages, allPage + 1))}
                            disabled={allPage >= allTotalPages}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `Table ${viewing.tableNumber} · ${viewing.waiterName || 'No waiter'}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.mealName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
                payment={viewing ? paymentInfo(viewing) : null}
            />

            {/* ---- Process Payment modal ---- */}
            {selected && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-2">Process Payment</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {selected.billId} · Table {selected.tableNumber}
                            {selected.status === 'partial' && (
                                <span className="ml-2 text-blue-600 font-bold">· Partially paid</span>
                            )}
                        </p>

                        <div className="mb-1 text-3xl font-black text-orange-500">
                            KES {due.toLocaleString()}
                        </div>
                        {selected.amountPaid > 0 && (
                            <p className="text-xs text-gray-400 mb-6">
                                Balance due · KES {selected.amountPaid.toLocaleString()} already paid of KES {selected.subtotal.toLocaleString()}
                            </p>
                        )}
                        {!selected.amountPaid && <div className="mb-6" />}

                        {mpesaState === 'idle' && (
                            <>
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                            paymentMethod === 'cash'
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        <Wallet size={16} /> Cash
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('prompt')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                            paymentMethod === 'prompt'
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        <Smartphone size={16} /> Prompt
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('both')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                            paymentMethod === 'both'
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        <Layers size={16} /> Both
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('till')}
                                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold border transition-all shadow-xs text-[11px] ${
                                            paymentMethod === 'till'
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                                                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-500/40'
                                        }`}
                                    >
                                        <Landmark size={16} /> Till
                                    </button>
                                </div>

                                {paymentMethod === 'cash' && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                            Amount Received
                                        </label>
                                        <input
                                            type="number"
                                            value={amountPaid}
                                            onChange={(e) => setAmountPaid(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                            placeholder={due}
                                        />
                                        {amountPaid && (
                                            <p className={`text-sm font-medium mt-2 ${cashChange < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {cashChange < 0
                                                    ? `Short by KES ${Math.abs(cashChange).toLocaleString()} — cannot accept`
                                                    : `Change: KES ${cashChange.toFixed(2)}`}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {paymentMethod === 'prompt' && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                                Customer M-Pesa Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={mpesaPhone}
                                                onChange={(e) => setMpesaPhone(e.target.value)}
                                                placeholder="07XXXXXXXX"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Prompt amount: <span className="font-bold text-gray-700">KES {due.toLocaleString()}</span>
                                        </p>
                                    </div>
                                )}

                                {paymentMethod === 'both' && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                                Cash Received
                                            </label>
                                            <input
                                                type="number"
                                                value={cashPortion}
                                                onChange={(e) => setCashPortion(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                                placeholder="e.g. 300"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                                Customer M-Pesa Number (Prompt Portion)
                                            </label>
                                            <input
                                                type="tel"
                                                value={mpesaPhone}
                                                onChange={(e) => setMpesaPhone(e.target.value)}
                                                placeholder="07XXXXXXXX"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Prompt amount (auto): <span className="font-bold text-gray-700">KES {tillPortion.toLocaleString()}</span>
                                        </p>
                                    </div>
                                )}

                                {paymentMethod === 'till' && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                                Amount (partial or full)
                                            </label>
                                            <input
                                                type="number"
                                                value={tillAmount}
                                                onChange={(e) => setTillAmount(e.target.value)}
                                                placeholder={due}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                                                M-Pesa Code or Customer Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={tillReference}
                                                onChange={(e) => setTillReference(e.target.value)}
                                                placeholder="e.g. QGH7X8Y1Z or Jane Wanjiru"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {paymentMethod && (
                                    <div className="mb-6 border border-purple-100 bg-purple-50/50 rounded-xl p-3">
                                        <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={addReward}
                                                onChange={(e) => setAddReward(e.target.checked)}
                                            />
                                            This customer has an account — credit reward points
                                        </label>
                                        {addReward && (
                                            <input
                                                type="text"
                                                value={rewardIdentifier}
                                                onChange={(e) => setRewardIdentifier(e.target.value)}
                                                placeholder="Their registered email or phone"
                                                className="w-full mt-2 bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={resetPaymentState}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={
                                            paymentMethod === 'cash'
                                                ? handleCashPay
                                                : paymentMethod === 'till'
                                                ? handleTillPay
                                                : handleSendStk
                                        }
                                        disabled={
                                            !paymentMethod ||
                                            processing ||
                                            (paymentMethod === 'cash' && cashChange !== null && cashChange < 0)
                                        }
                                        className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {processing
                                            ? 'Processing…'
                                            : paymentMethod === 'cash' || paymentMethod === 'till'
                                            ? 'Confirm Payment'
                                            : 'Send Prompt'}
                                    </button>
                                </div>
                            </>
                        )}

                        {(mpesaState === 'sending' || mpesaState === 'pending') && (
                            <div className="text-center py-4">
                                <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
                                <p className="text-gray-700 font-bold mb-1">
                                    {mpesaState === 'sending' ? 'Sending prompt…' : 'Waiting for confirmation…'}
                                </p>
                                <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                                <button
                                    onClick={resetPaymentState}
                                    className="text-xs font-semibold text-gray-400 hover:text-red-500"
                                >
                                    Close (payment will still confirm in the background)
                                </button>
                            </div>
                        )}

                        {mpesaState === 'success' && (
                            <div className="text-center py-4">
                                <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                                <p className="text-gray-800 font-black">Payment Received</p>
                            </div>
                        )}

                        {mpesaState === 'failed' && (
                            <div className="text-center py-4">
                                <XCircle size={36} className="text-red-500 mx-auto mb-3" />
                                <p className="text-gray-700 font-bold mb-1">Payment not completed</p>
                                <p className="text-gray-400 text-sm mb-6">{mpesaMessage}</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={resetPaymentState}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRetryMpesa}
                                        className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors shadow-sm"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ---- Pay with customer reward modal ---- */}
            {rewardPayTarget && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-xl font-black text-gray-800 mb-1 flex items-center gap-2">
                            <Gift size={18} className="text-purple-500" /> Pay with Reward
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {rewardPayTarget.billId} · Balance KES {balanceDue(rewardPayTarget).toLocaleString()}
                        </p>
                        <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">
                            Customer Email or Phone
                        </label>
                        <input
                            type="text"
                            value={rewardPayIdentifier}
                            onChange={(e) => setRewardPayIdentifier(e.target.value)}
                            placeholder="Registered email or phone"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-6 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-400"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRewardPayTarget(null); setRewardPayIdentifier(''); }}
                                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayWithReward}
                                disabled={rewardPayProcessing}
                                className="flex-1 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {rewardPayProcessing ? 'Processing…' : 'Apply Points'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusPill({ status }) {
    const styles = {
        unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
        partial: 'bg-blue-50 text-blue-700 border-blue-200',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        voided: 'bg-red-50 text-red-600 border-red-200',
    };
    return (
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles[status] || styles.unpaid}`}>
            {status}
        </span>
    );
            }
