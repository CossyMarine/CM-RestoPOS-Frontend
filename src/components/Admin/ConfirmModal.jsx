import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    tone = 'default',
    loading = false,
    onConfirm,
    onClose,
}) {
    if (!open) return null;

    const confirmClasses =
        tone === 'danger'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-orange-500 hover:bg-orange-600';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        <AlertTriangle size={18} />
                    </div>
                    <h3 className="text-lg font-black text-white">{title}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-6">{description}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-50 ${confirmClasses}`}
                    >
                        {loading ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
