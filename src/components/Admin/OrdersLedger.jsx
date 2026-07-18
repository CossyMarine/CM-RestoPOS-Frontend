import { useState, useEffect } from 'react';
import { Eye, RefreshCw, Wallet, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ViewItemsModal from './ViewItemsModal';

export default function OrdersLedger() {
    const [tab, setTab] = useState('unpaid');
    const [unpaid, setUnpaid] = useState([]);
    const [paidList, setPaidList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [processing, setProcessing] = useState(false);
    const [viewing, setViewing] = useState(null);

    const fetchData = async () => {
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
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePay = async () => {
        setProcessing(true);
        try {
            await API.patch(`/receipts/${selected._id}/pay`, {
                paymentMethod,
                amountPaid: parseFloat(amountPaid) || selected.subtotal,
            });
            toast.success('Payment recorded');
            setSelected(null);
            setPaymentMethod('');
            setAmountPaid('');
            fetchData();
        } catch (err) {
            console.error('Payment failed', err);
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const rows = tab === 'unpaid' ? unpaid : paidList;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white">Orders & Receipts</h2>
                    <p className="text-sm text-gray-500">Track unpaid bills and payment history</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 hover:border-orange-500/40 text-gray-400 hover:text-orange-400 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="flex gap-2">
                {['unpaid', 'paid'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${
                            tab === t ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                        }`}
                    >
                        {t} ({t === 'unpaid' ? unpaid.length : paidList.length})
                    </button>
                ))}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-500 font-semibold border-b border-gray-800">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Table</th>
                                <th className="p-3">Waiter</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/70 text-gray-300">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-gray-600">
                                        No {tab} receipts
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r._id} className="hover:bg-gray-800/40 transition-colors">
                                        <td className="p-3 font-bold text-orange-400">{r.billId}</td>
                                        <td className="p-3 font-semibold">Table {r.tableNumber}</td>
                                        <td className="p-3">{r.waiterName || '—'}</td>
                                        <td className="p-3 font-bold text-white">KES {r.subtotal.toLocaleString()}</td>
                                        <td className="p-3 text-xs text-gray-500">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewing(r)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-400 text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            {tab === 'unpaid' && (
                                                <button
                                                    onClick={() => setSelected(r)}
                                                    className="text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors"
                                                >
                                                    Pay
                                                </button>
                                            )}
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

            {selected && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md">
                        <h3 className="text-xl font-black text-white mb-2">Process Payment</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {selected.billId} · Table {selected.tableNumber}
                        </p>

                        <div className="text-3xl font-black text-orange-500 mb-6">
                            KES {selected.subtotal.toLocaleString()}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold border transition-colors ${
                                    paymentMethod === 'cash'
                                        ? 'bg-orange-500 border-orange-500 text-white'
                                        : 'border-gray-700 text-gray-400 hover:border-orange-500/40'
                                }`}
                            >
                                <Wallet size={16} /> Cash
                            </button>
                            <button
                                onClick={() => setPaymentMethod('mpesa_till')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold border transition-colors ${
                                    paymentMethod === 'mpesa_till'
                                        ? 'bg-orange-500 border-orange-500 text-white'
                                        : 'border-gray-700 text-gray-400 hover:border-orange-500/40'
                                }`}
                            >
                                <Smartphone size={16} /> M-Pesa Till
                            </button>
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="mb-6">
                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block">
                                    Amount Received
                                </label>
                                <input
                                    type="number"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
                                    placeholder={selected.subtotal}
                                />
                                {amountPaid && (
                                    <p className="text-emerald-400 text-sm mt-2">
                                        Change: KES {(parseFloat(amountPaid) - selected.subtotal).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelected(null); setPaymentMethod(''); setAmountPaid(''); }}
                                className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePay}
                                disabled={!paymentMethod || processing}
                                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Processing…' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
