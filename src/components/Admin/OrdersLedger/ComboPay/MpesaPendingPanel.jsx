import { Loader2 } from 'lucide-react';

export default function MpesaPendingPanel({ message, onClose }) {
    return (
        <div className="text-center py-4">
            <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-700 font-bold mb-1">Waiting for confirmation…</p>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            <button
                onClick={onClose}
                className="text-xs font-semibold text-gray-400 hover:text-red-500"
            >
                Close (payment will still confirm in the background)
            </button>
        </div>
    );
}
