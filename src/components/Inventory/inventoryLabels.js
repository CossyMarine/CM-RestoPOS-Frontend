// src/components/Admin/Inventory/inventoryLabels.js
//
// Shared glossary + formatting helpers for the Inventory frontend.
// Keeps money formatting, unit display, backend-term translation, and
// "is this stock okay?" logic in one place so every inventory screen
// agrees on what "Running Low" means and what to call things.

export const formatKES = (amount) => `KES ${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const formatQty = (qty, unitAbbr) => {
    const n = Number(qty || 0);
    const rounded = Number.isInteger(n) ? n : Number(n.toFixed(2));
    return `${rounded.toLocaleString()}${unitAbbr ? ` ${unitAbbr}` : ''}`;
};

// Days between now and a date (can be negative if the date is in the past).
export const daysUntil = (date) => {
    if (!date) return null;
    const ms = new Date(date).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
};

export const formatShortDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

// A stock row is "expiring soon" once it's within this many days of its
// nearest batch expiry. Kept separate from the "Expiring Soon" tab's own
// (configurable) window so the Stock table badge stays predictable.
export const EXPIRING_SOON_WINDOW_DAYS = 3;

/**
 * Decide the plain-language status badge for a stock row.
 * @param {{available: number, reorderLevel: number, nearestExpiryDate: string|Date|null}} params
 */
export function getStockStatus({ available, reorderLevel, nearestExpiryDate }) {
    const qty = Number(available || 0);

    if (qty <= 0) {
        return { key: 'out', label: 'Out of Stock', emoji: '🔴', classes: 'bg-red-50 text-red-700 border-red-200' };
    }

    const expiryDays = daysUntil(nearestExpiryDate);
    if (expiryDays !== null && expiryDays <= EXPIRING_SOON_WINDOW_DAYS) {
        return { key: 'expiring', label: 'Expiring Soon', emoji: '🟡', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
    }

    if (reorderLevel > 0 && qty <= reorderLevel) {
        return { key: 'low', label: 'Running Low', emoji: '🟠', classes: 'bg-orange-50 text-orange-700 border-orange-200' };
    }

    return { key: 'good', label: 'Good', emoji: '🟢', classes: 'bg-green-50 text-green-700 border-green-200' };
}

export const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: 'All Statuses' },
    { value: 'good', label: '🟢 Good' },
    { value: 'low', label: '🟠 Running Low' },
    { value: 'out', label: '🔴 Out of Stock' },
    { value: 'expiring', label: '🟡 Expiring Soon' },
];

// Builds a lookup of the soonest-expiring active batch per "item@location",
// so the Stock table can show one expiry date per row without a second
// round trip per item.
export function buildNearestExpiryMap(batches) {
    const map = new Map();
    for (const batch of batches || []) {
        if (!batch.expiryDate) continue;
        const itemId = batch.inventoryItem?._id || batch.inventoryItem;
        const locationId = batch.location?._id || batch.location;
        if (!itemId || !locationId) continue;
        const key = `${itemId}_${locationId}`;
        const existing = map.get(key);
        if (!existing || new Date(batch.expiryDate) < new Date(existing)) {
            map.set(key, batch.expiryDate);
        }
    }
    return map;
}

// Backend `itemType` enum -> plain restaurant language.
// Keep in sync with the enum on the InventoryItem model:
// ["raw_material", "finished_product", "consumable", "packaging", "mro"]
const ITEM_TYPE_LABELS = {
    raw_material: 'Ingredient',
    finished_product: 'Finished Product',
    consumable: 'Consumable',
    packaging: 'Packaging',
    mro: 'Supplies & Equipment',
};

export function itemTypeLabel(itemType) {
    return ITEM_TYPE_LABELS[itemType] || 'Item';
}