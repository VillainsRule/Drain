import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getRelativeTime = (timestamp: number): string => {
    if (timestamp <= 0) return 'never';

    const now = Date.now();
    let diff = Math.floor((now - timestamp) / 1000);

    if (diff < 0) return 'just now';

    const units = [
        { name: 'month', secs: 2592000 },
        { name: 'week', secs: 604800 },
        { name: 'day', secs: 86400 },
        { name: 'hour', secs: 3600 },
        { name: 'minute', secs: 60 },
        { name: 'second', secs: 1 }
    ];

    for (const unit of units) {
        const value = Math.floor(diff / unit.secs);
        if (value > 0) return `${value} ${unit.name}${value > 1 ? 's' : ''} ago`;
    }

    return 'just now';
}