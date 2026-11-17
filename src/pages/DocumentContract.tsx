import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { COMPANY_INFO, CONTRACT_NOTICES, DEPOSIT_PAYMENT_METHOD, PRIVACY_NOTICES, OTHER_NOTICES, CONTRACT_CANCELLATION_ROWS, resolveCancellationRows, resolveDepositMethod } from '../constants/company';

/**
 * ご旅行契約書（고객용）— Claude Design 「Japan version Contract」 시안.
 * 민트(#00A88B) · 네이비(#123B3A) · Noto Sans JP / Inter / Anton.
 * 고객이 여권 정보·항공편·동의 + 서명(이름 + 손글씨 전자서명)을 넣어 보낸다.
 * 약관·주의사항 문구는 constants/company.ts 의 실제 문구 그대로 (디자인 파일의 문구는 샘플).
 */

interface Traveler {
    name?: string;
    passportName?: string;
    age?: number | string;
    birthdate?: string;
    phone?: string;
    gender?: string;
}
type Flight = { date?: string; time?: string; flight?: string };

interface ContractData {
    travelers?: Traveler[];
    arrival?: Flight;
    departure?: Flight;
    region?: string;
    category?: string;
    issuedDate?: string;
    /** signature — 손글씨 전자서명 PNG (data URL) */
    agreement?: { agreed?: boolean; name?: string; agreedAt?: string; signature?: string };
    customerSubmittedAt?: string;
}

interface ContractSettings {
    intro?: string;
    paymentMethod?: string;
    paymentDeadline?: string;
    includedText?: string;
    excludedText?: string;
    cancellationRows?: { period: string; fee: string }[];
    signatureNote?: string;
}

interface ContractPageData {
    reservation: {
        id: string;
        reservationNumber: string | null;
        productName: string;
        customerName: string;
        customerPhone?: string;
        travelers: number;
        startDate: string;
        endDate: string;
        totalPrice: number;
        depositAmount: number;
        balanceAmount: number;
        createdAt: string;
    };
    contract: ContractData;
    template?: { id: string; name: string; description?: string; documentSettings?: { contract?: ContractSettings } } | null;
    accommodations: Array<{ day: number; accommodation: { name: string; type?: string; location?: string } }>;
    guide: { name?: string; phone?: string; languages?: any; specialties?: any } | null;
    productIncluded?: string[];
    productExcluded?: string[];
}

const fallbackContract: Required<ContractSettings> = {
    intro: '本旅行条件書および下記の旅行条件に基づき、募集型企画旅行契約を締結いたします。',
    paymentMethod: DEPOSIT_PAYMENT_METHOD,
    paymentDeadline: 'ご案内メールに記載の期日まで',
    includedText: '宿泊費、食事代、専用車、ドライバー、日本語ガイド、日程表記載の体験料金',
    excludedText: '国際航空券、海外旅行保険、個人的費用、日程表に記載のない食事',
    cancellationRows: CONTRACT_CANCELLATION_ROWS,
    signatureNote: '上記内容を確認し、同意の上、本契約を締結いたします。',
};

// ── 색 · 글꼴 (디자인 토큰) ──
const C = {
    ink: '#123B3A', sub: '#5F7674', mute: '#8A9E9B', body: '#3F5856', faint: '#B6C7C3',
    line: '#DDEBE7', line2: '#EEF3F1', bg: '#F7FAF9', mint: '#00A88B', mintDeep: '#007F75', mintHi: '#06C4A0', mintBg: '#E8FAF5',
};
const GRAD = 'linear-gradient(160deg,#007F75 0%,#06C4A0 100%)';
const JP = "'Noto Sans JP','Pretendard Variable',Pretendard,sans-serif";
const EN = "'Inter',sans-serif";
const EN_JP = "'Inter','Noto Sans JP',sans-serif";
const ANTON = "'Anton',sans-serif";

const PAGE_CSS = `
.mwc{color:${C.ink};font-family:${JP};-webkit-font-smoothing:antialiased;line-break:strict}
.mwc input,.mwc select,.mwc button{font-family:inherit}
.mwc input:focus,.mwc select:focus{outline:none;border-color:${C.mintHi} !important;box-shadow:0 0 0 3px rgba(6,196,160,0.3)}
.mwc-pick:focus-within{border-color:${C.mintHi} !important;box-shadow:0 0 0 3px rgba(6,196,160,0.3)}
.mwc-ghost:hover{background:${C.bg} !important;color:${C.ink} !important}
.mwc-add:hover{background:#D4F5EC !important}
.mwc-print:hover{border-color:${C.mintHi} !important;color:${C.mintDeep} !important}
@media print{
  html,body,.mwc-bg{background:#FFFFFF !important}
  .mwc-bg{padding:0 !important}
  [data-noprint]{display:none !important}
}
@page{margin:12mm}
`;

const fmtDate = (iso?: string) => {
    if (!iso) return '-';
    const m = String(iso).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}/${+m[2]}/${+m[3]}`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};
const jpDate = (v?: string) => {
    const m = String(v || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : '';
};
const yenNum = (n?: number) => (typeof n === 'number' && !Number.isNaN(n) ? n.toLocaleString('ja-JP') : '-');
const splitLines = (value?: string) => (value || '').split(/\r?\n|、|,/).map(v => v.trim()).filter(Boolean);
const dash = (v?: string) => (v && String(v).trim() ? String(v) : '-');
const flightLine = (f?: Flight) => [f?.flight, f?.time].filter(Boolean).join(' / ') || '-';
/** 취소 규정 문구에서 결론 부분(返金不可 등)만 굵게 */
const emphasize = (text: string) => {
    const m = text.match(/(返金不可|返金はありません|不要|全額|\d+\s*%)/);
    if (!m || m.index === undefined) return <>{text}</>;
    return <>{text.slice(0, m.index)}<strong style={{ color: C.ink }}>{m[0]}</strong>{text.slice(m.index + m[0].length)}</>;
};

// ── 작은 조각들 ──
const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.mintDeep }) => (
    <span style={{ fontFamily: EN, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color }}>{children}</span>
);
const NumHead: React.FC<{ n: string; title: string; muted?: boolean }> = ({ n, title, muted }) => (
    <h2 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>
        <span style={{ fontFamily: ANTON, fontSize: 26, fontWeight: 400, lineHeight: 1, color: muted ? C.faint : C.mint }}>{n}</span>{title}
    </h2>
);
const KickHead: React.FC<{ kicker: string; title: string }> = ({ kicker, title }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Kicker>{kicker}</Kicker>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>{title}</h2>
    </div>
);
const KvTable: React.FC<{ rows: Array<[string, React.ReactNode]>; valueFont?: string }> = ({ rows, valueFont }) => (
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
        {rows.map(([k, v], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px,30%) minmax(0,1fr)', borderTop: i ? `1px solid ${C.line2}` : 0 }}>
                <span style={{ padding: '14px 16px', background: C.bg, fontSize: 12, fontWeight: 700, color: C.sub }}>{k}</span>
                <span style={{ padding: '14px 16px', fontFamily: valueFont, fontSize: 13, fontWeight: 500, color: C.ink, lineHeight: 1.6, wordBreak: 'break-word' }}>{v}</span>
            </div>
        ))}
    </div>
);
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>{children}</span>
);
const inputStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    height: 48, padding: '0 14px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#FFFFFF',
    fontSize: 15, color: C.ink, boxSizing: 'border-box', width: '100%', ...extra,
});
const CalIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mintDeep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" /></svg>
);
const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.mintDeep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" /></svg>
);
/** 날짜·시각 — 보이는 칸은 일본어 표기, 실제 입력은 투명한 기본 입력칸 (휴대폰 달력이 그대로 열림) */
const PickField: React.FC<{ label: string; type: 'date' | 'time'; value?: string; onChange: (v: string) => void }> = ({ label, type, value, onChange }) => {
    const shown = type === 'date' ? jpDate(value) : (value || '');
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>{label}</Label>
            <span className="mwc-pick" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, height: 48, padding: '0 12px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#FFFFFF', boxSizing: 'border-box', width: '100%' }}>
                <span style={{ fontFamily: EN_JP, fontSize: 14, color: shown ? C.ink : C.mute, whiteSpace: 'nowrap', overflow: 'hidden' }}>{shown || (type === 'date' ? '年 / 月 / 日' : '-- : --')}</span>
                {type === 'date' ? <CalIcon /> : <ClockIcon />}
                <input type={type} lang="ja" value={value || ''} onChange={e => onChange(e.target.value)} aria-label={label}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', border: 0, padding: 0, margin: 0, boxSizing: 'border-box' }} />
            </span>
        </label>
    );
};

/** 손글씨 서명 칸 — 손가락·마우스로 그리면 PNG(data URL)로 돌려준다. value 가 있으면 다시 그려 둔다 */
const SignaturePad: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    const valueRef = useRef(value);
    valueRef.current = value;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    /** 이 칸에서 마지막으로 그려 내보낸 값 (바깥 값과 구분) */
    const emitted = useRef('');

    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ink = () => { const x = c.getContext('2d')!; x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = C.ink; x.fillStyle = C.ink; return x; };
        const fit = () => {
            const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
            if (!r.width) return;
            c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
            const x = c.getContext('2d')!; x.setTransform(d, 0, 0, d, 0, 0); ink();
            if (valueRef.current) { const im = new Image(); im.onload = () => x.drawImage(im, 0, 0, r.width, r.height); im.src = valueRef.current; }
        };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(c);
        let on = false, last: [number, number] | null = null, drew = false;
        const pt = (e: PointerEvent): [number, number] => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        const down = (e: PointerEvent) => {
            if (c.dataset.disabled === '1') return;
            on = true; drew = true; last = pt(e); c.setPointerCapture(e.pointerId);
            const x = ink(); x.beginPath(); x.arc(last[0], last[1], 1.2, 0, Math.PI * 2); x.fill();
        };
        const move = (e: PointerEvent) => {
            if (!on || !last) return;
            const p = pt(e), x = ink(); x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p;
        };
        const end = () => {
            if (!on) return;
            on = false;
            if (!drew) return;
            // 저장용은 폭 최대 720px 로 줄인다 (고해상도 휴대폰에서 수백 KB 가 되지 않게)
            const w = Math.min(c.width, 720), h = Math.round(c.height * (w / c.width));
            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            tmp.getContext('2d')?.drawImage(c, 0, 0, w, h);
            const url = tmp.toDataURL('image/png');
            emitted.current = url;
            onChangeRef.current(url);
        };
        c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end); c.addEventListener('pointerleave', end);
        return () => {
            ro.disconnect();
            c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move);
            c.removeEventListener('pointerup', end); c.removeEventListener('pointercancel', end); c.removeEventListener('pointerleave', end);
        };
    }, []);

    // 바깥에서 바뀐 값(저장된 서명 불러오기 · 「書き直す」로 비우기)이면 칸을 다시 그린다 — 직접 그린 값은 그대로
    useEffect(() => {
        const c = ref.current;
        if (!c || value === emitted.current) return;
        const x = c.getContext('2d');
        if (!x) return;
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); x.restore();
        if (value) {
            const r = c.getBoundingClientRect();
            const im = new Image();
            im.onload = () => x.drawImage(im, 0, 0, r.width, r.height);
            im.src = value;
        }
        emitted.current = value;
    }, [value]);

    return (
        <div style={{ position: 'relative', height: 160, border: `1.5px solid ${value ? C.mintHi : C.line}`, borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
            {!value && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" /></svg>
                    <span style={{ fontSize: 12, color: C.mute }}>ここにご署名ください</span>
                </span>
            )}
            <span style={{ position: 'absolute', left: 20, right: 20, bottom: 36, borderBottom: `1px dashed ${C.line}`, pointerEvents: 'none' }} />
            <canvas ref={ref} data-disabled={disabled ? '1' : '0'} aria-label="電子署名欄"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: disabled ? 'default' : 'crosshair' }} />
        </div>
    );
};

export const DocumentContract: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ContractPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formTravelers, setFormTravelers] = useState<Traveler[]>([]);
    const [arrival, setArrival] = useState<Flight>({});
    const [departure, setDeparture] = useState<Flight>({});
    const [agreed, setAgreed] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [signature, setSignature] = useState('');
    const [saving, setSaving] = useState(false);
    /** 서버에 보낸 뒤 아무것도 고치지 않은 상태 */
    const [sent, setSent] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try {
                setData(await api.documents.contract.get(reservationId));
            } catch (e: any) {
                setError(e.message || '契約書を読み込めませんでした。');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

    // 글꼴 — 이 페이지에서만 불러온다
    useEffect(() => {
        const id = 'doc-contract-fonts';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Anton&display=swap';
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        if (!data) return;
        const c: ContractData = data.contract || {};
        const existing: Traveler[] = Array.isArray(c.travelers) ? c.travelers : [];
        const count = existing.length > 0
            ? existing.length
            : Math.max(1, parseInt(String(data.reservation.travelers || '').replace(/[^0-9]/g, '')) || 1);
        setFormTravelers(Array.from({ length: count }, (_, i) => ({
            name: existing[i]?.name || (i === 0 ? data.reservation.customerName : '') || '',
            passportName: existing[i]?.passportName || '',
            birthdate: existing[i]?.birthdate || '',
            gender: existing[i]?.gender || '',
            phone: existing[i]?.phone || (i === 0 ? data.reservation.customerPhone : '') || '',
        })));
        setArrival({ date: c.arrival?.date || '', time: c.arrival?.time || '', flight: c.arrival?.flight || '' });
        setDeparture({ date: c.departure?.date || '', time: c.departure?.time || '', flight: c.departure?.flight || '' });
        if (c.agreement?.agreed) {
            setAgreed(true);
            setSignerName(c.agreement.name || '');
            setSignature(c.agreement.signature || '');
            setSent(true);
        }
    }, [data]);

    const touched = () => { setSent(false); setSubmitError(''); };
    const updTraveler = (i: number, field: keyof Traveler, val: string) => {
        setFormTravelers(prev => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
        touched();
    };

    const canSubmit = agreed && signerName.trim().length > 0 && !!signature && !saving;
    const handleSubmit = async () => {
        if (!reservationId || !canSubmit) return;
        setSaving(true);
        setSubmitError('');
        try {
            const agreement = { agreed: true, name: signerName.trim(), signature };
            const res = await api.documents.contract.saveCustomer(reservationId, { travelers: formTravelers, arrival, departure, agreement });
            setData(prev => (prev ? { ...prev, contract: res?.contract || { ...prev.contract, travelers: formTravelers, arrival, departure, agreement } } : prev));
            setSent(true);
        } catch (e: any) {
            setSubmitError(`送信に失敗しました。時間をおいて再度お試しください。${e?.message ? `（${e.message}）` : ''}`);
        } finally {
            setSaving(false);
        }
    };

    const shell = (body: React.ReactNode) => (
        <>
            <SEO title="ご旅行契約書" description="お客様専用の旅行契約書です。" robots="noindex, nofollow" />
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: C.bg, fontFamily: JP }}>{body}</div>
        </>
    );
    if (loading) return shell(<div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: C.line, borderTopColor: C.mint }} />);
    if (error || !data) {
        return shell(
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 8 }}>契約書を表示できません</p>
                <p style={{ fontSize: 14, color: C.sub }}>{error || 'URLをご確認ください。'}</p>
            </div>,
        );
    }

    const { reservation, contract, accommodations, guide, template } = data;
    const settings = { ...fallbackContract, ...(template?.documentSettings?.contract || {}) };
    const issuedDate = fmtDate(contract.issuedDate || reservation.createdAt?.split('T')[0] || '');
    const contractNumber = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const cancellationRows = resolveCancellationRows(settings.cancellationRows);
    const depositMethod = resolveDepositMethod(settings.paymentMethod);
    const pick = (fromProduct: string[] | undefined, text: string, fallback: string) => {
        const list = fromProduct && fromProduct.length ? fromProduct : splitLines(text);
        return list.length ? list : splitLines(fallback);
    };
    const included = pick(data.productIncluded, settings.includedText, fallbackContract.includedText);
    const excluded = pick(data.productExcluded, settings.excludedText, fallbackContract.excludedText);
    const balance = reservation.balanceAmount ?? (reservation.totalPrice - (reservation.depositAmount || 0));
    const terms = [...CONTRACT_NOTICES, ...PRIVACY_NOTICES, ...OTHER_NOTICES];
    const savedSig = contract.agreement?.agreed ? contract.agreement : null;

    const tripRows: Array<[string, React.ReactNode]> = [
        ['ご旅行名', reservation.productName],
        ['ご旅行期間', `${fmtDate(reservation.startDate)} 〜 ${fmtDate(reservation.endDate)}`],
        ['参加人数', `${reservation.travelers}名`],
        ['お客様名', `${reservation.customerName} 様`],
        ['旅行形態', contract.category || '貸切プライベートツアー'],
        ['地域', contract.region || '-'],
        ['ガイド', guide?.name ? `${guide.name}${guide.phone ? `（${guide.phone}）` : ''}` : '日本語ガイドが同行します'],
    ];
    const companyRows: Array<[string, React.ReactNode]> = [
        ['会社名', COMPANY_INFO.nameJa],
        ['電話番号', COMPANY_INFO.phoneKR],
        ['代表者', COMPANY_INFO.representative || COMPANY_INFO.ceo],
        ['登録番号', COMPANY_INFO.registrationNumber],
        ['Web', COMPANY_INFO.website],
    ];
    const flightCells: Array<[string, string]> = [
        ['到着日', fmtDate(arrival.date || reservation.startDate)],
        ['出発日', fmtDate(departure.date || reservation.endDate)],
        ['到着便', flightLine(arrival)],
        ['出発便', flightLine(departure)],
    ];
    const cell = (k: string, v: string, mint = false, en = true) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 14, background: mint ? C.mintBg : C.bg, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: mint ? C.mintDeep : C.mute }}>{k}</span>
            <span style={{ fontFamily: en ? EN_JP : JP, fontSize: 13, fontWeight: en ? 600 : 700, color: C.ink, wordBreak: 'break-word' }}>{v}</span>
        </span>
    );
    const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 20, background: '#FFFFFF', border: `1px solid ${C.line}` };
    const grid = (min: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${min}px),1fr))`, gap: 12 });

    return (
        <>
            <SEO title="ご旅行契約書" description="お客様専用の旅行契約書です。" robots="noindex, nofollow" />
            <style>{PAGE_CSS}</style>
            <div className="mwc-bg" style={{ minHeight: '100vh', background: C.bg }}>
                <div className="mwc" style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px 56px', boxSizing: 'border-box' }}>
                    <div style={{ background: '#FFFFFF', borderRadius: 28, padding: 'clamp(20px,5vw,48px)', display: 'flex', flexDirection: 'column', gap: 44, boxSizing: 'border-box' }}>

                        {/* 01 머리 */}
                        <header style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>{COMPANY_INFO.nameJa}</span>
                                    <Kicker>MILKYWAY JAPAN</Kicker>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                                    {([['発行日', issuedDate], ['契約番号', contractNumber]] as const).map(([k, v]) => (
                                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999, background: C.bg, fontSize: 11, color: C.sub, whiteSpace: 'nowrap' }}>
                                            {k}<strong style={{ fontFamily: EN, fontWeight: 600, color: C.ink }}>{v}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
                                <span style={{ fontFamily: ANTON, fontSize: 26, lineHeight: 1, letterSpacing: '0.02em', background: GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>TRAVEL CONTRACT</span>
                                <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.25, color: C.ink }}>ご旅行契約書</h1>
                                <p style={{ margin: 0, maxWidth: 520, fontSize: 13, lineHeight: 1.75, color: C.sub }}>{settings.intro}</p>
                            </div>
                        </header>

                        {/* 02 고객 입력 (화면 전용) */}
                        <section data-noprint="" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 'clamp(18px,4vw,28px)', borderRadius: 24, background: C.bg }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <Kicker>CUSTOMER INFORMATION</Kicker>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink }}>お客様情報の確認</h2>
                                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: C.sub }}>パスポート情報と同意内容をご確認ください。入力後、旅行会社へ送信されます。</p>
                            </div>

                            {formTravelers.map((tv, i) => (
                                <div key={i} style={{ ...card, gap: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                            <span style={{ width: 26, height: 26, borderRadius: 8, background: C.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: EN, fontSize: 12, fontWeight: 700, color: C.mintDeep }}>{i + 1}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>旅行者 {i + 1}</span>
                                        </span>
                                        {formTravelers.length > 1 && (
                                            <button type="button" className="mwc-ghost" aria-label={`旅行者 ${i + 1} を削除`}
                                                onClick={() => { setFormTravelers(prev => prev.filter((_, idx) => idx !== i)); touched(); }}
                                                style={{ height: 32, padding: '0 10px', border: 0, borderRadius: 10, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.mute, cursor: 'pointer' }}>× 削除</button>
                                        )}
                                    </div>
                                    <div style={grid(220)}>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Label>氏名</Label>
                                            <input value={tv.name || ''} onChange={e => updTraveler(i, 'name', e.target.value)} placeholder="山田 太郎" style={inputStyle()} /></label>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Label>パスポート表記名</Label>
                                            <input value={tv.passportName || ''} onChange={e => updTraveler(i, 'passportName', e.target.value.toUpperCase())} placeholder="YAMADA TARO" autoCapitalize="characters" style={inputStyle({ fontFamily: EN, letterSpacing: '0.02em' })} /></label>
                                        <PickField label="生年月日" type="date" value={tv.birthdate} onChange={v => updTraveler(i, 'birthdate', v)} />
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Label>性別</Label>
                                            <select value={tv.gender || ''} onChange={e => updTraveler(i, 'gender', e.target.value)} style={inputStyle({ padding: '0 12px' })}>
                                                <option value="">選択してください</option><option value="男性">男性</option><option value="女性">女性</option><option value="その他">その他</option>
                                            </select></label>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}><Label>電話番号</Label>
                                            <input type="tel" value={tv.phone || ''} onChange={e => updTraveler(i, 'phone', e.target.value)} placeholder="090-1234-5678" style={inputStyle({ fontFamily: EN })} /></label>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="mwc-add" onClick={() => { setFormTravelers(prev => [...prev, { name: '', passportName: '', birthdate: '', gender: '', phone: '' }]); touched(); }}
                                style={{ height: 52, border: `1.5px dashed ${C.mintHi}`, borderRadius: 16, background: C.mintBg, fontSize: 14, fontWeight: 700, color: C.mintDeep, cursor: 'pointer' }}>＋ 旅行者を追加</button>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: C.ink }}>フライト情報（航空券）</h3>
                                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: C.sub }}>空港送迎の手配に使用します。往復のフライト日付・時刻・便名をできるだけ詳しくご記入ください。</p>
                            </div>
                            <div style={grid(300)}>
                                {([['ARRIVAL', '到着便（モンゴル着）', arrival, setArrival, '例：OM502（成田→ウランバートル）'], ['DEPARTURE', '出発便（モンゴル発）', departure, setDeparture, '例：OM501（ウランバートル→成田）']] as const).map(([en, ja, f, set, ph]) => (
                                    <div key={en} style={card}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontFamily: EN, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintDeep }}>{en}</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{ja}</span>
                                        </span>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                                            <PickField label="日付" type="date" value={f.date} onChange={v => { set(p => ({ ...p, date: v })); touched(); }} />
                                            <PickField label="時刻" type="time" value={f.time} onChange={v => { set(p => ({ ...p, time: v })); touched(); }} />
                                        </div>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Label>便名</Label>
                                            <input value={f.flight || ''} onChange={e => { const v = e.target.value; set(p => ({ ...p, flight: v })); touched(); }} placeholder={ph} style={inputStyle({ fontSize: 14 })} /></label>
                                    </div>
                                ))}
                            </div>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 8, padding: 16, borderRadius: 16, background: '#FFFFFF', border: `1.5px solid ${agreed ? C.mintHi : C.line}`, cursor: 'pointer' }}>
                                <input type="checkbox" checked={agreed} onChange={() => { setAgreed(v => !v); touched(); }}
                                    style={{ flex: 'none', width: 22, height: 22, margin: 0, accentColor: C.mint, cursor: 'pointer' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: C.ink }}>旅行契約内容、旅行条件、取消規定を確認し、<span style={{ color: C.mintDeep }}>同意します。</span></span>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Label>署名（お名前）</Label>
                                <input value={signerName} onChange={e => { setSignerName(e.target.value); touched(); }} placeholder="お名前を入力してください" style={inputStyle({ height: 52, padding: '0 16px', fontSize: 16 })} /></label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                    <Label>電子署名（枠内に指またはマウスでご署名ください）</Label>
                                    <button type="button" className="mwc-ghost" onClick={() => { setSignature(''); touched(); }}
                                        style={{ flex: 'none', height: 30, padding: '0 10px', border: 0, borderRadius: 8, background: 'transparent', fontSize: 12, fontWeight: 600, color: C.mute, cursor: 'pointer' }}>書き直す</button>
                                </div>
                                <SignaturePad value={signature} onChange={v => { setSignature(v); touched(); }} />
                            </div>
                            <button type="button" onClick={handleSubmit} disabled={!canSubmit || sent}
                                style={{ height: 56, border: 0, borderRadius: 14, background: sent ? C.mintBg : canSubmit ? GRAD : C.line, boxShadow: canSubmit && !sent ? '0 10px 24px rgba(0,168,139,0.28)' : 'none', fontSize: 16, fontWeight: 700, color: sent ? C.mintDeep : canSubmit ? '#FFFFFF' : C.mute, cursor: canSubmit && !sent ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
                                {saving ? '送信中…' : sent ? '送信済み' : savedSig ? '内容を更新して再送信する' : '同意して送信する'}
                            </button>
                            {!canSubmit && !sent && (
                                <span style={{ textAlign: 'center', fontSize: 11, color: C.mute }}>同意のチェック・お名前・電子署名の3点がそろうと送信できます。</span>
                            )}
                            {sent && <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: C.mintDeep }}>送信が完了しました。担当者より確認のご連絡をいたします。内容を変更すると再送信できます。</span>}
                            {submitError && <span role="alert" style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#C0392B' }}>{submitError}</span>}
                        </section>

                        {/* 01 여행 내용 */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <NumHead n="01" title="ご旅行内容" />
                            <KvTable rows={tripRows} />
                        </section>

                        {/* 02 지불 조건 */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <NumHead n="02" title="お支払い条件" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 22, borderRadius: 20, background: C.ink, color: '#FFFFFF' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.faint }}>合計金額</span>
                                    <span style={{ fontFamily: EN, fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{yenNum(reservation.totalPrice)}<span style={{ marginLeft: 2, fontFamily: JP, fontSize: 16 }}>円</span></span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10 }}>
                                    {([['予約金', 'STEP 1', reservation.depositAmount ? yenNum(reservation.depositAmount) : '-', `${depositMethod}（ご予約確定時）`, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.14)', C.faint],
                                        ['残金', 'STEP 2', yenNum(balance), '現地にて現金（日本円）でお支払い', GRAD, 'rgba(255,255,255,0.22)', '#FFFFFF']] as const).map(([k, step, v, note, bg, chip, noteC]) => (
                                        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 16, borderRadius: 16, background: bg }}>
                                            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700 }}>{k}</span>
                                                <span style={{ height: 22, padding: '0 8px', borderRadius: 6, background: chip, fontFamily: EN, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center' }}>{step}</span>
                                            </span>
                                            <span style={{ fontFamily: EN, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{v}{v !== '-' && <span style={{ fontFamily: JP, fontSize: 13 }}>円</span>}</span>
                                            <span style={{ fontSize: 11, color: noteC }}>{note}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <KvTable rows={[['支払方法', `予約金：${depositMethod} ／ 残金：現地にて現金（日本円）`], ['支払期限', settings.paymentDeadline]]} />
                        </section>

                        {/* 03 / 04 포함 · 불포함 */}
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 14 }}>
                            {([['03', '旅行代金に含まれるもの', included, true], ['04', '旅行代金に含まれないもの', excluded, false]] as const).map(([n, title, items, inc]) => (
                                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <NumHead n={n} title={title} muted={!inc} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 18px', borderRadius: 20, background: inc ? C.mintBg : C.bg }}>
                                        {items.map((x, i) => (
                                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13, fontWeight: 500, color: inc ? C.ink : C.sub }}>
                                                <span style={{ flex: 'none', width: 18, height: 18, borderRadius: '50%', background: inc ? C.mint : C.line, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {inc
                                                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
                                                        : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="3.2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>}
                                                </span>{x}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* 05 취소 규정 */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <NumHead n="05" title="キャンセル規定" />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 10 }}>
                                {cancellationRows.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 20, background: C.bg }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: C.mintDeep }}>{c.period}</span>
                                        <span style={{ fontSize: 13, lineHeight: 1.65, color: C.body }}>{emphasize(c.fee)}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 여행자 정보 */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <KickHead kicker="TRAVELERS" title="旅行者情報" />
                            {formTravelers.map((tv, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 8 }}>
                                    {cell(`氏名 ${i + 1}`, dash(tv.name), false, false)}
                                    {cell(`パスポート名 ${i + 1}`, dash(tv.passportName))}
                                    {cell(`生年月日 ${i + 1}`, fmtDate(tv.birthdate))}
                                    {cell(`電話番号 ${i + 1}`, dash(tv.phone))}
                                </div>
                            ))}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 8 }}>
                                {flightCells.map(([k, v]) => <React.Fragment key={k}>{cell(k, v, true)}</React.Fragment>)}
                            </div>
                        </section>

                        {/* 숙박 */}
                        {accommodations && accommodations.length > 0 && (
                            <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <KickHead kicker="ACCOMMODATION" title="宿泊" />
                                <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 20, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)', background: C.bg }}>
                                        {['日程', '宿泊施設', 'タイプ', '地域'].map(h => <span key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: C.mute }}>{h}</span>)}
                                    </div>
                                    {accommodations.map(a => (
                                        <div key={a.day} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)', alignItems: 'center', borderTop: `1px solid ${C.line2}` }}>
                                            <span style={{ padding: 14 }}><span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 8px', borderRadius: 6, background: C.mintBg, fontSize: 11, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap' }}>{a.day}日目</span></span>
                                            <span style={{ padding: 14, fontFamily: EN_JP, fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: C.ink, wordBreak: 'break-word' }}>{a.accommodation?.name || '-'}</span>
                                            <span style={{ padding: 14, fontSize: 13, color: C.mute, wordBreak: 'break-word' }}>{a.accommodation?.type || '-'}</span>
                                            <span style={{ padding: 14, fontSize: 13, color: C.mute, wordBreak: 'break-word' }}>{a.accommodation?.location || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 여행 조건 · 주의사항 (실제 문구) */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <KickHead kicker="TERMS & CONDITIONS" title="旅行条件・注意事項" />
                            <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 20px', borderRadius: 20, background: C.bg }}>
                                {terms.map((t, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: i ? `1px solid ${C.line2}` : 0 }}>
                                        <span style={{ flex: 'none', width: 22, fontFamily: EN, fontSize: 13, fontWeight: 700, color: C.mint }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span style={{ fontSize: 13, lineHeight: 1.75, color: C.body }}>{t}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '22px 16px', textAlign: 'center' }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{settings.signatureNote}</span>
                                <span style={{ fontFamily: EN, fontSize: 13, fontWeight: 600, color: C.mintDeep }}>発行日：{issuedDate}</span>
                            </div>
                        </section>

                        {/* 여행사 · 서명 */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <KickHead kicker="TRAVEL AGENCY" title="旅行会社" />
                            <KvTable rows={companyRows} valueFont={EN_JP} />
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '22px 20px', borderRadius: 20, background: C.bg }}>
                                <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: C.sub }}>旅行者署名</span>
                                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingBottom: 4, borderBottom: `1.5px solid ${C.faint}`, minHeight: 64 }}>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontSize: 15, fontWeight: 500, color: C.ink }}>{signerName}</span>
                                        {savedSig && sent && (
                                            <span style={{ fontSize: 11, fontWeight: 700, color: C.mintDeep }}>電子署名済み{savedSig.agreedAt ? `：${fmtDate(savedSig.agreedAt)}` : ''}</span>
                                        )}
                                    </span>
                                    {signature && <img src={signature} alt="電子署名" style={{ height: 60, maxWidth: '60%', objectFit: 'contain' }} />}
                                </span>
                            </div>
                        </section>

                        {/* 바닥 */}
                        <footer style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 28, borderTop: `1px solid ${C.line}`, textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontFamily: EN, fontSize: 14, fontWeight: 700, color: C.ink }}>{COMPANY_INFO.nameEn}</span>
                                <span style={{ fontFamily: EN, fontSize: 12, color: C.mute }}>{COMPANY_INFO.website} · {COMPANY_INFO.email}</span>
                            </div>
                            <button type="button" data-noprint="" className="mwc-print" onClick={() => { try { window.print(); } catch { /* 인쇄 불가 브라우저 */ } }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px', border: `1px solid ${C.line}`, borderRadius: 12, background: '#FFFFFF', fontSize: 14, fontWeight: 700, color: C.ink, cursor: 'pointer' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6z" /></svg>
                                印刷 / PDF保存
                            </button>
                        </footer>
                    </div>
                </div>
            </div>
        </>
    );
};
