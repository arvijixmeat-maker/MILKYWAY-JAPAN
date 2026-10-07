import type { CSSProperties, ReactNode } from 'react';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { LINE_CHAT_URL } from '../mobile/mobileTheme';
import { BK_LINE_GREEN } from './bookingShared';

/** White section card of the booking body. `pc` switches between the PC and mobile metrics. */
export function BookCard({
    pc, eyebrow, title, sub, gap, children,
}: { pc: boolean; eyebrow?: string; title: string; sub?: string; gap?: number; children: ReactNode }) {
    return (
        <section style={{ background: '#FFFFFF', borderRadius: pc ? 28 : 20, padding: pc ? 28 : 18, display: 'flex', flexDirection: 'column', gap: gap ?? (pc ? 20 : 16), minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {eyebrow && <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: MW.mintDeep }}>{eyebrow}</span>}
                <h2 style={{ margin: 0, fontSize: pc ? 20 : 17, fontWeight: 900, lineHeight: 1.4, color: MW.navy }}>{title}</h2>
                {sub && <span style={{ fontSize: 13, lineHeight: 1.6, color: MW.mute }}>{sub}</span>}
            </div>
            {children}
        </section>
    );
}

/** Green LINE pill (opens the official LINE chat in a new tab). */
export function LineLink({ label, height = 40, style }: { label: string; height?: number; style?: CSSProperties }) {
    return (
        <a
            href={LINE_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height, padding: '0 16px 0 12px', borderRadius: 999, background: BK_LINE_GREEN, fontSize: 13, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box', ...style }}
        >
            <span style={{ fontFamily: MW_FONT_EN, fontSize: 10, fontWeight: 700, background: '#FFFFFF', color: BK_LINE_GREEN, padding: '2px 6px', borderRadius: 5 }}>LINE</span>
            {label}
        </a>
    );
}
