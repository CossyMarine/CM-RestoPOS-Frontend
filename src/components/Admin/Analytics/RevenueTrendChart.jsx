import { memo, useMemo } from "react";
import { Line } from "react-chartjs-2";
import "./chartSetup";
import { ChartSkeleton, ChartEmptyState } from "./ChartStates";

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Parses a "YYYY-MM-DD" string as local calendar date components, avoiding
// the UTC-midnight shift `new Date(isoString)` would introduce.
const formatDayLabel = (isoDate) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const month = date.toLocaleString("en-US", { month: "short" });
    return `${getOrdinal(d)} ${month}`;
};

function RevenueTrendChart({ data, loading }) {
    const { labels, values } = useMemo(() => {
        if (!data?.length) return { labels: [], values: [] };
        return {
            labels: data.map((d) => formatDayLabel(d.date)),
            values: data.map((d) => d.revenue),
        };
    }, [data]);

    const chartData = useMemo(
        () => ({
            labels,
            datasets: [
                {
                    label: "Daily Revenue (KES)",
                    data: values,
                    borderColor: "#f97316",
                    borderWidth: 2.5,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#f97316",
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.3,
                    backgroundColor: (context) => {
                        const { ctx, chartArea } = context.chart;
                        if (!chartArea) return "rgba(249, 115, 22, 0.15)";
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, "rgba(249, 115, 22, 0.25)");
                        gradient.addColorStop(1, "rgba(249, 115, 22, 0.01)");
                        return gradient;
                    },
                },
            ],
        }),
        [labels, values]
    );

    const options = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0f172a",
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => ` Revenue: KES ${ctx.parsed.y.toLocaleString()}`,
                    },
                },
            },
            scales: {
                y: {
                    grid: { borderDash: [4, 4], color: "#f1f5f9" },
                    ticks: { callback: (val) => `KES ${val / 1000}k` },
                },
                x: { grid: { display: false } },
            },
        }),
        []
    );

    if (loading) return <ChartSkeleton />;
    if (!data?.length || values.every((v) => v === 0)) {
        return <ChartEmptyState message="No revenue recorded in the last 30 days yet." />;
    }

    return (
        <div className="h-64 relative">
            <Line data={chartData} options={options} />
        </div>
    );
}

export default memo(RevenueTrendChart);