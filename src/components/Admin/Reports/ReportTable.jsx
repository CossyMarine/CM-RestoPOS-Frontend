export default function ReportTable({ rows, totals, periodLabel }) {
    if (!rows.length) {
        return <p className="text-gray-400 text-sm text-center py-10">No paid receipts in this period</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th className="py-2 pr-4 font-bold">{periodLabel}</th>
                        <th className="py-2 pr-4 font-bold text-right">Subtotal</th>
                        <th className="py-2 pr-4 font-bold text-right">Discount</th>
                        <th className="py-2 pr-4 font-bold text-right">Tax (VAT)</th>
                        <th className="py-2 pr-4 font-bold text-right">Revenue</th>
                        <th className="py-2 font-bold text-right">Bills</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.period} className="border-b border-gray-50">
                            <td className="py-2.5 pr-4 font-semibold text-gray-700">{r.period}</td>
                            <td className="py-2.5 pr-4 text-right text-gray-500">KES {r.subtotal.toLocaleString()}</td>
                            <td className="py-2.5 pr-4 text-right text-orange-500">
                                {r.discount > 0 ? `-KES ${r.discount.toLocaleString()}` : '—'}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-gray-500">KES {r.tax.toLocaleString()}</td>
                            <td className="py-2.5 pr-4 text-right font-bold text-gray-800">KES {r.revenue.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-gray-400">{r.receiptCount}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-gray-200 font-black text-gray-800">
                        <td className="py-3 pr-4">Total</td>
                        <td className="py-3 pr-4 text-right">KES {totals.subtotal.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-orange-500">
                            {totals.discount > 0 ? `-KES ${totals.discount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right">KES {totals.tax.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-emerald-600">KES {totals.revenue.toLocaleString()}</td>
                        <td className="py-3 text-right">{totals.receiptCount}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}