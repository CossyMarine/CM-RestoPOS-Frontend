import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { CheckCircle2, XCircle, Eye, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import PaymentDetailsModal from './PaymentDetailsModal';
import ConfirmModal from './ConfirmModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function PaymentConfirmationView({ onPendingChange }) {
    const [pending, setPending] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { entry, action }
    const [working, setWorking] = useState(false);
    const [viewing, setViewing] = useState(null);

    const fetchPending = useCallback(async () => {
        setPendingLoading(true);
        try {
            const res = await API.get('/payments/pending');
            setPending(res.data);
        } catch (err) {
            console.error('Failed to fetch pending payments', err);
            toast.error('Failed to load pending payments');
        }
        setPendingLoading(false);
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('receipt:manualPending', () => fetchPending());
        socket.on('receipt:manualPaymentResolved', () => fetchPending());
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runPendingAction = async () => {
        const { entry, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/payments/pending/${entry.receiptId}/${entry.paymentId}/${action}`);
            toast.success(action === 'confirm' ? 'Payment confirmed' : 'Payment rejected');
            setPendingAction(null);
            fetchPending();
            onPendingChange?.();
        } catch (err) {
            console.error('Failed to resolve pending payment', err);
            toast.error(err.response?.data?.message || 'Action failed');
        }
        setWorking(false);
    };

    const openViewer = async (receiptId) => {
        try {
            const res = await API.get(`/receipts/${receiptId}`);
            setViewing(res.data);
        } catch (err) {
            console.error('Failed to load bill', err);
            toast.error('Could not load bill details');
        }
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Payment Confirmation</h2>
                    <p className="text-sm text-gray-500">Till / M-Pesa payments waiting for verification</p>
                </div>
                <button
                    onClick={fetchPending}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={pendingLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                {pending.length === 0 ? (
                    <div className="text-center py-16">
                        <Clock size={28} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No payments waiting confirmation</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                    <th className="p-3">Bill ID</th>
                                    <th className="p-3">Table</th>
                                    <th className="p-3">Submitted By</th>
                                    <th className="p-3">Reference</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3">Submitted</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-600">
                                {pending.map((p) => (
                                    <tr key={p.paymentId} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                                        <td className="p-3 font-bold text-orange-500">{p.billId}</td>
                                        <td className="p-3 font-semibold text-gray-800">Table {p.tableNumber}</td>
                                        <td className="p-3 font-medium">{p.paidByName}</td>
                                        <td className="p-3 text-xs text-gray-500">{p.reference}</td>
                                        <td className="p-3 text-right font-bold text-gray-800">KES {Number(p.amount).toLocaleString()}</td>
                                        <td className="p-3 text-xs text-gray-400">{new Date(p.submittedAt).toLocaleString()}</td>
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

            <PaymentDetailsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                receipt={viewing}
            />

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