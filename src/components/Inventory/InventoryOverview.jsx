// src/components/Inventory/InventoryOverview.jsx
// InventoryOverview.jsx — top of file
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../api/axios';
import '../Admin/Analytics/chartSetup'
import { ChartSkeleton, ChartEmptyState } from '../Admin/Analytics/ChartStates';
import { kenyanDayBound } from '../../utils/formatDate';
import { formatKES, formatQty, formatShortDate, daysUntil } from './inventoryLabels';
import { Boxes, AlertTriangle, Clock, Wallet, PackagePlus, Trash2 } from 'lucide-react';
// A calm, repeating palette so the category chart never looks garish
// regardless of how many categories a restaurant has set up.
const CATEGORY_COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#6366f1'];

const isToday = (dateStr) => {
    const start = kenyanDayBound(new Date().toISOString().slice(0, 10), 'start');
    const end = kenyanDayBound(new Date().toISOString().slice(0, 10), 'end');
    const d = new Date(dateStr);
    return d >= start && d <= end;
};

export default function InventoryOverview({ onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({ currentStockValue: 0, lowStockCount: 0, lowStockItems: [] });
    const [expiring, setExpiring] = useState([]);
    const [receivedToday, setReceivedToday] = useState(0);
    const [wasteToday, setWasteToday] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const [itemsRes, summaryRes, expiringRes, receivingRes, wasteRes] = await Promise.all([
                    API.get('/inventory/items'),
                    API.get('/inventory/summary'),
                    API.get('/inventory/batches/expiring', { params: { days: 7 } }),
                    API.get('/inventory/receiving'),
                    API.get('/inventory/waste'),
                ]);

                if (cancelled) return;

                setItems(itemsRes.data || []);
                setSummary(summaryRes.data || {});
                setExpiring(expiringRes.data?.batches || []);

                const receivedValueToday = (receivingRes.data || [])
                    .filter((r) => r.status !== 'cancelled' && isToday(r.createdAt))
                    .reduce((sum, r) => sum + (r.items || []).reduce((s, i) => s + (i.totalCost || 0), 0), 0);
                setReceivedToday(receivedValueToday);

                const wasteValueToday = (wasteRes.data || [])
                    .filter((w) => w.status !== 'cancelled' && isToday(w.createdAt))
                    .reduce((sum, w) => sum + (w.totalValue || 0), 0);
                setWasteToday(wasteValueToday);
            } catch (err) {
                console.error('Failed to load inventory overview', err);
            }
            if (!cancelled) setLoading(false);
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const activeItems = useMemo(() => items.filter((i) => i.isActive !== false), [items]);

    const categoryChart = useMemo(() => {
        const byCategory = new Map();
        activeItems.forEach((item) => {
            const cat = item.category || 'General';
            const value = Number(item.currentStock || 0) * Number(item.costPerUnit || 0);
            byCategory.set(cat, (byCategory.get(cat) || 0) + value);
        });
        const entries = [...byCategory.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        return {
            labels: entries.map(([label]) => label),
            values: entries.map(([, value]) => value),
        };
    }, [activeItems]);

    const chartData = {
        labels: categoryChart.labels,
        datasets: [
            {
                data: categoryChart.values,
                backgroundColor: categoryChart.labels.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
                borderWidth: 0,
                hoverOffset: 6,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11, weight: 'bold' }, color: '#4b5563' } },
            tooltip: {
                backgroundColor: '#0f172a',
                padding: 10,
                cornerRadius: 8,
                callbacks: { label: (ctx) => ` ${ctx.label}: ${formatKES(ctx.parsed)}` },
            },
        },
    };

    const soonestExpiring = expiring.slice(0, 5);
    const lowStockPreview = (summary.lowStockItems || []).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <OverviewCard icon={Boxes} label="Total Stock Items" value={loading ? '—' : activeItems.length} />
                <OverviewCard
                    icon={AlertTriangle}
                    label="Low Stock"
                    value={loading ? '—' : summary.lowStockCount || 0}
                    tone={summary.lowStockCount > 0 ? 'warning' : 'default'}
                    onClick={() => onNavigate?.('stock', { status: 'low' })}
                />
                <OverviewCard
                    icon={Clock}
                    label="Expiring Soon"
                    value={loading ? '—' : expiring.length}
                    tone={expiring.length > 0 ? 'warning' : 'default'}
                    onClick={() => onNavigate?.('expiring')}
                />
                <OverviewCard icon={Wallet} label="Stock Value" value={loading ? '—' : formatKES(summary.currentStockValue)} />
                <OverviewCard icon={PackagePlus} label="Today's Received Stock" value={loading ? '—' : formatKES(receivedToday)} />
                <OverviewCard icon={Trash2} label="Today's Waste" value={loading ? '—' : formatKES(wasteToday)} tone={wasteToday > 0 ? 'danger' : 'default'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                        Where Your Stock Value Sits
                    </h3>
                    <p className="text-xs text-gray-400 mb-2 -mt-2">By category, based on what’s on hand right now</p>
                    {loading ? (
                        <ChartSkeleton height="h-72" />
                    ) : categoryChart.labels.length === 0 ? (
                        <ChartEmptyState height="h-72" message="Add stock to your ingredients to see value by category." />
                    ) : (
                        <div className="h-72 relative">
                            <Doughnut data={chartData} options={chartOptions} />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                            <h3 className="text-sm font-black text-gray-800">Running Low</h3>
                            <button onClick={() => onNavigate?.('stock', { status: 'low' })} className="text-[11px] font-bold text-orange-500 hover:text-orange-600">
                                View all
                            </button>
                        </div>
                        {lowStockPreview.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4 text-center font-medium">Everything’s above its low-stock level 👍</p>
                        ) : (
                            <ul className="space-y-2">
                                {lowStockPreview.map((i) => (
                                    <li key={i.id} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-700 truncate pr-2">{i.name}</span>
                                        <span className="text-orange-600 font-bold text-xs shrink-0">{formatQty(i.currentStock)} left</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                            <h3 className="text-sm font-black text-gray-800">Expiring Soon</h3>
                            <button onClick={() => onNavigate?.('expiring')} className="text-[11px] font-bold text-orange-500 hover:text-orange-600">
                                View all
                            </button>
                        </div>
                        {soonestExpiring.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4 text-center font-medium">Nothing expiring in the next 7 days</p>
                        ) : (
                            <ul className="space-y-2">
                                {soonestExpiring.map((b) => {
                                    const days = daysUntil(b.expiryDate);
                                    return (
                                        <li key={b._id} className="flex items-center justify-between text-sm">
                                            <div className="truncate pr-2">
                                                <p className="font-semibold text-gray-700 truncate">{b.inventoryItem?.name}</p>
                                                <p className="text-[11px] text-gray-400">{b.location?.name}</p>
                                            </div>
                                            <span className={`text-xs font-bold shrink-0 ${days <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
                                                {days <= 0 ? 'Today' : `${days}d · ${formatShortDate(b.expiryDate)}`}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function OverviewCard({ icon: Icon, label, value, tone = 'default', onClick }) {
    const toneClasses = {
        default: 'bg-white border-gray-200',
        warning: 'bg-amber-50 border-amber-200',
        danger: 'bg-red-50 border-red-200',
    }[tone];

    const iconToneClasses = {
        default: 'bg-orange-50 text-orange-500',
        warning: 'bg-amber-100 text-amber-600',
        danger: 'bg-red-100 text-red-600',
    }[tone];

    const Wrapper = onClick ? 'button' : 'div';

    return (
        <Wrapper
            onClick={onClick}
            className={`text-left border rounded-2xl p-4 shadow-sm ${toneClasses} ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconToneClasses}`}>
                <Icon size={16} />
            </div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">{label}</p>
            <p className="text-xl font-black text-gray-800 mt-0.5 truncate">{value}</p>
        </Wrapper>
    );
}