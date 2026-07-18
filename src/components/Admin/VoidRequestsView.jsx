import { useState, useEffect } from 'react';
import { Eye, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import ViewItemsModal from './ViewItemsModal';

export default function VoidRequestsView() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { request, action }
    const [working, setWorking] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await API.get('/void-requests');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch void requests', err);
            toast.error('Failed to load void requests');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const runAction = async () => {
        const { request, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/void-requests/${request._id}/${action}`);
            toast.success(action === 'approve' ? 'Void approved — receipt voided' : 'Void request rejected');
            setPendingAction(null);
            fetchRequests();
        } catch (err) {
            console.error('Failed to update void request', err);
            toast.error('Action failed');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white">Void Authorization Requests</h2>
                    <p className="text-sm text-gray-500">Approve or reject requests to void a receipt</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 hover:border-orange-500/40 text-gray-400 hover:text-orange-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-500 font-semibold border-b border-gray-800">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Table</th>
                                <th className="p-3">Requested By</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Reason</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/70 text-gray-300">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-600">
                                        No pending void requests
                                    </td>
                                </tr>
                            ) : (
                                requests.map((v) => (
                                    <tr key={v._id} className="hover:bg-gray-800/40 transition-colors">
                                        <td className="p-3 font-bold text-orange-400">{v.receipt?.billId}</td>
                                        <td className="p-3 font-semibold">Table {v.receipt?.tableNumber}</td>
                                        <td className="p-3">{v.requestedBy?.fullName || '—'}</td>
                                        <td className="p-3 text-xs text-gray-500">
                                            {new Date(v.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-xs italic text-amber-300 max-w-xs truncate" title={v.reason}>
                                            {v.reason}
                                        </td>
                                        <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewing(v.receipt)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-400 text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            <button
                                                onClick={() => setPendingAction({ request: v, action: 'approve' })}
                                                className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                                            >
                                                Approve Void
                                            </button>
                                            <button
                                                onClick={() => setPendingAction({ request: v, action: 'reject' })}
                                                className="text-gray-400 hover:text-white text-xs font-bold transition-colors"
                                            >
                                                Reject
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
                subtitle={viewing ? `Table ${viewing.tableNumber}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.mealName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
            />

            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'approve' ? 'Approve void?' : 'Reject void request?'}
                description={
                    pendingAction?.action === 'approve'
                        ? `This permanently voids receipt ${pendingAction?.request?.receipt?.billId}. Revenue for this bill will no longer count.`
                        : `The receipt stays active and returns to the ledger.`
                }
                confirmLabel={pendingAction?.action === 'approve' ? 'Approve & Void' : 'Reject'}
                tone={pendingAction?.action === 'approve' ? 'danger' : 'default'}
                loading={working}
                onConfirm={runAction}
                onClose={() => setPendingAction(null)}
            />
        </div>
    );
}
