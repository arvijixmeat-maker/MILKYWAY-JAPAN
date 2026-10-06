import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { ICON } from '../mypage-desktop/myPageTheme';
import { useMe } from '../mypage-desktop/useMyPageData';
import { MobileShell } from '../mobile/MobileShell';
import { D, LINE_CHAT_URL, M_GRADIENT } from '../mobile/mobileTheme';
import { Ico, SubPageBar } from '../mobile/mobileUi';
import { ScreenBody } from '../mylists-mobile/myListsUi';
import { INQUIRY_EMAIL, INQUIRY_MAX, INQUIRY_TYPES, inquiryBody, inquiryMailto, inquirySubject, type Inquiry, type InquiryType } from './contactMail';

const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 700, color: MW.mute };
const field: CSSProperties = {
    boxSizing: 'border-box', width: '100%', border: `1.5px solid ${MW.line2}`, borderRadius: 14, fontFamily: 'inherit', fontSize: 16, color: MW.navy,
    background: '#fff', outline: 'none', boxShadow: 'none',
};
const ghostPill: CSSProperties = {
    display: 'flex', alignItems: 'center', height: 42, padding: '0 18px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#fff', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', boxSizing: 'border-box',
};

/**
 * Instant channels (LINE / Channel Talk) and the inquiry form. Submitting opens the visitor's
 * mail app with the form content addressed to the company — nothing is sent from the page itself.
 */
export function ContactPanel() {
    const { data: me } = useMe();
    const [type, setType] = useState<InquiryType>(INQUIRY_TYPES[0]);
    const [no, setNo] = useState('');
    const [msg, setMsg] = useState('');
    const [focus, setFocus] = useState<'no' | 'msg' | null>(null);
    const [opened, setOpened] = useState(false);
    const [copied, setCopied] = useState(false);

    const ok = !!msg.trim();
    const inquiry: Inquiry = { type, reservationNo: no, message: msg, name: me?.name, email: me?.email };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!ok) return;
        window.location.assign(inquiryMailto(inquiry));
        setCopied(false);
        setOpened(true);
    };
    const reset = () => {
        setType(INQUIRY_TYPES[0]);
        setNo('');
        setMsg('');
        setOpened(false);
    };
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(`${inquirySubject(inquiry)}\n\n${inquiryBody(inquiry)}`);
            setCopied(true);
        } catch (err) {
            console.error('Clipboard write failed:', err);
        }
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

            {!opened ? (
                <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 20, background: '#fff', border: `1px solid ${MW.line}` }}>
                    <span style={{ fontSize: 15, fontWeight: 900 }}>メールで問い合わせ</span>
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
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={fieldLabel}>予約番号（任意）</span>
                        <input
                            value={no}
                            onChange={(e) => setNo(e.target.value)}
                            onFocus={() => setFocus('no')}
                            onBlur={() => setFocus(null)}
                            placeholder="MN023"
                            maxLength={20}
                            autoComplete="off"
                            style={{ ...field, height: 50, padding: '0 14px', borderColor: focus === 'no' ? MW.mint : MW.line2 }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ ...fieldLabel, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span>内容 <span style={{ color: MW.red }}>*</span></span>
                            <span style={{ fontWeight: 500, color: MW.mute2 }}>{msg.length} / {INQUIRY_MAX}</span>
                        </span>
                        <textarea
                            rows={5}
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                            onFocus={() => setFocus('msg')}
                            onBlur={() => setFocus(null)}
                            placeholder="ご質問内容をご記入ください"
                            maxLength={INQUIRY_MAX}
                            required
                            style={{ ...field, padding: '12px 14px', lineHeight: 1.7, resize: 'vertical', borderColor: focus === 'msg' ? MW.mint : MW.line2 }}
                        />
                    </label>
                    <span style={{ fontSize: 11, lineHeight: 1.7, color: MW.mute, overflowWrap: 'anywhere' }}>
                        送信先：{INQUIRY_EMAIL}
                        {me?.email && <><br />ご登録メール：{me.email}（メール本文に記載されます）</>}
                        <br />「メールアプリで送信する」を押すと、入力内容を記載したメールが開きます。
                    </span>
                    <button
                        type="submit"
                        disabled={!ok}
                        style={{ height: 50, border: 0, borderRadius: 999, background: ok ? M_GRADIENT : MW.line3, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: ok ? MW.navy : MW.mute2, cursor: ok ? 'pointer' : 'default' }}
                    >
                        メールアプリで送信する
                    </button>
                </form>
            ) : (
                <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 20px', borderRadius: 20, background: '#fff', border: `1px solid ${MW.line}`, textAlign: 'center' }}>
                    <span style={{ width: 56, height: 56, borderRadius: '50%', background: MW.mintTint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ico d={D.mail} size={24} color={MW.mintDeep} />
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 900 }}>メールアプリで送信してください</span>
                    <span style={{ fontSize: 13, lineHeight: 1.7, color: MW.mute }}>
                        入力内容を記載したメールを作成しました。メールアプリで送信すると、お問い合わせが完了します。担当スタッフが確認後、メールでご返信します。
                    </span>
                    <span style={{ fontSize: 12, lineHeight: 1.7, color: MW.mute, overflowWrap: 'anywhere' }}>
                        メールアプリが開かない場合は、内容をコピーして <a href={`mailto:${INQUIRY_EMAIL}`} style={{ color: MW.mintDeep, fontWeight: 700 }}>{INQUIRY_EMAIL}</a> 宛にお送りいただくか、LINE・チャットでご相談ください。
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                        <a href={inquiryMailto(inquiry)} style={ghostPill}>もう一度メールアプリを開く</a>
                        <button type="button" onClick={copy} style={ghostPill}>{copied ? 'コピーしました' : '内容をコピー'}</button>
                        <button type="button" onClick={reset} style={ghostPill}>別の問い合わせをする</button>
                    </div>
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
