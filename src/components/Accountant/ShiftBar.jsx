import { useState, useEffect, useCallback } from 'react';
import { Clock, LockKeyhole, Unlock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

export default function ShiftBar({ onShiftChange }) {
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOpen, setShowOpen] = useState(false);
    const [showClose, setShowClose] = useState(false);
    const [openingFloat, setOpeningFloat] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    // ---- Close-shift reconciliation state ----
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [countedCash, setCountedCash] = useState('');
    const [countedTill, setCountedTill] = useState('');
    const [tipsDeclared, setTipsDeclared] = useState('');
    const [ackVariance, setAckVariance] = useState(false);

    const hasCash = countedCash !== '' && !isNaN(countedCash);
    const hasTill = countedTill !== '' && !isNaN(countedTill);
    const cashVariance = preview && hasCash ? Number(countedCash) - preview.expectedCash : null;
    const tillVariance = preview && hasTill ? Number(countedTill) - preview.expectedTill : null;
    const hasVariance = (cashVariance !== null && cashVariance !== 0) || (tillVariance !== null && tillVariance !== 0);
    const readyToClose = hasCash && hasTill && (!hasVariance || ackVariance);

    const fetchShift = useCallback(async () => {
        try {
            const res = await API.get('/shifts/current');
            setShift(res.data);
            onShiftChange?.(res.data);
        } catch (err) {
            console.error('Failed to fetch shift', err);
        }
        setLoading(false);
    }, [onShiftChange]);

    useEffect(() => { fetchShift(); }, [fetchShift]);

    const handleOpen = async () => {
        setBusy(true);
        try {
            await API.post('/shifts/open', { openingFloat: parseFloat(openingFloat) || 0 });
            toast.success('Shift opened');
            setShowOpen(false);
            setOpeningFloat('');
            fetchShift();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not open shift');
        }
        setBusy(false);
    };

    const openCloseModal = async () => {
        setShowClose(true);
        setCountedCash('');
        setCountedTill('');
        setTipsDeclared('');
        setAckVariance(false);
        setPreview(null);
        setPreviewLoading(true);
        try {
            const res = await API.get(`/shifts/${shift._id}/summary`);
            setPreview(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load shift totals');
        }
        setPreviewLoading(false);
    };

    const handleClose = async () => {
        if (!readyToClose) return;
        setBusy(true);
        try {
            await API.post(`/shifts/${shift._id}/close`, {
                closingCashCount: Number(countedCash),
                closingTillCount: Number(countedTill),
                tipsDeclared: Number(tipsDeclared) || 0,
                notes,
            });
            toast.success('Shift closed');
            setShowClose(false);
            setNotes('');
            fetchShift();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not close shift');
        }
        setBusy(false);
    };

    if (loading) return null;

    return (
        <>
            <div className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-6 border ${
                shift ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                    {shift ? <Unlock size={16} className="text-emerald-600" /> : <LockKeyhole size={16} className="text-amber-600" />}
                    {shift ? (
                        <span className="text-emerald-700">
                            Shift open · started {new Date(shift.createdAt).toLocaleTimeString()}
                        </span>
                    ) : (
                        <span className="text-amber-700">No shift open</span>
                    )}
                </div>
                {shift ? (
                    <button onClick={openCloseModal} className="flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        <Clock size={13} /> Close Shift
                    </button>
                ) : (
                    <button onClick={() => setShowOpen(true)} className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        <Unlock size={13} /> Open Shift
                    </button>
                )}
            </div>

            {showOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl">
                        <h3 className="text-xl font-black text-gray-800 mb-4">Open Shift</h3>
                        <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Opening Float (cash in drawer)</label>
                        <input
                            type="number"
                            value={openingFloat}
                            onChange={(e) => setOpeningFloat(e.target.value)}
                            placeholder="0"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-6 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors">Cancel</button>
                            <button onClick={handleOpen} disabled={busy} className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50">
                                {busy ? 'Opening…' : 'Open Shift'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClose && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-xl my-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-4">Close Shift</h3>

                        {previewLoading ? (
                            <p className="text-gray-400 text-sm text-center py-6">Loading shift totals…</p>
                        ) : preview ? (
                            <>
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-500">Expected cash</span><span className="font-bold text-gray-800">{fmt(preview.expectedCash)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">Expected till</span><span className="font-bold text-gray-800">{fmt(preview.expectedTill)}</span></div>
                                </div>

                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Counted Cash (physical count)</label>
                                <input
                                    type="number"
                                    value={countedCash}
                                    onChange={(e) => setCountedCash(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                />

                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Counted Till (M-Pesa / till count)</label>
                                <input
                                    type="number"
                                    value={countedTill}
                                    onChange={(e) => setCountedTill(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                />

                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Tips Declared</label>
                                <input
                                    type="number"
                                    value={tipsDeclared}
                                    onChange={(e) => setTipsDeclared(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500"
                                />

                                <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block font-bold">Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 mb-5" rows={2} />

                                {(hasCash || hasTill) && (
                                    <div className={`rounded-xl p-4 mb-5 border ${hasVariance ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-sm font-bold">
                                            {hasVariance ? <AlertTriangle size={15} className="text-red-600" /> : <CheckCircle2 size={15} className="text-emerald-600" />}
                                            <span className={hasVariance ? 'text-red-700' : 'text-emerald-700'}>
                                                {hasVariance ? 'Variance detected' : 'Counts match expected'}
                                            </span>
                                        </div>
                                        {hasCash && (
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-500">Cash variance</span>
                                                <span className={`font-bold ${cashVariance === 0 ? 'text-gray-700' : cashVariance > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {cashVariance > 0 ? '+' : ''}{fmt(cashVariance)}
                                                </span>
                                            </div>
                                        )}
                                        {hasTill && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-500">Till variance</span>
                                                <span className={`font-bold ${tillVariance === 0 ? 'text-gray-700' : tillVariance > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {tillVariance > 0 ? '+' : ''}{fmt(tillVariance)}
                                                </span>
                                            </div>
                                        )}
                                        {hasVariance && (
                                            <label className="flex items-start gap-2 mt-3 text-xs text-red-700 font-semibold">
                                                <input type="checkbox" checked={ackVariance} onChange={(e) => setAckVariance(e.target.checked)} className="mt-0.5" />
                                                I've recounted and confirm this variance is correct
                                            </label>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setShowClose(false)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors">Cancel</button>
                                    <button onClick={handleClose} disabled={busy || !readyToClose} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {busy ? 'Closing…' : 'Close Shift'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-red-500 text-sm text-center py-6">Could not load shift totals. Try again.</p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}