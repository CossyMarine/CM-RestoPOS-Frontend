import { memo, useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import "./chartSetup";
import { ChartSkeleton, ChartEmptyState } from "./ChartStates";

const COLORS = ["#f97316", "#0f172a", "#10b981"];

function TopMealsChart({ data, loading }) {
    const chartData = useMemo(() => {
        if (!data?.length) return null;
        return {
            labels: data.map((m) => `${m.name} (${m.orders} orders)`),
            datasets: [
                {
                    data: data.map((m) => m.orders),
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
                        label: (ctx) => ` Total Orders: ${ctx.parsed}`,
                    },
                },
            },
        }),
        []
    );

    if (loading) return <ChartSkeleton />;
    if (!data?.length) {
        return <ChartEmptyState message="No meals sold yet — data will appear once orders are paid." />;
    }

    return (
        <>
            <div className="h-64 relative my-4 flex justify-center items-center">
                <Doughnut data={chartData} options={options} />
            </div>
            <ol className="space-y-2">
                {data.map((meal, i) => (
                    <li
                        key={meal.name}
                        className="flex items-center justify-between text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0"
                                style={{ backgroundColor: COLORS[i] }}
                            >
                                {i + 1}
                            </span>
                            <span className="font-semibold text-gray-700">{meal.name}</span>
                        </div>
                        <span className="text-gray-400 font-medium">
                            {meal.orders} orders · {meal.percentage}%
                        </span>
                    </li>
                ))}
            </ol>
        </>
    );
}

export default memo(TopMealsChart);