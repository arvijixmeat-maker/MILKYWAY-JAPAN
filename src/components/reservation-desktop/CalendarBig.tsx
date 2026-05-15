import { useState } from 'react';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { addDaysDate, sameDate } from './primitives';

interface CalendarBigProps {
    /** Currently selected start date (or null when nothing picked yet). */
    value: Date | null;
    /** Called with the new start date when a non-past day is clicked. */
    onChange: (d: Date) => void;
    /** Number of nights — drives the range highlight after the start day. */
    nights: number;
}

const DOWS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Monthly calendar grid with range hover. Mirrors the PC handoff CalendarBig.
 * Past dates are disabled so the user can't pick a departure that's already gone.
 */
export function CalendarBig({ value, onChange, nights }: CalendarBigProps) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Default the visible month to the selected value, or current month when none.
    const initial = value ?? today;
    const [year, setYear] = useState(initial.getFullYear());
    const [month, setMonth] = useState(initial.getMonth());

    const first = new Date(year, month, 1);
    const firstDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const selStart = value;
    const selEnd = selStart ? addDaysDate(selStart, nights) : null;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const monthLabel = `${year}年 ${month + 1}月`;

    const prev = () => {
        if (month === 0) {
            setYear((y) => y - 1);
            setMonth(11);
        } else setMonth((m) => m - 1);
    };
    const next = () => {
        if (month === 11) {
            setYear((y) => y + 1);
            setMonth(0);
        } else setMonth((m) => m + 1);
    };

    const inRange = (d: Date | null, s: Date | null, e: Date | null): boolean =>
        !!d && !!s && !!e && d >= s && d <= e;

    return (
        <div
            style={{
                padding: '18px 22px',
                borderRadius: 16,
                background: '#fff',
                border: '1px solid var(--border)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 18,
                }}
            >
                <button type="button" onClick={prev} style={navBtn}>
                    <MatIcon name="chevron_left" size={22} color="var(--fg-2)" />
                </button>
                <div
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {monthLabel}
                </div>
                <button type="button" onClick={next} style={navBtn}>
                    <MatIcon name="chevron_right" size={22} color="var(--fg-2)" />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {DOWS.map((d, i) => (
                    <div
                        key={i}
                        style={{
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '8px 0',
                            letterSpacing: '0.04em',
                            color:
                                i === 0
                                    ? '#dc2626'
                                    : i === 6
                                        ? '#2563eb'
                                        : 'var(--fg-3)',
                        }}
                    >
                        {d}
                    </div>
                ))}
                {cells.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const dow = d.getDay();
                    const past = d < today;
                    const isStart = sameDate(d, selStart);
                    const ranged = inRange(d, selStart, selEnd) && !isStart;
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => !past && onChange(d)}
                            disabled={past}
                            style={{
                                aspectRatio: '1/0.85',
                                padding: 0,
                                position: 'relative',
                                background: isStart
                                    ? '#0f766e'
                                    : ranged
                                        ? 'var(--primary-soft, rgba(15,118,110,0.18))'
                                        : 'transparent',
                                color: past
                                    ? 'var(--fg-6)'
                                    : isStart
                                        ? '#fff'
                                        : ranged
                                            ? 'var(--primary-dark, #115e59)'
                                            : dow === 0
                                                ? '#dc2626'
                                                : dow === 6
                                                    ? '#2563eb'
                                                    : 'var(--fg-2)',
                                border: 'none',
                                borderRadius: isStart ? 999 : ranged ? 0 : 10,
                                fontSize: 14,
                                fontWeight: isStart ? 700 : 500,
                                cursor: past ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                                transition: 'background 100ms',
                            }}
                        >
                            {d.getDate()}
                            {isStart && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: 4,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        background: 'rgba(255,255,255,0.95)',
                                        color: 'var(--primary-dark, #115e59)',
                                        borderRadius: 4,
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    出発
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: 11,
                    color: 'var(--fg-5)',
                }}
            >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{ width: 12, height: 12, borderRadius: 999, background: '#0f766e' }}
                    />{' '}
                    出発日
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: 'var(--primary-soft, rgba(15,118,110,0.18))',
                        }}
                    />{' '}
                    旅行期間
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            background: 'transparent',
                            border: '1px solid var(--fg-6)',
                        }}
                    />{' '}
                    予約不可
                </span>
            </div>
        </div>
    );
}

const navBtn = {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
} as const;
