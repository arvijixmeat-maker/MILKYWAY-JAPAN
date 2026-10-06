import { useState, type CSSProperties, type FocusEvent, type InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotImages } from '../../hooks/useSpotImages';
import { MW, isUsableImage } from '../desktop-primitives/mwTokens';
import {
    ACCOMMODATIONS, DESTINATIONS, TRAVEL_TYPES, VEHICLES,
    canSubmitQuote, jpDate, quoteBudgetLabel, quotePeople, quoteSteps, submitQuote,
} from '../estimate-desktop/quoteForm';
import { MobileShell } from '../mobile/MobileShell';
import { QuoteActionBar } from './QuoteActionBar';
import { QuoteCalendar } from './QuoteCalendar';
import { QuoteDoneSheet } from './QuoteDone';
import { QuoteHeroMobile } from './QuoteHeroMobile';
import { QuoteStep } from './QuoteStep';
import { TravelPassMobile } from './TravelPassMobile';
import { jpDateShort, stepStates, useQuoteForm, type CalKind } from './quoteMobile';

/**
 * Mobile お見積もり page (Claude Design: "Milkyway Japan Mobile" — M Quote Hero / Form / Travel Pass).
 * Same nine steps, options and payload as the PC form (estimate-desktop/quoteForm.ts);
 * the submit button lives in the sticky bar that replaces the tab bar.
 */
export function CustomEstimateMobile() {
    const navigate = useNavigate();
    const { pick } = useSpotImages();
    const { form, set, toggle } = useQuoteForm();
    const [cal, setCal] = useState<CalKind | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<Record<string, unknown> | null>(null);

    const steps = quoteSteps(form);
    const st = stepStates(steps);
    const canSubmit = canSubmitQuote(form);

    const go = (path: string, state?: Record<string, unknown>) => {
        navigate(path, state ? { state } : undefined);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        try {
            setDone(await submitQuote(form));
        } catch (e) {
            console.error('[quote create]', e);
            alert('送信に失敗しました。しばらくしてからもう一度お試しください。');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MobileShell
            title="お見積もり"
            bottomBar={<QuoteActionBar done={steps.filter(Boolean).length} total={steps.length} canSubmit={canSubmit} submitting={submitting} onSubmit={handleSubmit} />}
        >
            <QuoteHeroMobile onHome={() => go('/')} />

            <section style={{ padding: '28px 16px 0', display: 'flex', flexDirection: 'column' }}>
                <QuoteStep n={1} state={st[0]} title="行きたい場所" hint="複数選択可">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                        {DESTINATIONS.map((d) => {
                            const on = form.destinations.includes(d.v);
                            const img = pick(d.spot);
                            return (
                                <button
                                    key={d.v}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggle('destinations', d.v)}
                                    style={{
                                        position: 'relative', aspectRatio: '4/3', padding: 0, borderRadius: 14, overflow: 'hidden', border: 0,
                                        outline: `3px solid ${on ? MW.mint : MW.line2}`, outlineOffset: -3, cursor: 'pointer', color: '#fff', textAlign: 'left', fontFamily: 'inherit',
                                        background: isUsableImage(img) ? '#DDE2DF' : `linear-gradient(135deg, ${MW.navySoft} 0%, ${MW.mintDeep} 100%)`,
                                    }}
                                >
                                    {isUsableImage(img) && (
                                        <img src={img} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                    <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,0.65) 100%)' }} />
                                    <span style={{ position: 'absolute', right: 8, top: 8, width: 24, height: 24, borderRadius: '50%', boxSizing: 'border-box', border: '2px solid #fff', background: on ? MW.mint : 'transparent', color: MW.navy, fontSize: 12, lineHeight: '20px', textAlign: 'center' }}>
                                        {on ? '✓' : ''}
                                    </span>
                                    <span style={{ position: 'absolute', left: 10, right: 10, bottom: 9, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.v}</span>
                                </button>
                            );
                        })}
                    </div>
                </QuoteStep>

                <QuoteStep n={2} state={st[1]} title="旅行期間" hint="出発日と帰国日を選択">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                        <DateField label="出発日" value={form.startDate} active={cal === 'start'} onClick={() => setCal(cal === 'start' ? null : 'start')} />
                        <DateField label="帰国日" value={form.endDate} active={cal === 'end'} onClick={() => setCal(cal === 'end' ? null : 'end')} />
                    </div>
                    {cal && (
                        <QuoteCalendar
                            key={cal}
                            kind={cal}
                            start={form.startDate}
                            end={form.endDate}
                            onPick={(v) => {
                                if (cal === 'start') {
                                    set(form.endDate && form.endDate < v ? { startDate: v, endDate: '' } : { startDate: v });
                                    setCal('end');
                                } else {
                                    set({ endDate: v });
                                    setCal(null);
                                }
                            }}
                            onClear={() => set(cal === 'start' ? { startDate: '', endDate: '' } : { endDate: '' })}
                            onClose={() => setCal(null)}
                        />
                    )}
                </QuoteStep>

                <QuoteStep n={3} state={st[2]} title="参加人数">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Stepper label="大人" value={form.adultCount} onChange={(v) => set({ adultCount: Math.min(30, Math.max(1, v)) })} />
                        <Stepper label="子供" value={form.childCount} onChange={(v) => set({ childCount: Math.min(30, Math.max(0, v)) })} />
                    </div>
                </QuoteStep>

                <QuoteStep n={4} state={st[3]} title="旅行スタイル" hint="複数選択可">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {TRAVEL_TYPES.map((v) => (
                            <Pill key={v} on={form.themes.includes(v)} onClick={() => toggle('themes', v)}>{v}</Pill>
                        ))}
                    </div>
                </QuoteStep>

                <QuoteStep n={5} state={st[4]} title="宿泊タイプ" hint="複数選択可">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ACCOMMODATIONS.map((v) => (
                            <Pill key={v} on={form.accommodations.includes(v)} onClick={() => toggle('accommodations', v)}>{v}</Pill>
                        ))}
                    </div>
                </QuoteStep>

                <QuoteStep n={6} state={st[5]} title="車両タイプ">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {VEHICLES.map((o) => {
                            const on = form.vehicle === o.v;
                            return (
                                <button
                                    key={o.v}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => set({ vehicle: on ? '' : o.v })}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '10px 16px', borderRadius: 14, border: `1.5px solid ${on ? MW.mint : MW.line2}`, background: on ? MW.mintTint : '#FFFFFF', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', color: MW.navy }}
                                >
                                    <Ring on={on} size={20} />
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{o.v}</span>
                                        <span style={{ fontSize: 12, color: MW.mute }}>{o.sub}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </QuoteStep>

                <QuoteStep n={7} state={st[6]} title="ご予算" hint="お一人様あたり">
                    <div style={{ background: '#fff', border: `1.5px solid ${MW.line2}`, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: MW.mute }}>目安</span>
                            <span style={{ fontSize: 26, fontWeight: 900, color: MW.mintDeep }}>{quoteBudgetLabel(form)}</span>
                        </div>
                        <input
                            type="range"
                            min={10}
                            max={500}
                            step={10}
                            value={form.priceRange}
                            onChange={(e) => set({ priceRange: Number(e.target.value) })}
                            aria-label="ご予算（お一人様あたり）"
                            style={{ width: '100%', margin: 0, accentColor: MW.mint }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MW.mute }}>
                            <span>10 万円</span>
                            <span>500 万円+</span>
                        </div>
                    </div>
                </QuoteStep>

                <QuoteStep n={8} state={st[7]} title="ご要望" hint="任意">
                    <textarea
                        rows={5}
                        value={form.additionalRequest}
                        onChange={(e) => set({ additionalRequest: e.target.value })}
                        placeholder="例: 8月の連休に行きたい / 子供連れでゲル宿泊メイン / 撮影スポットを多めに..."
                        aria-label="ご要望"
                        style={{ ...field, height: 'auto', padding: '14px 16px', lineHeight: 1.7, resize: 'vertical' }}
                        {...focusBorder}
                    />
                </QuoteStep>

                <QuoteStep n={9} state={st[8]} title="ご連絡先" hint="お見積もりの送付先" last>
                    <Field label="お名前" required value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" placeholder="山田 花子" />
                    <Field label="お電話番号" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" placeholder="090-1234-5678" />
                    <Field label="メールアドレス" required type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" placeholder="example@mail.com" />
                </QuoteStep>

                <TravelPassMobile
                    passenger={form.name.trim() ? `${form.name.trim()} 様` : '旅行者様'}
                    people={quotePeople(form)}
                    depart={form.startDate ? jpDate(form.startDate).replace(/（.）$/, '') : 'ご希望の日'}
                    budget={quoteBudgetLabel(form)}
                    places={form.destinations.join('・') || '未選択'}
                    styles={form.themes.join('・') || '未選択'}
                />
            </section>

            {done && (
                <QuoteDoneSheet
                    estimate={done}
                    onClose={() => setDone(null)}
                    onStatus={() => go('/estimate-complete', done)}
                    go={go}
                />
            )}
        </MobileShell>
    );
}

/** Radio/checkbox ring used by the pills and the vehicle rows. */
function Ring({ on, size }: { on: boolean; size: number }) {
    return (
        <span
            aria-hidden="true"
            style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%', boxSizing: 'border-box', border: `1.5px solid ${on ? MW.mint : '#B8C4C1'}`, background: on ? MW.mint : 'transparent', color: MW.navy, fontSize: size > 16 ? 11 : 10, lineHeight: `${size - 3}px`, textAlign: 'center' }}
        >
            {on ? '✓' : ''}
        </span>
    );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
    return (
        <button
            type="button"
            aria-pressed={on}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 14px 0 12px', borderRadius: 999, border: `1.5px solid ${on ? MW.mint : MW.line2}`, background: on ? MW.mintTint : '#FFFFFF', fontFamily: 'inherit', color: MW.navy, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
            <Ring on={on} size={16} />
            {children}
        </button>
    );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    const btn = (primary: boolean): CSSProperties => ({ width: 44, height: 44, border: 0, borderRadius: '50%', background: primary ? MW.mint : '#F1F4F3', fontSize: 18, color: MW.navy, cursor: 'pointer', padding: 0, fontFamily: 'inherit' });
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, height: 60, boxSizing: 'border-box', border: `1.5px solid ${MW.line2}`, borderRadius: 14, padding: '0 8px 0 18px', background: '#fff' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: MW.mute }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => onChange(value - 1)} aria-label={`${label}を減らす`} style={btn(false)}>−</button>
                <span aria-live="polite" style={{ minWidth: 44, textAlign: 'center', fontSize: 18, fontWeight: 900 }}>
                    {value}<span style={{ fontSize: 12, fontWeight: 700 }}> 名</span>
                </span>
                <button type="button" onClick={() => onChange(value + 1)} aria-label={`${label}を増やす`} style={btn(true)}>+</button>
            </div>
        </div>
    );
}

function DateField({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={fieldLabel}>{label}</span>
            <button
                type="button"
                onClick={onClick}
                aria-label={value ? `${label} ${jpDate(value)}` : label}
                aria-expanded={active}
                style={{ boxSizing: 'border-box', width: '100%', height: 52, border: `1.5px solid ${active ? MW.mint : MW.line2}`, borderRadius: 14, padding: '0 12px', fontSize: 13, color: MW.navy, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
            >
                <span style={{ color: value ? MW.navy : MW.mute2, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jpDateShort(value) || '日付を選択'}</span>
                <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 10, color: MW.mintDeep }}>▼</span>
            </button>
        </div>
    );
}

function Field({ label, required = false, ...input }: { label: string; required?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={fieldLabel}>
                {label} {required && <span style={{ color: MW.red }}>*</span>}
            </span>
            <input {...input} aria-required={required || undefined} style={field} {...focusBorder} />
        </label>
    );
}

const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: MW.mute };

// 16px text keeps iOS from zooming the page when a field gets focus.
const field: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    height: 52,
    border: `1.5px solid ${MW.line2}`,
    borderRadius: 14,
    padding: '0 16px',
    fontFamily: 'inherit',
    fontSize: 16,
    color: MW.navy,
    background: '#fff',
    outline: 'none',
};

/** The fields drop the browser outline, so focus shows on the border instead. */
const focusBorder = {
    onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = MW.mint; },
    onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = MW.line2; },
};
