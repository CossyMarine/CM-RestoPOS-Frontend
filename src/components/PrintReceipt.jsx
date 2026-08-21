export default function PrintReceipt({ receipt }) {
    if (!receipt) return null;

    const date = new Date(receipt.createdAt);
    const dateStr = date.toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' });

    return (
        <div id="print-receipt" className="hidden print:block font-mono text-black bg-white p-4 w-72 text-sm">
            <div className="text-center mb-2">
                <p>=====================================</p>
                <p className="font-bold">CossyMarine Hotel</p>
                <p>SALES RECEIPT</p>
                <p>=====================================</p>
            </div>

            <p>Receipt No : {receipt.billId}</p>
            <p>Table      : {receipt.tableNumber}</p>
            <p>Waiter     : {receipt.waiterName}</p>
            <p>Date       : {dateStr}</p>
            <p>Time       : {timeStr}</p>

            <p>-------------------------------------</p>
            <p>Item              Qty   Price   Total</p>
            <p>-------------------------------------</p>

            {receipt.items?.map((item, i) => (
                <p key={i}>
                    {item.mealName.padEnd(18).slice(0, 18)}
                    {String(item.quantity).padStart(3)}
                    {String(item.unitPrice).padStart(7)}
                    {String(item.lineTotal).padStart(7)}
                </p>
            ))}

                        <p>-------------------------------------</p>
            <p>Subtotal                 KES {Number(receipt.subtotal).toLocaleString()}</p>

            {receipt.discount?.amount > 0 && (
                <p>
                    {(receipt.discount.kind === 'percent' ? `Discount (${receipt.discount.value}%)` : 'Discount').padEnd(25)}
                    -KES {Number(receipt.discount.amount).toLocaleString()}
                </p>
            )}

            {receipt.tax?.amount > 0 && (
                <p>
                    {`VAT (${receipt.tax.ratePercent}%${receipt.tax.inclusive ? ', incl.' : ''})`.padEnd(25)}
                    KES {Number(receipt.tax.amount).toLocaleString()}
                </p>
            )}

            <p>-------------------------------------</p>
            <p>TOTAL                    KES {Number(receipt.totalDue ?? receipt.subtotal).toLocaleString()}</p>

            {receipt.amountPaid && (
                <>
                    <p>Amount Paid              KES {receipt.amountPaid}</p>
                    <p>Change                   KES {receipt.changeGiven}</p>
                    <p>Payment: {receipt.paymentMethod}</p>
                </>
            )}
            <div className="text-center mt-2">
                <p>=====================================</p>
                <p>Thank You! Visit Again</p>
                <p>=====================================</p>
            </div>
        </div>
    );
}
