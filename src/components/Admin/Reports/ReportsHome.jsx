import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Calendar, Percent, RefreshCw, ClipboardList } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import ReportTable from './ReportTable';
import ShiftReportTable from './ShiftReportTable';

const TABS = [
    { id: 'daily', label: 'Daily', icon: CalendarDays },
    { id: 'monthly', label: 'Monthly', icon: Calendar },
    { id: 'tax', label: 'Tax (VAT)', icon: Percent },
    { id: 'shifts', label: 'Shifts', icon: ClipboardList },
];
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsHome() {
    const [tab, setTab] = useState('daily');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Independent controls per tab, so switching tabs doesn't lose your place
    const [date, setDate] = useState(todayStr());
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
        const [taxStart, setTaxStart] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    const [taxEnd, setTaxEnd] = useState(todayStr());
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const [shiftStart, setShiftStart] = useState(sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }));
    const [shiftEnd, setShiftEnd] = useState(todayStr());

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setData(null);
        try {
            let res;
            if (tab === 'daily') {
                res = await API.get('/reports/daily', { params: { date } });
            } else if (tab === 'monthly') {
                res = await API.get('/reports/monthly', { params: { month, year } });
            } else if (tab === 'tax') {
                res = await API.get('/reports/tax', { params: { startDate: taxStart, endDate: taxEnd } });
            } else {
                res = await API.get('/shifts/report', { params: { startDate: shiftStart, endDate: shiftEnd } });
            }
            setData(res.data);
        } catch (err) {
            console.error('Failed to load report', err);
            toast.error('Failed to load report');
        }
        setLoading(false);
    }, [tab, date, month, year, taxStart, taxEnd, shiftStart, shiftEnd]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Reports</h2>
                    <p className="text-sm text-gray-500">Daily, monthly, and tax breakdowns of paid bills</p>
                </div>
                <button
                    onClick={fetchReport}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            <div className="flex gap-2 border-b border-gray-200">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                            tab === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-end gap-3 mb-5">
                    {tab === 'daily' && (
                        <Field label="Date">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                        </Field>
                    )}
                    {tab === 'monthly' && (
                        <>
                            <Field label="Month">
                                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="input">
                                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                            </Field>
                            <Field label="Year">
                                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="input w-24" />
                            </Field>
                        </>
                    )}
                                        {tab === 'tax' && (
                        <>
                            <Field label="From">
                                <input type="date" value={taxStart} onChange={(e) => setTaxStart(e.target.value)} className="input" />
                            </Field>
                            <Field label="To">
                                <input type="date" value={taxEnd} onChange={(e) => setTaxEnd(e.target.value)} className="input" />
                            </Field>
                        </>
                    )}
                    {tab === 'shifts' && (
                        <>
                            <Field label="From">
                                <input type="date" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="input" />
                            </Field>
                            <Field label="To">
                                <input type="date" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="input" />
                            </Field>
                        </>
                    )}
                </div>

                {loading ? (
                    <p className="text-gray-400 text-sm text-center py-10">Loading…</p>
                ) : tab === 'shifts' ? (
                    data ? <ShiftReportTable shifts={data} /> : null
                ) : data ? (
                    <ReportTable rows={data.rows} totals={data.totals} periodLabel={tab === 'monthly' ? 'Day' : 'Date'} />
                ) : null}
            </div>

            <style>{`
                .input {
                    background: rgb(249 250 251);
                    border: 1px solid rgb(229 231 235);
                    border-radius: 0.75rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    color: rgb(31 41 55);
                }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
}