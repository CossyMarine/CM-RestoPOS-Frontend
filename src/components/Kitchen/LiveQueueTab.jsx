import OrderCard from './OrderCard';

export default function LiveQueueTab({
    orders,
    newOrderIds,
    minutesAgo,
    settings,
    sizeCfg,
    resolveImg,
    onToggleItem,
    onAcknowledge,
    onMarkDone,
}) {
    if (orders.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="text-center text-gray-400 py-24">
                    <div className="text-6xl mb-4">🍽️</div>
                    <div className="text-2xl font-black text-gray-700">No orders in the queue</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <div className={`grid ${sizeCfg.grid} gap-6`}>
                {orders.map((order) => {
                    const isNew = newOrderIds.has(order._id);
                    const age = minutesAgo(order.createdAt);
                    const isCritical = age >= settings.criticalThresholdMinutes;
                    const isLate = !isCritical && age >= settings.lateThresholdMinutes;

                    return (
                        <OrderCard
                            key={order._id}
                            order={order}
                            isNew={isNew}
                            age={age}
                            isCritical={isCritical}
                            isLate={isLate}
                            sizeCfg={sizeCfg}
                            resolveImg={resolveImg}
                            onToggleItem={onToggleItem}
                            onAcknowledge={onAcknowledge}
                            onMarkDone={onMarkDone}
                        />
                    );
                })}
            </div>
        </div>
    );
}
