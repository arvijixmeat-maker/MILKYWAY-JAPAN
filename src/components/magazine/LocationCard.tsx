import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface LocationInfo {
    name?: string;
    address?: string;
    phone?: string;
    website?: string;
    hours?: string;       // raw multiline text from admin
    mapEmbedUrl?: string; // already-sanitized Google Maps embed URL (server side)
    mapQuery?: string;    // address or "lat,lng" for directions URL
}

interface LocationCardProps {
    location: LocationInfo;
}

// — helpers —

const buildDirectionsUrl = (loc: LocationInfo): string => {
    const q = (loc.mapQuery || loc.address || loc.name || '').trim();
    if (!q) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

// Extract iframe src from raw HTML, or pass through a URL.
const resolveEmbedSrc = (raw?: string): string | null => {
    if (!raw) return null;
    const v = raw.trim();
    if (!v) return null;
    const m = v.match(/src=["']([^"']+)["']/i);
    const url = m ? m[1] : v;
    if (!/^https?:\/\//i.test(url)) return null;
    return url;
};

// Parse multi-line "label: hours" text into structured rows.
// Accepts any prefix the admin writes (月, Mon, 월, 월요일 etc).
const parseHours = (raw?: string): Array<{ label: string; value: string }> => {
    if (!raw) return [];
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const i = line.indexOf(':');
            if (i === -1) return { label: '', value: line };
            return { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
        });
};

// Try to find today's row in parsed hours using a permissive label match.
// Returns the index in the parsed array, or -1.
const findTodayRow = (rows: Array<{ label: string; value: string }>): number => {
    if (rows.length === 0) return -1;
    const day = new Date().getDay(); // 0=Sun..6=Sat
    // Map a day index to all common single-character/abbrev labels we might see.
    const labels: Record<number, string[]> = {
        0: ['日', 'Sun', '일'],
        1: ['月', 'Mon', '월'],
        2: ['火', 'Tue', '화'],
        3: ['水', 'Wed', '수'],
        4: ['木', 'Thu', '목'],
        5: ['金', 'Fri', '금'],
        6: ['土', 'Sat', '토'],
    };
    const cand = labels[day] || [];
    for (let i = 0; i < rows.length; i++) {
        const lbl = rows[i].label;
        if (!lbl) continue;
        if (cand.some((c) => lbl.startsWith(c))) return i;
    }
    return -1;
};

export const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const embedSrc = useMemo(() => resolveEmbedSrc(location.mapEmbedUrl), [location.mapEmbedUrl]);
    const directionsUrl = useMemo(() => buildDirectionsUrl(location), [location]);
    const hoursRows = useMemo(() => parseHours(location.hours), [location.hours]);
    const todayIdx = useMemo(() => findTodayRow(hoursRows), [hoursRows]);

    // Don't render anything if there's no meaningful data
    const hasAny = !!(
        location.name ||
        location.address ||
        location.phone ||
        location.website ||
        embedSrc ||
        location.hours
    );
    if (!hasAny) return null;

    const handleCopyAddress = async () => {
        const text = location.address || location.name || '';
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Silently fail; clipboard may be unavailable
        }
    };

    return (
        <section className="not-prose mt-8 mb-6">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                {/* Map */}
                {embedSrc && (
                    <div className="relative w-full" style={{ aspectRatio: '16 / 10' }}>
                        <iframe
                            src={embedSrc}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full border-0"
                            title={location.name || 'map'}
                        />
                    </div>
                )}

                {/* Info */}
                <div className="p-5 space-y-3">
                    {location.name && (
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                place
                            </span>
                            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
                                {location.name}
                            </h3>
                        </div>
                    )}

                    <div className="space-y-2 text-[13px] text-slate-700 dark:text-slate-300">
                        {location.address && (
                            <div className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5 shrink-0">map</span>
                                <span className="leading-relaxed flex-1 min-w-0">{location.address}</span>
                            </div>
                        )}
                        {location.phone && (
                            <a
                                href={`tel:${location.phone.replace(/\s/g, '')}`}
                                className="flex items-center gap-2.5 hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">call</span>
                                <span className="tabular-nums">{location.phone}</span>
                            </a>
                        )}
                        {location.website && (
                            <a
                                href={location.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 hover:text-primary transition-colors break-all"
                            >
                                <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">language</span>
                                <span className="truncate">{location.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                            </a>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleCopyAddress}
                            disabled={!location.address && !location.name}
                            className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[13px] hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[16px]">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                            {copied
                                ? t('magazine.location.copied', { defaultValue: 'コピー済み' })
                                : t('magazine.location.copy_address', { defaultValue: '住所をコピー' })}
                        </button>
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-primary text-white font-bold text-[13px] shadow-sm shadow-primary/20 hover:bg-primary-dark active:scale-[0.98] transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                directions
                            </span>
                            {t('magazine.location.directions', { defaultValue: '経路を見る' })}
                        </a>
                    </div>
                </div>

                {/* Hours */}
                {hoursRows.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2 mb-2.5">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">schedule</span>
                            <h4 className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                                {t('magazine.location.hours_title', { defaultValue: '営業時間' })}
                            </h4>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                            {hoursRows.map((row, i) => {
                                const isToday = i === todayIdx;
                                return (
                                    <React.Fragment key={i}>
                                        <div
                                            className={`tabular-nums ${
                                                isToday
                                                    ? 'text-primary font-bold'
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {row.label}
                                            {isToday && (
                                                <span className="ml-1 text-[10px] font-bold uppercase tracking-wide">
                                                    · {t('magazine.location.today', { defaultValue: '本日' })}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={`tabular-nums text-right ${
                                                isToday
                                                    ? 'text-slate-900 dark:text-white font-bold'
                                                    : 'text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {row.value}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
