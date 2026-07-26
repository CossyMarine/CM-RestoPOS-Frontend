import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Clock, Unlock, LockKeyhole, ChevronLeft, Printer } from 'lucide-react';
import API from '../../api/axios';

const PERMISSION_LABELS = {
    inventory: 'Inventory',
    manageMenu: 'Manage Menu',
    ordersReceipts: 'Orders & Receipts',
    voidRequests: 'Void Requests',
    users: 'Users',
    settings: 'Settings',
    waiterManagement: 'Waiter Management',
    kitchen: 'Kitchen',
    payments: 'Payments',
};

export default function AccountantManagement() {
    const [accountants, setAccountants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [savingPerm, setSavingPerm] = useState(false);

    // ---- Allow printing during payment (global setting) ----
    const [allowPrinting, setAllowPrinting] = useState(false);
    const [printSettingLoading, setPrintSettingLoading] = useState(true);
    const [printSettingSaving, setPrintSettingSaving] = useState(false);

    const fetchPrintSetting = useCallback(async () => {
        setPrintSettingLoading(true);
        try {
            const res = await API.get('/settings');
            setAllowPrinting(!!res.data.allowPrintingDuringPayment);
        } catch (err) {
            console.error('Failed to fetch print setting', err);
        }
        setPrintSettingLoading(false);
    }, []);

    useEffect(() => { fetchPrintSetting(); }, [fetchPrintSetting]);

    const togglePrintSetting = async () => {
        const next = !allowPrinting;
        setPrintSettingSaving(true);
        try {
            await API.patch('/settings', { allowPrintingDuringPayment: next });
            setAllowPrinting(next);
            toast.success(`Printing during payment ${next ? 'enabled' : 'disabled'}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update setting');
        }
        setPrintSettingSaving(false);
    };

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/accountants');
            setAccountants(res.data);
        } catch (err) {
            console.error('Failed to fetch accountants', err);
            toast.error('Failed to load accountants');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    const fetchDetail = useCallback(async (id) => {
        setDetailLoading(true);
        try {
            const params = {};
            if (dateFrom) params.from = new Date(dateFrom).toISOString();
            if (dateTo) params.to = new Date(dateTo).toISOString();
            const res = await API.get(`/accountants/${id}/stats`, { params });
            setDetail(res.data);
        } catch (err) {
            console.error('Failed to fetch accountant detail', err);
            toast.error('Failed to load accountant details');
        }
        setDetailLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFrom, dateTo]);

    useEffect(() => {
        if (selectedId) fetchDetail(selectedId);
    }, [selectedId, fetchDetail]);

    const togglePermission = async (key) => {
        if (!detail) return;
        const next = { ...detail.accountant.permissions, [key]: !detail.accountant.permissions[key] };
        setSavingPerm(true);
        try {
            await API.patch(`/accountants/${selectedId}/permissions`, { permissions: next });
            setDetail((d) => ({ ...d, accountant: { ...d.accountant, permissions: next } }));
            toast.success('Permissions updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update permissions');
        }
        setSavingPerm(false);
    };

    // ---- Detail view ----
    if (selectedId) {
        return (
            <div className="space-y-6 bg-gray-50 text-gray-800">
                <button onClick={() => { setSelectedId(null); setDetail(null); }} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-orange-500">
                    <ChevronLeft size={16} /> Back to Accountants
                </button>

                {detailLoading || !detail ? (
                    <div className="text-center text-gray-400 py-16">Loading…</div>
                ) : (
                    <>
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-gray-800">{detail.accountant.fullName}</h2>
                                <p className="text-sm text-gray-500">{detail.accountant.email || detail.accountant.phone}</p>
                            </div>
                            <div className="flex gap-2">
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                ['Cash', detail.totals.cash],
                                ['Till', detail.totals.till],
                                ['Prompt', detail.totals.prompt],
                                ['Reward', detail.totals.reward],
                            ].map(([label, val]) => (
                                <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-2xl font-black text-gray-800">KES {val.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500">
                            Grand total <span className="font-bold text-gray-800">KES {detail.grandTotal.toLocaleString()}</span> across {detail.transactionCount} transactions
                        </p>

                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-black text-gray-800 mb-4">Module Access</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!detail.accountant.permissions?.[key]}
                                            disabled={savingPerm}
                                            onChange={() => togglePermission(key)}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-black text-gray-800 mb-4">Shift History</h3>
                            {detail.shifts.length === 0 ? (
                                <p className="text-gray-400 text-sm">No shifts recorded yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {detail.shifts.map((s) => (
                                        <div key={s._id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                {s.status === 'open' ? <Unlock size={14} className="text-emerald-500" /> : <LockKeyhole size={14} className="text-gray-400" />}
                                                <span className="font-semibold">{new Date(s.createdAt).toLocaleString()}</span>
                                            </div>
                                            <span className="text-gray-400 flex items-center gap-1">
                                                <Clock size={12} />
                                                {s.status === 'open' ? 'Still open' : `Closed ${new Date(s.closedAt).toLocaleString()}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ---- List view ----
    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Accountants</h2>
                    <p className="text-sm text-gray-500">Manage access and review processed payments</p>
                </div>
                <button
                    onClick={togglePrintSetting}
                    disabled={printSettingLoading || printSettingSaving}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-colors disabled:opacity-50 ${
                        allowPrinting
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-400'
                    }`}
                >
                    <Printer size={16} />
                    {printSettingSaving
                        ? 'Saving…'
                        : allowPrinting
                        ? 'Printing on Payment: ON'
                        : 'Printing on Payment: OFF'}
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                {loading ? (
                    <div className="text-center text-gray-400 py-16">Loading…</div>
                ) : accountants.length === 0 ? (
                    <div className="text-center text-gray-400 py-16">No accountant accounts yet</div>
                ) : (
                    <div className="space-y-3">
                        {accountants.map((a) => (
                            <button
                                key={a._id}
                                onClick={() => setSelectedId(a._id)}
                                className="w-full flex items-center justify-between bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-xl p-4 text-left transition-colors"
                            >
                                <div>
                                    <p className="font-bold text-gray-800">{a.fullName}</p>
                                    <p className="text-xs text-gray-400">{a.email || a.phone}</p>
                                </div>
                                <div className="text-right text-xs">
                                    {a.lastShift ? (
                                        a.lastShift.status === 'open' ? (
                                            <span className="text-emerald-600 font-bold flex items-center gap-1"><Unlock size={12} /> Shift open</span>
                                        ) : (
                                            <span className="text-gray-400">Last closed {new Date(a.lastShift.closedAt).toLocaleString()}</span>
                                        )
                                    ) : (
                                        <span className="text-gray-300">No shifts yet</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
                }
