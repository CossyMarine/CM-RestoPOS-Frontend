export function ChartSkeleton({ height = "h-64" }) {
    return (
        <div className={`${height} flex items-center justify-center`}>
            <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
                Loading chart…
            </div>
        </div>
    );
}

export function ChartEmptyState({ message, height = "h-64" }) {
    return (
        <div className={`${height} flex flex-col items-center justify-center text-center gap-2`}>
            <span className="text-3xl">📊</span>
            <p className="text-sm text-gray-400 font-medium max-w-xs">{message}</p>
        </div>
    );
}