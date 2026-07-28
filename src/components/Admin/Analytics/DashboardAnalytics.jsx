import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { getRevenueTrend, getWeeklyPerformance, getTopMeals } from "../../../api/analyticsApi";
import { ChartSkeleton } from "./ChartStates";

const RevenueTrendChart = lazy(() => import("./RevenueTrendChart"));
const WeeklyPerformanceChart = lazy(() => import("./WeeklyPerformanceChart"));
const TopMealsChart = lazy(() => import("./TopMealsChart"));

export default function DashboardAnalytics() {
    const [trend, setTrend] = useState(null);
    const [weekly, setWeekly] = useState(null);
    const [topMeals, setTopMeals] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        const [trendRes, weeklyRes, mealsRes] = await Promise.allSettled([
            getRevenueTrend(),
            getWeeklyPerformance(),
            getTopMeals(),
        ]);

        setTrend(trendRes.status === "fulfilled" ? trendRes.value : []);
        setWeekly(weeklyRes.status === "fulfilled" ? weeklyRes.value : []);
        setTopMeals(mealsRes.status === "fulfilled" ? mealsRes.value : []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <>
            {/* 30-Day Revenue Trend */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-gray-800">30-Day Revenue Trend</h3>
                        <p className="text-xs text-gray-400">Daily revenue totals over the past month</p>
                    </div>
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                        Last 30 Days
                    </span>
                </div>
                <Suspense fallback={<ChartSkeleton />}>
                    <RevenueTrendChart data={trend} loading={loading} />
                </Suspense>
            </div>

            {/* Weekly Performance & Top 3 Meals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-800">Weekly Performance</h3>
                        <p className="text-xs text-gray-400">Revenue contribution and order volume per day</p>
                    </div>
                    <Suspense fallback={<ChartSkeleton />}>
                        <WeeklyPerformanceChart data={weekly} loading={loading} />
                    </Suspense>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-800">Top 3 Performing Meals</h3>
                        <p className="text-xs text-gray-400">Most ordered items this month</p>
                    </div>
                    <Suspense fallback={<ChartSkeleton />}>
                        <TopMealsChart data={topMeals} loading={loading} />
                    </Suspense>
                </div>
            </div>
        </>
    );
}