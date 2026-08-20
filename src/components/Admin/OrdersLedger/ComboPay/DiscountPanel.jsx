import { Tag, X } from 'lucide-react';

export default function DiscountPanel({
    currentDiscount,
    discountKind, setDiscountKind,
    discountValue, setDiscountValue,
    discountReason, setDiscountReason,
    discountApplying,
    onApply, onClear,
}) {
    if (currentDiscount) {
        return (
            <div className="mb-5 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                    <Tag size={14} className="text-orange-500" />
                    <span className="font-semibold text-orange-700">
                        {currentDiscount.kind === 'percent' ? `${currentDiscount.value}% off` : `KES ${currentDiscount.value} off`}
                        {currentDiscount.reason ? ` — ${currentDiscount.reason}` : ''}
                    </span>
                </div>
                <button
                    onClick={onClear}
                    disabled={discountApplying}
                    className="text-orange-400 hover:text-orange-600 disabled:opacity-50"
                    title="Remove discount"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="mb-5 border border-gray-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2.5">
                <Tag size={13} className="text-orange-500" />
                Apply a discount (optional)
            </div>
            <div className="flex gap-2 mb-2">
                <button
                    onClick={() => setDiscountKind(discountKind === 'percent' ? null : 'percent')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        discountKind === 'percent' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    Percent %
                </button>
                <button
                    onClick={() => setDiscountKind(discountKind === 'fixed' ? null : 'fixed')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        discountKind === 'fixed' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                >
                    Fixed KES
                </button>
            </div>
            {discountKind && (
                <div className="space-y-2">
                    <input
                        type="number"
                        min="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountKind === 'percent' ? 'e.g. 10' : 'e.g. 200'}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <input
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                        onClick={onApply}
                        disabled={discountApplying}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                        {discountApplying ? 'Applying…' : 'Apply Discount'}
                    </button>
                </div>
            )}
        </div>
    );
}