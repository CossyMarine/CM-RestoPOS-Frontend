// src/components/Accountant/AccountantOrdersLedger.jsx
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ViewItemsModal from '../Admin/ViewItemsModal';
import SummaryCards from '../Admin/OrdersLedger/SummaryCards';
import HistoryFilters from '../Admin/OrdersLedger/HistoryFilters';
import OrdersTable from '../Admin/OrdersLedger/OrdersTable';
import ComboPayModal from '../Admin/OrdersLedger/ComboPayModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function AccountantOrdersLedger({ shiftOpen }) {
    const [tab, setTab] = useState('unpaid');
    const [unpaid, setUnpaid] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [paying, setPaying] = useState(null); // receipt selected for ComboPayModal

    const [allReceipts, setAllReceipts] = useState([]);
    const [allPage, setAllPage] = useState(1);
    const [allTotalPages, setAllTotalPages] = useState(1);
    const [allTotal, setAllTotal] = useState(0);
    const [allLoading, setAllLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [summary, setSummary] = useState({ paidToday: 0, paidTodayCount: 0, unpaidToday: 0, unpaidTodayCount: 0 });

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

    // Load unpaid, paid, AND the "all" count/list up front — so the tab badge
    // is accurate the moment the page mounts, not just after it's clicked.
    useEffect(() => {
        fetchData();
        fetchSummary();
        fetchAllReceipts(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, fetchSummary]);

    useEffect(() => {
        if (tab !== 'all') return;
        const t = setTimeout(() => fetchAllReceipts(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, search, dateFrom, dateTo]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('receipt:paid', () => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); });
        socket.on('receipt:updated', () => { fetchData(); fetchAllReceipts(allPage); });
        socket.on('order:created', () => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); });
        socket.on('order:updated', () => { fetchData(); fetchAllReceipts(allPage); });
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const balanceDue = (r) => Number((r.subtotal - (r.amountPaid || 0)).toFixed(2));

    const rowHighlight = (status) => {
        if (status === 'paid') return 'bg-emerald-50/40 hover:bg-emerald-50/70';
        if (status === 'voided') return 'bg-red-50/40 hover:bg-red-50/70';
        if (status === 'partial') return 'bg-blue-50/40 hover:bg-blue-50/70';
        return 'bg-amber-50/40 hover:bg-amber-50/70';
    };

    const openPay = (r) => {
        if (!shiftOpen) { toast.error('Open your shift before processing payments'); return; }
        setPaying(r);
    };

    const paymentInfo = (r) =>
        r.status === 'paid' || r.status === 'partial'
            ? { method: r.paymentMethod, cashAmount: r.cashAmount, tillAmount: r.tillAmount, amountPaid: r.amountPaid, changeGiven: r.changeGiven, mpesaReceiptNumber: r.mpesaReceiptNumber, paidAt: r.paidAt }
            : null;

    const rows = tab === 'unpaid' ? unpaid : tab === 'paid' ? paidList : allReceipts;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Orders & Receipts</h2>
                    <p className="text-sm text-gray-500">View bills and process payments</p>
                </div>
                <button
                    onClick={() => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); }}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading || allLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <SummaryCards summary={summary} />

            <div className="flex gap-2 flex-wrap">
                {['unpaid', 'paid', 'all'].map((t) => (
                    <button
                        key={t}
                        onClick={() => { setTab(t); if (t === 'all') fetchAllReceipts(1); }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                            tab === t ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10' : 'bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm'
                        }`}
                    >
                        {t === 'all' ? `All (${allTotal})` : `${t} (${t === 'unpaid' ? unpaid.length : paidList.length})`}
                    </button>
                ))}
            </div>

            {tab === 'all' && (
                <HistoryFilters search={search} setSearch={setSearch} dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
            )}

            <OrdersTable
                tab={tab}
                rows={rows}
                loading={loading}
                allLoading={allLoading}
                balanceDue={balanceDue}
                rowHighlight={rowHighlight}
                setViewing={setViewing}
                setSelected={openPay}
                setRewardPayTarget={() => {}}
                showRewardButton={false}
                allPage={allPage}
                allTotalPages={allTotalPages}
                allTotal={allTotal}
                fetchAllReceipts={fetchAllReceipts}
            />

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `Table ${viewing.tableNumber} · ${viewing.waiterName || 'No waiter'}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.mealName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
                payment={viewing ? paymentInfo(viewing) : null}
            />

            <ComboPayModal
                receipt={paying}
                onClose={() => setPaying(null)}
                onPaid={() => { fetchData(); fetchSummary(); fetchAllReceipts(allPage); }}
            />
        </div>
    );
                           }
