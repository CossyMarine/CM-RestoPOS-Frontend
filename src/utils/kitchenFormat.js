export const CARD_SIZE_CONFIG = {
    small:  { grid: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5', img: 'h-14', name: 'text-sm', qty: 'text-base', table: 'text-4xl' },
    medium: { grid: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3', img: 'h-20', name: 'text-xl', qty: 'text-2xl', table: 'text-6xl' },
    large:  { grid: 'grid-cols-1 md:grid-cols-2', img: 'h-28', name: 'text-2xl', qty: 'text-3xl', table: 'text-7xl' },
};

export function formatDuration(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
}
