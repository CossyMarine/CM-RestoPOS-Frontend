import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

export default function KitchenShiftBar() {
    const [shift, setShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const fetchShift = async () => {
        try {
            const res = await API.get('/shifts/current');
            setShift(res.data);
        } catch {
            setShift(null);
        }
        setLoading(false);
    };

    useEffect(() => { fetchShift(); }, []);

    const handleOpen = async () => {
        setBusy(true);
        try {
            const res = await API.post('/shifts/open', {});
            setShift(res.data);
            toast.success('Shift started');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not start shift');
        }
        setBusy(false);
    };

    const handleClose = async () => {
        setBusy(true);
        try {
            await API.post(`/shifts/${shift._id}/close`, {});
            setShift(null);
            toast.success('Shift ended');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not end shift');
        }
        setBusy(false);
    };

    if (loading) return null;

    if (!shift) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
                    <Clock size={16} /> No shift started — start one to begin working
                </div>
                <button
                    onClick={handleOpen}
                    disabled={busy}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                    <LogIn size={14} /> Start Shift
                </button>
            </div>
        );
    }

    return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <Clock size={16} /> On shift since {new Date(shift.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
                onClick={handleClose}
                disabled={busy}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            >
                <LogOut size={14} /> End Shift
            </button>
        </div>
    );
}