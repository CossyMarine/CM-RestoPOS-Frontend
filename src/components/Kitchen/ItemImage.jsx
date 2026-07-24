import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

export default function ItemImage({ src, alt, className }) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) {
        return (
            <div className={`${className} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0`}>
                <UtensilsCrossed size={20} className="text-gray-400" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt={alt}
            onError={() => setBroken(true)}
            className={`${className} rounded-lg object-cover border border-gray-200 shrink-0`}
        />
    );
}
