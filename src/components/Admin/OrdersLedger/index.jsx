import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import ViewItemsModal from '../ViewItemsModal';

import SummaryCards from './SummaryCards';
import TabsBar from './TabsBar';
import HistoryFilters from './HistoryFilters';
import OrdersTable from './OrdersTable';
import PaymentModal from './PaymentModal';
import RewardPayModal from './RewardPayModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function OrdersLedger() {
    const [tab, setTab] = useState('unpaid');
    const [unpaid, setUnpaid] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);

    // ---- Pending online orders (unclaimed) ----
    const [pendingOnline, setPendingOnline] = useState([]);
    const [waiters, setWaiters] = useState([]);
    const [claimBusy, setClaimBusy] = useState(false);

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
    const [bothMethod, setBothMethod] = useState('prompt'); // 'prompt' | 'till' — which leg pairs with cash under "Both"
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

    // ---- Pending online orders (not yet claimed by a waiter) ----
    const fetchPendingOnline = useCallback(async () => {
        try {
            const res = await API.get('/receipts/online-pending');
            setPendingOnline(res.data);
        } catch (err) {
            console.error('Failed to fetch pending online orders', err);
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
        fetchPendingOnline();
        API.get('/auth/waiters').then((res) => setWaiters(res.data)).catch(() => {});
    }, [fetchData, fetchSummary, fetchPendingOnline]);

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
            fetchPendingOnline();
            if (tab === 'all') fetchAllReceipts(allPage);
        });
        socket.on('order:created', ({ source } = {}) => {
            if (source === 'online') {
                fetchPendingOnline();
                toast.info('🔔 New online order awaiting a waiter');
            }
        });
        socket.on('order:updated', () => {
            fetchPendingOnline();
            fetchData();
        });
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

    // ---- Claim an online order on behalf of a waiter ----
    const handleClaimOnlineOrder = async (receipt, waiterName) => {
        if (!waiterName) return;
        setClaimBusy(true);
        try {
            await API.patch(`/orders/${receipt.order}/assign`, { waiterName });
            setPendingOnline((prev) => prev.filter((r) => r._id !== receipt._id));
            toast.success(`Assigned to ${waiterName}`);
            fetchData();
        } catch (err) {
            console.error('Failed to assign waiter', err);
            toast.error(err.response?.data?.message || 'Failed to assign waiter');
        }
        setClaimBusy(false);
    };

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
        setBothMethod('prompt');
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
        setProcessing(true);
        try {
            await API.post('/wallet/pay/manual', {
                receiptId: selected._id,
                amount: amt,
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

    const handleCashTillPay = async () => {
        const due = balanceDue(selected);
        const cashAmount = parseFloat(cashPortion);
        if (isNaN(cashAmount) || cashAmount <= 0 || cashAmount >= due) {
            toast.error('Cash amount must be more than 0 and less than the balance due');
            return;
        }
        setProcessing(true);
        try {
            await API.patch(`/receipts/${selected._id}/pay/cash-till`, { cashAmount });
            await maybeCreditReward(due);
            toast.success('Payment recorded');
            resetPaymentState();
            refreshAfterPayment();
        } catch (err) {
            console.error('Cash+Till payment failed', err);
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

    const rows = tab === 'unpaid'
        ? unpaid
        : tab === 'paid'
        ? paidList
        : tab === 'pending-online'
        ? pendingOnline
        : allReceipts;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Orders & Receipts</h2>
                    <p className="text-sm text-gray-500">Track unpaid bills and payment history</p>
                </div>
                <button
                    onClick={() => { fetchData(); fetchSummary(); fetchPendingOnline(); if (tab === 'all') fetchAllReceipts(allPage); }}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading || allLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <SummaryCards summary={summary} />

            <TabsBar
                tab={tab}
                onSelectTab={(t) => { setTab(t); if (t === 'all') fetchAllReceipts(1); }}
                unpaidCount={unpaid.length}
                paidCount={paidList.length}
                allTotal={allTotal}
                pendingOnlineCount={pendingOnline.length}
            />

            {tab === 'all' && (
                <HistoryFilters
                    search={search}
                    setSearch={setSearch}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                />
            )}

            <OrdersTable
                tab={tab}
                rows={rows}
                loading={loading}
                allLoading={allLoading}
                balanceDue={balanceDue}
                rowHighlight={rowHighlight}
                setViewing={setViewing}
                setSelected={setSelected}
                setRewardPayTarget={setRewardPayTarget}
                allPage={allPage}
                allTotalPages={allTotalPages}
                allTotal={allTotal}
                fetchAllReceipts={fetchAllReceipts}
                waiters={waiters}
                claimBusy={claimBusy}
                onClaim={handleClaimOnlineOrder}
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

            <PaymentModal
                selected={selected}
                due={due}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                cashPortion={cashPortion}
                setCashPortion={setCashPortion}
                mpesaPhone={mpesaPhone}
                setMpesaPhone={setMpesaPhone}
                tillAmount={tillAmount}
                setTillAmount={setTillAmount}
                bothMethod={bothMethod}
                setBothMethod={setBothMethod}
                processing={processing}
                mpesaState={mpesaState}
                mpesaMessage={mpesaMessage}
                cashChange={cashChange}
                tillPortion={tillPortion}
                addReward={addReward}
                setAddReward={setAddReward}
                rewardIdentifier={rewardIdentifier}
                setRewardIdentifier={setRewardIdentifier}
                resetPaymentState={resetPaymentState}
                handleCashPay={handleCashPay}
                handleTillPay={handleTillPay}
                handleCashTillPay={handleCashTillPay}
                handleSendStk={handleSendStk}
                handleRetryMpesa={handleRetryMpesa}
            />

            <RewardPayModal
                rewardPayTarget={rewardPayTarget}
                setRewardPayTarget={setRewardPayTarget}
                rewardPayIdentifier={rewardPayIdentifier}
                setRewardPayIdentifier={setRewardPayIdentifier}
                rewardPayProcessing={rewardPayProcessing}
                handlePayWithReward={handlePayWithReward}
                balanceDue={balanceDue}
            />
        </div>
    );
        }
