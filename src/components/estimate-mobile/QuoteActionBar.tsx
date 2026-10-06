import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { M_GRADIENT } from '../mobile/mobileTheme';

/** Sticky bottom bar of the quote form: 入力状況 progress and the submit button (replaces the tab bar). */
export function QuoteActionBar({ done, total, canSubmit, submitting, onSubmit }: { done: number; total: number; canSubmit: boolean; submitting: boolean; onSubmit: () => void }) {
    const enabled = canSubmit && !submitting;
    return (
        <div style={{ position: 'sticky', bottom: 0, zIndex: 30, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${MW.line}`, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: MW.mute, whiteSpace: 'nowrap' }}>入力状況</span>
                <span
                    role="progressbar"
                    aria-label="入力状況"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={done}
                    style={{ flex: 1, height: 5, borderRadius: 3, background: MW.line3, overflow: 'hidden' }}
                >
                    <span style={{ display: 'block', height: '100%', width: `${Math.round((done / total) * 100)}%`, background: 'linear-gradient(90deg,#27AB8F,#3FC2A4)', borderRadius: 3, transition: 'width .3s' }} />
                </span>
                <span style={{ fontFamily: MW_FONT_EN, fontSize: 11, fontWeight: 600, color: MW.mintDeep, whiteSpace: 'nowrap' }}>{done} / {total}</span>
            </div>
            <button
                type="button"
                onClick={onSubmit}
                disabled={!enabled}
                style={{ height: 50, border: 0, borderRadius: 999, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, background: enabled ? M_GRADIENT : MW.line3, color: enabled ? MW.navy : MW.mute2, cursor: enabled ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
            >
                {submitting ? '送信中…' : canSubmit ? '見積もりを依頼する' : '行き先・お名前・メールをご入力ください'}
            </button>
        </div>
    );
}
