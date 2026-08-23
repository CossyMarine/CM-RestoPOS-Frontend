// src/components/Admin/TableQRGenerator.jsx
import { useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download } from 'lucide-react';

export default function TableQRGenerator() {
    const [tableNumber, setTableNumber] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const targetUrl = tableNumber.trim()
        ? `${window.location.origin}/home?table=${encodeURIComponent(tableNumber.trim())}`
        : '';

    const handleGenerate = async () => {
        if (!tableNumber.trim()) {
            setError('Enter a table number first');
            return;
        }

        setError('');
        setGenerating(true);

        try {
            const dataUrl = await QRCode.toDataURL(targetUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#1f2937',
                    light: '#ffffff',
                },
            });

            setQrDataUrl(dataUrl);
        } catch (err) {
            console.error('Failed to generate QR code', err);
            setError('Could not generate the QR code');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
                <QrCode size={16} className="text-orange-500" />
                Table QR Codes
            </h3>

            <p className="text-xs text-gray-400 -mt-2">
                Generate a QR code for a table. Scanning it takes a first-time customer straight to the
                menu with that table already filled in — no typing needed.
            </p>

            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                        Table Number
                    </label>

                    <input
                        value={tableNumber}
                        onChange={(e) => {
                            setTableNumber(e.target.value);
                            setError('');
                            setQrDataUrl(null);
                        }}
                        placeholder="e.g. 7"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    />
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                    {generating ? 'Generating…' : 'Generate'}
                </button>
            </div>

            {error && (
                <p className="text-xs text-red-500 font-semibold">
                    {error}
                </p>
            )}

            {qrDataUrl && (
                <div className="flex flex-col items-center gap-3 pt-2 border-t border-gray-100">
                    <img
                        src={qrDataUrl}
                        alt={`QR code for table ${tableNumber}`}
                        className="w-48 h-48 rounded-xl border border-gray-100"
                    />

                    <p className="text-xs text-gray-400 text-center break-all">
                        {targetUrl}
                    </p>

                    <a
                        href={qrDataUrl}
                        download={`table-${tableNumber}-qr.png`}
                        className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600"
                    >
                        <Download size={13} />
                        Download PNG
                    </a>
                </div>
            )}
        </div>
    );
}