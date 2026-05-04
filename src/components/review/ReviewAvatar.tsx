import React, { useState } from 'react';

interface ReviewAvatarProps {
    src?: string;
    name?: string;
    size?: number; // pixels — defaults to 40 (matches list-card avatar)
    className?: string;
}

// Avatar with image-first, initial-fallback rendering. Initial uses the first
// character of the trimmed name and works for both 田中 / 田 and 홍길동 / 홍.
// Background is the design-system primary tint so the avatar reads as a person
// chip without resorting to a stock person icon.
export const ReviewAvatar: React.FC<ReviewAvatarProps> = ({ src, name, size = 40, className = '' }) => {
    const [failed, setFailed] = useState(false);
    const showImage = !!src && !failed;
    const initial = (name || '?').trim().charAt(0);
    return (
        <div
            className={`shrink-0 rounded-full bg-primary/10 dark:bg-primary/20 overflow-hidden flex items-center justify-center ${className}`}
            style={{ width: `${size}px`, height: `${size}px` }}
            aria-hidden={!name ? 'true' : undefined}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name ? `${name}様のアバター` : ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                />
            ) : (
                <span
                    className="font-bold text-primary leading-none select-none"
                    style={{ fontSize: `${Math.round(size * 0.4)}px` }}
                >
                    {initial}
                </span>
            )}
        </div>
    );
};
