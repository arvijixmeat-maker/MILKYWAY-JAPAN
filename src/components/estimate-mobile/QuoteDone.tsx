import { useEffect, useRef } from 'react';
import { useProductCategories } from '../../hooks/useProductCategories';
import { MW } from '../desktop-primitives/mwTokens';
import { M_GRADIENT } from '../mobile/mobileTheme';
import { quoteSummaryRows } from './quoteMobile';

interface QuoteDoneProps {
    /** The submitted payload (what the form passes on to /estimate-complete). */
    estimate: Record<string, unknown>;
    onStatus: () => void;
    go: (path: string) => void;
}

/**
 * "Request sent" content (Claude Design: M Quote Done): confirmation, summary of the request
 * and tour categories to browse meanwhile. Used by the sheet below and by /estimate-complete.
 */
export function QuoteDoneSummary({ estimate, onStatus, go, titleId, page = false }: QuoteDoneProps & { titleId?: string; page?: boolean }) {
    const categories = useProductCategories().slice(0, 3);
    const Title = page ? 'h1' : 'h2';
    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <span aria-hidden="true" style={{ width: 68, height: 68, borderRadius: '50%', background: MW.mintTint, color: MW.mintDeep, fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                <Title id={titleId} style={{ margin: '6px 0 0', fontSize: 21, fontWeight: 900, lineHeight: 1.45 }}>お見積りリクエストを<br />受け付けました</Title>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: MW.mute }}>担当者が確認後、24時間以内に<br />オーダーメイドお見積りをお送りします。</p>
            </div>
            <div style={{ border: `1px solid ${MW.line}`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, paddingBottom: 10 }}>リクエスト内容の要約</span>
                {quoteSummaryRows(estimate).map((r) => (
                    <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: `1px solid ${MW.line3}`, fontSize: 13 }}>
                        <span style={{ color: MW.mute, flexShrink: 0 }}>{r.k}</span>
                        <span style={{ fontWeight: 700, textAlign: 'right', color: r.accent ? MW.mintDeep : MW.navy }}>{r.v}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>待っている間に見てみる</span>
                    <a href="/products" onClick={(e) => { e.preventDefault(); go('/products'); }} style={{ fontSize: 12, color: MW.mute, textDecoration: 'none' }}>もっと見る</a>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[{ id: '', name: 'すべて' }, ...categories].map((c) => (
                        <button
                            key={c.id || 'all'}
                            type="button"
                            onClick={() => go(c.id ? `/category/${c.id}` : '/products')}
                            style={{ border: `1px solid ${MW.line2}`, background: '#fff', borderRadius: 999, height: 38, padding: '0 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button type="button" onClick={onStatus} style={{ height: 50, border: 0, borderRadius: 999, background: M_GRADIENT, color: MW.navy, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    私のお見積り状況を見る
                </button>
                <button type="button" onClick={() => go('/')} style={{ height: 44, border: 0, background: 'transparent', color: MW.mute, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
                    ホームに戻る
                </button>
            </div>
        </>
    );
}

/** Bottom sheet shown over the form once the request has been sent. */
export function QuoteDoneSheet({ onClose, ...rest }: QuoteDoneProps & { onClose: () => void }) {
    const dialog = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        dialog.current?.focus();
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div data-mw-overlay="" style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,31,46,0.5)' }} />
            <div
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quote-done-title"
                tabIndex={-1}
                style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 18px calc(20px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 22, boxSizing: 'border-box', outline: 'none' }}
            >
                <button type="button" onClick={onClose} aria-label="閉じる" style={{ position: 'absolute', right: 8, top: 8, width: 44, height: 44, border: 0, background: 'transparent', fontSize: 22, color: MW.navy, cursor: 'pointer', padding: 0 }}>×</button>
                <QuoteDoneSummary {...rest} titleId="quote-done-title" />
            </div>
        </div>
    );
}
