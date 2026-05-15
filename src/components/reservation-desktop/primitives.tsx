// Shared UI primitives for the desktop reservation flow.
// Mirrors `booking.jsx` from the PC handoff but typed for TypeScript +
// our actual product data shape (see src/types/product.ts).
//
// This file intentionally exports a mix of small components and helper
// constants/functions so the rest of the desktop-reservation module can
// pull both from one place. Vite's react-refresh plugin warns about that
// pattern (it breaks fast refresh in dev for this one file) but it doesn't
// affect production builds — so we suppress it just here.
/* eslint-disable react-refresh/only-export-components */

import type { CSSProperties, ReactNode } from 'react';
import { MatIcon } from '../desktop-primitives/MatIcon';

// ──────────────────────────────────────────────────────────────────────────────
// Card / CardHeader — every section on the desktop wizard sits in one of these.
// ──────────────────────────────────────────────────────────────────────────────
export function Card({ children }: { children: ReactNode }) {
    return (
        <section
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                boxShadow: 'var(--shadow-toss)',
                overflow: 'hidden',
            }}
        >
            {children}
        </section>
    );
}

export function CardHeader({
    title,
    subtitle,
    eyebrow,
    right,
}: {
    title: string;
    subtitle?: string;
    eyebrow?: string;
    right?: ReactNode;
}) {
    return (
        <div
            style={{
                padding: '24px 28px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
            }}
        >
            <div>
                {eyebrow && (
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.12em',
                            color: '#0f766e',
                            textTransform: 'uppercase',
                            marginBottom: 6,
                        }}
                    >
                        {eyebrow}
                    </div>
                )}
                <h3
                    style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        margin: 0,
                        letterSpacing: '-0.01em',
                    }}
                >
                    {title}
                </h3>
                {subtitle && (
                    <div style={{ fontSize: 13, color: 'var(--fg-5)', marginTop: 6 }}>
                        {subtitle}
                    </div>
                )}
            </div>
            {right}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Form field
// ──────────────────────────────────────────────────────────────────────────────
export function Field({
    label,
    required,
    children,
    colSpan,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
    colSpan?: 2;
}) {
    return (
        <div style={{ gridColumn: colSpan === 2 ? 'span 2' : 'auto' }}>
            <label
                style={{
                    fontSize: 12,
                    color: 'var(--fg-5)',
                    marginBottom: 8,
                    display: 'block',
                    fontWeight: 600,
                }}
            >
                {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// InfoRow — used in "Selected tour info" on step 1.
// ──────────────────────────────────────────────────────────────────────────────
export function InfoRow({
    icon,
    k,
    v,
    sub,
}: {
    icon: string;
    k: string;
    v: string;
    sub?: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 14,
                padding: '14px 18px',
                background: 'var(--bg-muted)',
                borderRadius: 12,
            }}
        >
            <div
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <MatIcon name={icon} size={18} color="#0f766e" />
            </div>
            <div>
                <div style={{ fontSize: 11, color: 'var(--fg-5)', fontWeight: 600 }}>{k}</div>
                <div
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        marginTop: 2,
                    }}
                >
                    {v}
                </div>
                {sub && (
                    <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 2 }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// SummaryRow — single line in the right sticky booking-summary card.
// ──────────────────────────────────────────────────────────────────────────────
export function SummaryRow({
    icon,
    k,
    v,
    sub,
    last,
}: {
    icon: string;
    k: string;
    v: string;
    sub?: string;
    last?: boolean;
}) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 12,
                padding: '10px 0',
                borderBottom: last ? 'none' : '1px dashed var(--border-subtle)',
            }}
        >
            <MatIcon name={icon} size={18} color="var(--fg-4)" />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--fg-5)', fontWeight: 600 }}>{k}</div>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                        marginTop: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {v}
                </div>
                {sub && (
                    <div style={{ fontSize: 11, color: 'var(--fg-5)', marginTop: 1 }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared styles
// ──────────────────────────────────────────────────────────────────────────────
export const inputStyle: CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'inherit',
    color: 'var(--fg-1)',
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
    background: '#fff',
};

export const stepCircle: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: 'none',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
};

// ──────────────────────────────────────────────────────────────────────────────
// Date helpers — pure, no Date mutation surprises.
// Mobile uses ms arithmetic; we use date-object construction for cleaner UTC.
// ──────────────────────────────────────────────────────────────────────────────
export function parseISO(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function fmtISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysDate(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

export function sameDate(a: Date | null, b: Date | null): boolean {
    return (
        !!a &&
        !!b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

const JP_DOWS = ['日', '月', '火', '水', '木', '金', '土'];

export function fmtMD(d: Date | null): string {
    if (!d) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function fmtFull(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${JP_DOWS[d.getDay()]})`;
}

export const formatPrice = (price: number): string => (price ? price.toLocaleString() : '0');

// ──────────────────────────────────────────────────────────────────────────────
// Image URL guard
// ──────────────────────────────────────────────────────────────────────────────
// A few admin records still have leftovers like "/og-image.jpg" or relative
// paths that fail to load. Centralise the check so the hero photo and the
// "Selected Tour" thumbnail behave the same way.
export function isUsableImageUrl(v: unknown): v is string {
    if (typeof v !== 'string') return false;
    const s = v.trim();
    if (!s) return false;
    if (s === '/og-image.jpg') return false;
    return s.startsWith('http') || s.startsWith('/');
}

/** Brand-color gradient used whenever no usable image is available. */
export const FALLBACK_HERO_GRADIENT =
    'linear-gradient(135deg, #134e4a 0%, #115e59 50%, #0f766e 100%)';
