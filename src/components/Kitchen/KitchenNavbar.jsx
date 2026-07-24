export default function KitchenNavbar({
    connected,
    servedToday,
    activeTab,
    setActiveTab,
    newOrderCount,
    onAcknowledgeAll,
    userName,
    onLogout,
}) {
    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="font-black text-lg text-gray-800">
                    Kitchen<span className="text-orange-500">Display</span>
                </span>
                <span
                    className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        connected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                    }`}
                >
                    {connected ? '● Live' : '● Reconnecting...'}
                </span>
                <span className="ml-3 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
                    🍽️ {servedToday} served today
                </span>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                {[
                    { key: 'live', label: 'Live Queue' },
                    { key: 'history', label: 'History' },
                    { key: 'inventory', label: 'Inventory' },
                    { key: 'settings', label: 'Settings' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === tab.key
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                                : 'text-gray-500 hover:text-orange-500'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                {newOrderCount > 0 && (
                    <button
                        onClick={onAcknowledgeAll}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm font-black px-4 py-2 rounded-xl animate-pulse shadow-md shadow-red-500/20"
                    >
                        🔔 {newOrderCount} NEW — Silence All
                    </button>
                )}
                <span className="text-gray-500 text-sm font-medium hidden sm:inline">👤 {userName}</span>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-600 text-sm font-semibold transition-colors">
                    Sign Out
                </button>
            </div>
        </nav>
    );
}
