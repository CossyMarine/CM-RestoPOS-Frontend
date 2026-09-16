import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import API from '../api/axios';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export default function useComboPayment({ receipt, onClose, onPaid }) {
    // ... all existing state unchanged ...

    const [mpesaState, setMpesaState] = useState('idle'); // idle | pending | success | failed
    const [mpesaMessage, setMpesaMessage] = useState('');
    const [mpesaCheckoutRequestId, setMpesaCheckoutRequestId] = useState(null); // NEW

    // ... allowPrinting effect, reset(), handleClose, refreshAfterPayment,
    //     submitGiveReward, printPaidReceipt all unchanged, EXCEPT reset()
    //     gets one added line: setMpesaCheckoutRequestId(null); ...

    // NEW — same connect-on-mount, disconnect-on-unmount pattern already
    // used everywhere else in this app (see OrdersLedger/index.jsx). Only
    // reacts to the checkoutRequestId currently being waited on, so it
    // ignores results for other bills' payments in flight elsewhere.
    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('mpesa:result', (payload) => {
            if (!mpesaCheckoutRequestId || payload.checkoutRequestId !== mpesaCheckoutRequestId) return;

            if (payload.status === 'success') {
                setMpesaState('success');
                setMpesaMessage(`Payment confirmed${payload.receipt?.mpesaReceiptNumber ? ` — ${payload.receipt.mpesaReceiptNumber}` : ''}.`);
                printPaidReceipt(payload.receipt);
                onPaid?.();
                setTimeout(() => {
                    reset();
                    onClose();
                }, 1800);
            } else if (payload.status === 'failed' || payload.status === 'cancelled') {
                setMpesaState('failed');
                setMpesaMessage(payload.message || 'Payment was not completed');
            }
            // 'succeeded-unapplied' deliberately left alone for now — see
            // note in the earlier version of this fix.
        });

        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mpesaCheckoutRequestId]);

    // ... handleCashPay, handleTillPay unchanged ...

    const handleSendStk = async () => {
        if (!mpesaPhone.trim()) {
            toast.error('Enter the M-Pesa phone number');
            return;
        }
        setProcessing(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: mpesaPhone.trim(),
                cashAmount: 0,
            });
            setMpesaCheckoutRequestId(res.data.checkoutRequestId); // NEW
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setProcessing(false);
    };

    const handleRetryMpesa = async () => {
        try {
            await API.post(`/receipts/${receipt._id}/mpesa/cancel`);
        } catch (err) {
            console.error('Failed to reset M-Pesa state', err);
        }
        setMpesaState('idle');
        setMpesaMessage('');
        setMpesaCheckoutRequestId(null); // NEW
    };

    // ... handleRewardPay, applyDiscountToBill, clearDiscountFromBill,
    //     handleComboApply unchanged ...

    const handleComboSendPrompt = async () => {
        if (!comboPromptPhone.trim()) { toast.error("Enter the customer's M-Pesa number"); return; }
        setComboSendingPrompt(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: comboPromptPhone.trim(),
                cashAmount: 0,
            });
            setMpesaCheckoutRequestId(res.data.checkoutRequestId); // NEW
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setComboSendingPrompt(false);
    };

    return {
        // ... everything unchanged ...
    };
}