export default function TabsBar({ tab, onSelectTab, unpaidCount, paidCount, allTotal }) {
    return (
        <div className="flex gap-2 flex-wrap">
            {['unpaid', 'paid', 'all'].map((t) => (
                <button
                    key={t}
                    onClick={() => onSelectTab(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                        tab === t
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                            : 'bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm'
                    }`}
                >
                    {t === 'all' ? `All (${allTotal})` : `${t} (${t === 'unpaid' ? unpaidCount : paidCount})`}
                </button>
            ))}
        </div>
    );
}
