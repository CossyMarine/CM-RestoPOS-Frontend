export default function PaymentFooter({ paymentMethod, processing, cashChange, onCancel, onConfirm }) {
    return (
        <div className="flex gap-3">
            <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 font-semibold transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                disabled={
                    !paymentMethod ||
                    processing ||
                    (paymentMethod === 'cash' && cashChange !== null && cashChange < 0)
                }
                className={`flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-50 shadow-sm ${
                    paymentMethod === 'reward' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
            >
                {processing
                    ? 'Processing…'
                    : paymentMethod === 'reward'
                    ? 'Apply Points'
                    : paymentMethod === 'cash' || paymentMethod === 'till'
                    ? 'Confirm Payment'
                    : 'Send Prompt'}
            </button>
        </div>
    );
}
