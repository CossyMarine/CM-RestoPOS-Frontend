import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

export default function AccountantPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [revenue, setRevenue] = useState({ totalRevenue: 0, paidReceiptsCount: 0 });
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [revRes, receiptsRes] = await Promise.all([
                API.get('/revenue/today'),
                API.get('/receipts/paid'),
            ]);
            setRevenue(revRes.data);
            setReceipts(receiptsRes.data);
        } catch (err) {
            console.error('Failed to fetch accountant data', err);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🍴</span>
                    <span className="font-black text-lg">Resto<span className="text-orange-500">POS</span> <span className="text-gray-500 font-semibold text-sm">Accounts</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">👤 {user?.fullName}</span>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Today's Revenue</p>
                        <p className="text-3xl font-black text-orange-500">{formatCurrency(revenue.totalRevenue)}</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Paid Receipts Today</p>
                        <p className="text-3xl font-black text-white">{revenue.paidReceiptsCount}</p>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black">Paid Receipts</h2>
                        <button onClick={fetchData} className="text-gray-400 hover:text-white text-sm">↻ Refresh</button>
                    </div>

                    {loading ? (
                        <div className="text-center text-gray-600 py-16">Loading…</div>
                    ) : receipts.length === 0 ? (
                        <div className="text-center text-gray-600 py-16">
                            <div className="text-5xl mb-3">🧾</div>
                            <div className="font-bold">No paid receipts yet</div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {receipts.map((r) => (
                                <div key={r._id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-orange-400">{r.billId}</span>
                                            <span className="text-gray-500 text-sm ml-2">Table {r.tableNumber}</span>
                                        </div>
                                        <span className="font-black text-white">{formatCurrency(r.subtotal)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                        <span>Waiter: {r.waiterName} · {r.paymentMethod}</span>
                                        <span>{r.paidAt ? formatDate(r.paidAt) : ''}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
