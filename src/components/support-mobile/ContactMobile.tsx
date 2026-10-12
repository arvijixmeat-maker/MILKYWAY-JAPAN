import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { ICON } from '../mypage-desktop/myPageTheme';
import { useMe } from '../mypage-desktop/useMyPageData';
import { MobileShell } from '../mobile/MobileShell';
import { LINE_CHAT_URL, M_GRADIENT } from '../mobile/mobileTheme';
import { Ico, SubPageBar } from '../mobile/mobileUi';
import { ScreenBody } from '../mylists-mobile/myListsUi';
import {
    INQUIRY_EMAIL, INQUIRY_MAX, INQUIRY_NAME_MAX, INQUIRY_NO_MAX, INQUIRY_TYPES, inquiryMailto, isInquiryEmail, type Inquiry, type InquiryType,
} from './contactMail';

const TICK = 'M5 12.5l4.5 4.5L19 7.5';

const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: MW.mute };
const field: CSSProperties = {
    boxSizing: 'border-box', width: '100%', border: `1.5px solid ${MW.line2}`, borderRadius: 14, fontFamily: 'inherit', fontSize: 16, color: MW.navy,
    background: '#fff', outline: 'none', boxShadow: 'none',
};
const ghostPill: CSSProperties = {
    display: 'flex', alignItems: 'center', height: 42, padding: '0 18px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#fff', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box',
};
const required = <span style={{ color: MW.red }}>*</span>;
/** Off-screen for people, still in the DOM for form-filling bots. */
const trapBox: CSSProperties = {
    position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, border: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
};

type SendState = 'idle' | 'sending' | 'sent' | 'failed';
type FieldKey = 'who' | 'addr' | 'no' | 'msg';

const RETRY_LATER = 'ただいま送信できません。しばらく時間をおいてから、もう一度お試しください。';
const FAILURE_TEXT: Record<string, string> = {
    RATE_LIMITED: `短時間に多くのお問い合わせをいただいております。${RETRY_LATER}`,
    BUSY: `お問い合わせが集中しております。${RETRY_LATER}`,
    EMAIL_REQUIRED: 'メールアドレスをご入力ください。',
    EMAIL_INVALID: 'メールアドレスの形式をご確認ください。',
    MESSAGE_REQUIRED: 'お問い合わせ内容をご入力ください。',
    MESSAGE_TOO_LONG: 'お問い合わせ内容が長すぎます。文章を短くしてお試しください。',
    NAME_TOO_LONG: 'お名前が長すぎます。短くしてお試しください。',
};
const FAILURE_DEFAULT = '送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。';

/**
 * Instant channels (LINE / Channel Talk) and the inquiry form. The form is received by
 * /api/inquiries; when that fails, the same content can be sent from the visitor's mail app.
 */
export function ContactPanel() {
    const { data: me } = useMe();
    const [type, setType] = useState<InquiryType>(INQUIRY_TYPES[0]);
    // null = untouched, so the account's name / e-mail show once it has loaded.
    const [nameInput, setNameInput] = useState<string | null>(null);
    const [emailInput, setEmailInput] = useState<string | null>(null);
    const [no, setNo] = useState('');
    const [msg, setMsg] = useState('');
    const [trap, setTrap] = useState('');
    const [focus, setFocus] = useState<FieldKey | null>(null);
    const [state, setState] = useState<SendState>('idle');
    const [failure, setFailure] = useState('');
    const [emailError, setEmailError] = useState(false);

    // Signed-in members are answered at their account address.
    const accountEmail = me?.email?.trim() || '';
    const name = nameInput ?? me?.name ?? '';
    const email = accountEmail || (emailInput ?? '');

    const sending = state === 'sending';
    const ok = !!msg.trim() && !!name.trim() && !!email.trim();
    const inquiry: Inquiry = { type, reservationNo: no, message: msg, name: name.trim(), email: email.trim() };

    const border = (key: FieldKey, invalid = false) => (invalid ? MW.red : focus === key ? MW.mint : MW.line2);
    const focusProps = (key: FieldKey) => ({ onFocus: () => setFocus(key), onBlur: () => setFocus(null) });

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ok || sending) return;
        if (!isInquiryEmail(email.trim())) {
            setEmailError(true);
            return;
        }
        setState('sending');
        setFailure('');
        try {
            await api.inquiries.create({
                name: name.trim(),
                email: email.trim(),
                kind: type,
                reservation_number: no.trim(),
                message: msg.trim(),
                website: trap,
            });
            setState('sent');
        } catch (err) {
            const code = err instanceof Error ? err.message : '';
            if (code === 'EMAIL_INVALID' || code === 'EMAIL_REQUIRED') setEmailError(true);
            setFailure(FAILURE_TEXT[code] || FAILURE_DEFAULT);
            setState('failed');
        }
    };
    const reset = () => {
        setType(INQUIRY_TYPES[0]);
        setNo('');
        setMsg('');
        setFailure('');
        setState('idle');
    };

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                <a href={LINE_CHAT_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 18, background: '#06C755', color: '#FFFFFF', textDecoration: 'none', minWidth: 0 }}>
                    <span style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600 }}>LINE</span>
                    <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>LINEで相談</span>
                    <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>平均3時間以内に返信</span>
                </a>
                <button type="button" onClick={() => window.openChannelTalk?.()} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 18, background: '#FFFFFF', border: `1px solid ${MW.line}`, color: MW.navy, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                    <Ico d={ICON.chat} size={20} color={MW.mintDeep} />
                    <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>チャットで相談</span>
                    <span style={{ maxWidth: '100%', fontSize: 11, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>この画面でそのまま相談</span>
                </button>
            </div>

            {state !== 'sent' ? (
                <form onSubmit={submit} noValidate style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 20, background: '#fff', border: `1px solid ${MW.line}` }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>フォームで問い合わせ</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span id="contact-type" style={fieldLabel}>お問い合わせ種別</span>
                        <div role="group" aria-labelledby="contact-type" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {INQUIRY_TYPES.map((t) => {
                                const on = t === type;
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setType(t)}
                                        style={{ height: 38, padding: '0 14px', borderRadius: 999, border: `1.5px solid ${on ? MW.mint : MW.line2}`, background: on ? MW.mintTint : '#FFFFFF', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                            <span style={fieldLabel}>お名前 {required}</span>
                            <input
                                value={name}
                                onChange={(e) => setNameInput(e.target.value)}
                                {...focusProps('who')}
                                placeholder="山田 太郎"
                                maxLength={INQUIRY_NAME_MAX}
                                autoComplete="name"
                                required
                                style={{ ...field, height: 50, padding: '0 14px', borderColor: border('who') }}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                            <span style={fieldLabel}>メールアドレス {required}</span>
                            <input
                                type="email"
                                inputMode="email"
                                value={email}
                                onChange={(e) => {
                                    setEmailInput(e.target.value);
                                    setEmailError(false);
                                }}
                                {...focusProps('addr')}
                                placeholder="example@mail.jp"
                                maxLength={254}
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                readOnly={!!accountEmail}
                                required
                                aria-invalid={emailError}
                                aria-describedby={emailError ? 'contact-email-error' : undefined}
                                style={{ ...field, height: 50, padding: '0 14px', borderColor: border('addr', emailError), background: accountEmail ? MW.chip : '#fff', color: accountEmail ? MW.ink3 : MW.navy }}
                            />
                            {emailError && (
                                <span id="contact-email-error" role="alert" style={{ fontSize: 12, fontWeight: 700, color: MW.red }}>メールアドレスの形式をご確認ください。</span>
                            )}
                        </label>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={fieldLabel}>予約番号（任意）</span>
                        <input
                            value={no}
                            onChange={(e) => setNo(e.target.value)}
                            {...focusProps('no')}
                            placeholder="MN023"
                            maxLength={INQUIRY_NO_MAX}
                            autoComplete="off"
                            style={{ ...field, height: 50, padding: '0 14px', borderColor: border('no') }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span>内容 {required}</span>
                            <span style={{ fontWeight: 500, color: MW.mute2 }}>{msg.length} / {INQUIRY_MAX}</span>
                        </span>
                        <textarea
                            rows={5}
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            {...focusProps('msg')}
                            placeholder="ご質問内容をご記入ください"
                            maxLength={INQUIRY_MAX}
                            required
                            style={{ ...field, padding: '12px 14px', lineHeight: 1.7, resize: 'vertical', borderColor: border('msg') }}
                        />
                    </label>
                    <div aria-hidden="true" style={trapBox}>
                        <label>
                            この欄は入力しないでください
                            <input type="text" name="mw_hp_field" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
                        </label>
                    </div>
                    <span style={{ fontSize: 11, lineHeight: 1.7, color: MW.mute, overflowWrap: 'anywhere' }}>
                        {accountEmail ? 'ご登録のメールアドレス' : 'ご入力のメールアドレス'}宛に、日本語スタッフよりご返信します。
                        <br />メールで直接お送りいただく場合：<a href={`mailto:${INQUIRY_EMAIL}`} style={{ color: MW.mintDeep, fontWeight: 700 }}>{INQUIRY_EMAIL}</a>
                    </span>
                    {state === 'failed' && (
                        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, background: '#FDF1EF', border: '1px solid #F4CFCA' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.7, color: MW.redDeep }}>{failure}</span>
                            <span style={{ fontSize: 12, lineHeight: 1.7, color: MW.ink3 }}>お急ぎの場合は、入力内容をメールアプリからお送りいただくか、LINEでご相談ください。</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <a href={inquiryMailto(inquiry)} style={ghostPill}>メールアプリで送信する</a>
                                <a href={LINE_CHAT_URL} target="_blank" rel="noopener noreferrer" style={ghostPill}>LINEで相談</a>
                            </div>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={!ok || sending}
                        aria-busy={sending}
                        style={{ height: 50, border: 0, borderRadius: 999, background: ok && !sending ? M_GRADIENT : MW.line3, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: ok && !sending ? MW.navy : MW.mute2, cursor: ok && !sending ? 'pointer' : 'default' }}
                    >
                        {sending ? '送信中…' : state === 'failed' ? 'もう一度送信する' : '送信する'}
                    </button>
                </form>
            ) : (
                <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 20px', borderRadius: 20, background: '#fff', border: `1px solid ${MW.line}`, textAlign: 'center' }}>
                    <span style={{ width: 56, height: 56, borderRadius: '50%', background: MW.mintTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ico d={TICK} size={26} color={MW.mintDeep} width={2.4} />
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 900 }}>送信しました</span>
                    <span style={{ fontSize: 13, lineHeight: 1.7, color: MW.mute, overflowWrap: 'anywhere' }}>
                        お問い合わせを受け付けました。日本語スタッフが内容を確認のうえ、ご入力のメールアドレス（{email.trim()}）へ返信いたします。
                    </span>
                    <span style={{ fontSize: 12, lineHeight: 1.7, color: MW.mute2 }}>
                        返信が届かない場合は、迷惑メールフォルダもあわせてご確認ください。
                    </span>
                    <button type="button" onClick={reset} style={ghostPill}>別の問い合わせをする</button>
                </div>
            )}
        </>
    );
}

/** Mobile お問い合わせ (Claude Design: "M Contact"). */
export function ContactMobile() {
    const navigate = useNavigate();
    const back = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/');
    };

    return (
        <MobileShell>
            <SubPageBar title="お問い合わせ" onBack={back} />
            <ScreenBody eyebrow="CONTACT" lead="日本語スタッフが24時間以内にご返信します。" label="お問い合わせ">
                <ContactPanel />
            </ScreenBody>
        </MobileShell>
    );
}
