import { memo, useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import "./chartSetup";
import { ChartSkeleton, ChartEmptyState } from "./ChartStates";

const COLORS = ["#cbd5e1", "#94a3b8", "#64748b", "#334155", "#f97316", "#fb923c", "#fdba74"];

const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
        const opts = chart.config.options.plugins?.centerText;
        const { ctx, chartArea } = chart;
        if (!chartArea || !opts?.text) return;
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 11px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(opts.label || "", x, y - 10);
        ctx.font = "800 18px sans-serif";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(opts.text, x, y + 12);
        ctx.restore();
    },
};

function WeeklyPerformanceChart({ data, loading }) {
    const totalRevenue = useMemo(() => (data || []).reduce((sum, d) => sum + d.revenue, 0), [data]);

    const chartData = useMemo(() => {
        if (!data?.length) return null;
        return {
            labels: data.map((d) => `${d.day} (${d.orders} orders)`),
            datasets: [
                {
                    data: data.map((d) => d.revenue),
                    backgroundColor: COLORS.slice(0, data.length),
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            ],
        };
    }, [data]);

    const options = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            animation: { duration: 600, easing: "easeOutQuart" },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const day = data[ctx.dataIndex];
                            return ` KES ${ctx.parsed.toLocaleString()} (${day.orders} orders)`;
                        },
                    },
                },
                centerText: { text: `KES ${(totalRevenue / 1000).toFixed(0)}k`, label: "This Week" },
            },
        }),
        [data, totalRevenue]
    );

    if (loading) return <ChartSkeleton />;
    if (!data?.length || totalRevenue === 0) {
        return <ChartEmptyState message="No paid orders recorded yet this week." />;
    }

    return (
        <div className="h-64 relative my-4 flex justify-center items-center">
            <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
        </div>
    );
}

export default memo(WeeklyPerformanceChart);