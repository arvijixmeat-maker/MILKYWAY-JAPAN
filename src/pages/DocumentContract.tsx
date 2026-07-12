import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { SEO } from '../components/seo/SEO';
import { COMPANY_INFO, CONTRACT_NOTICES, PRIVACY_NOTICES, OTHER_NOTICES } from '../constants/company';

/**
 * ご旅行契約書（고객용）— Claude Design "Contract.dc.html" 디자인 적용.
 * 잉크블랙 CTA · 애저블루 액센트 · Pretendard. 3가지 시안(clean/card/editorial)을 모두 포팅하고
 * 아래 VARIANT 상수로 전환한다(기본: 시안 A 클린). 내용·문구·입력/서명/제출 로직은 기존 그대로 유지.
 */
const VARIANT: 'clean' | 'card' | 'editorial' = 'clean';

interface Traveler {
    name?: string;
    passportName?: string;
    age?: number | string;
    birthdate?: string;
    phone?: string;
    gender?: string;
}

interface ContractData {
    travelers?: Traveler[];
    arrival?: { date?: string; time?: string; flight?: string };
    departure?: { date?: string; time?: string; flight?: string };
    region?: string;
    category?: string;
    issuedDate?: string;
    agreement?: { agreed?: boolean; name?: string; agreedAt?: string; status?: string; version?: number; documentHash?: string; signatureData?: string; signatureType?: string };
    signature?: { status?: string; version?: number; documentHash?: string; signedAt?: string };
    status?: string;
    version?: number;
    lockedAt?: string;
    customerSubmittedAt?: string;
}

interface ContractSettings {
    intro?: string;
    paymentMethod?: string;
    paymentDeadline?: string;
    bankInfo?: string;
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
    paymentMethod: '銀行振込',
    paymentDeadline: 'ご案内メールに記載の期日まで',
    bankInfo: 'お振込先は別途ご案内します。',
    includedText: '宿泊費、食事代、専用車、ドライバー、日本語ガイド、日程表記載の体験料金',
    excludedText: '国際航空券、海外旅行保険、個人的費用、日程表に記載のない食事',
    cancellationRows: [
        { period: '30日〜15日前まで', fee: '旅行代金の10%' },
        { period: '14日〜8日前まで', fee: '旅行代金の20%' },
        { period: '7日〜3日前まで', fee: '旅行代金の30%' },
        { period: '2日前〜当日', fee: '旅行代金の50%' },
        { period: '無連絡不参加', fee: '旅行代金の100%' },
    ],
    signatureNote: '上記内容を確認し、同意の上、本契約を締結いたします。',
};

const fmtDate = (iso?: string) => {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch { return iso; }
};

const fmtYen = (n?: number) => {
    if (typeof n !== 'number' || isNaN(n)) return '-';
    return `${n.toLocaleString('ja-JP')}円`;
};

const flightLine = (f?: { time?: string; flight?: string }) => {
    const parts = [f?.flight, f?.time].filter(Boolean);
    return parts.length ? parts.join(' / ') : '-';
};

const splitLines = (value?: string) => (value || '').split(/\r?\n|、|,/).map(v => v.trim()).filter(Boolean);

const dash = (v?: string) => (v && String(v).trim()) ? String(v) : '-';

// ─── 디자인 토큰 (myrealtrip-design-system) — .mrtc 스코프 ───
const TOKENS = `
.mrtc{
  --mrt-blue:#1A8CFF; --mrt-blue-strong:#0B6FE0; --mrt-blue-50:#E8F2FF;
  --mrt-red:#FF4F4F; --mrt-red-soft:#FFECEC; --mrt-green:#18A957; --mrt-green-soft:#E4F7EC;
  --mrt-ink:#1A1B1E; --mrt-white:#FFFFFF;
  --mrt-gray-900:#24262B; --mrt-gray-700:#4A4E55; --mrt-gray-600:#5F636B; --mrt-gray-500:#8A8F99;
  --mrt-gray-400:#B4B8C0; --mrt-gray-300:#D7DAE0; --mrt-gray-100:#F1F2F4; --mrt-gray-50:#F7F8FA;
  --border-default:#E6E8EC; --border-subtle:#F1F2F4; --border-strong:#D7DAE0;
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;
  --shadow-xs:0 1px 2px rgba(26,27,30,.06); --shadow-sm:0 2px 8px rgba(26,27,30,.06); --shadow-md:0 4px 16px rgba(26,27,30,.08);
  --font-sans:'Pretendard','Noto Sans JP',-apple-system,BlinkMacSystemFont,sans-serif;
}
.mrtc input, .mrtc select{ font-family:var(--font-sans); }
.mrtc input:focus, .mrtc select:focus{ border-color:var(--mrt-blue) !important; box-shadow:0 0 0 3px rgba(26,140,255,.15); }
@media print{
  .mrtc-bg{ background:#fff !important; padding:0 !important; }
  .no-print{ display:none !important; }
  .mrtc{ box-shadow:none !important; border-radius:0 !important; }
}
@page{ margin:12mm; }
`;

type T = Record<string, React.CSSProperties>;

// Contract.dc.html theme(mode, variant) 포팅
function buildTheme(m: boolean, variant: string): T {
    const A = 'var(--mrt-blue)', INK = 'var(--mrt-ink)';
    const t: T = {};
    t.page = { background: 'var(--mrt-white)', padding: m ? '24px 16px 34px' : '52px 52px 58px', fontFamily: 'var(--font-sans)', color: 'var(--mrt-gray-900)', position: 'relative', boxSizing: 'border-box', width: '100%' };
    t.brandRow = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: m ? 16 : 22 };
    t.brandMark = { width: m ? 30 : 36, height: m ? 30 : 36, flex: 'none' };
    t.brandName = { fontSize: m ? 13.5 : 16, fontWeight: 800, letterSpacing: '-0.02em', color: INK, lineHeight: 1.15 };
    t.brandSub = { fontSize: m ? 8 : 9, fontWeight: 700, letterSpacing: '0.18em', color: A, marginTop: 2 };
    t.meta = { textAlign: 'right', fontSize: m ? 10 : 11, fontWeight: 700, color: A, lineHeight: 1.7, whiteSpace: 'nowrap' };
    t.hero = { textAlign: 'center', paddingBottom: m ? 20 : 26, borderBottom: '1px solid var(--border-default)', marginBottom: m ? 24 : 34 };
    t.heroEn = { fontSize: m ? 10 : 11.5, fontWeight: 700, letterSpacing: '0.34em', color: 'var(--mrt-gray-400)' };
    t.heroTitle = { fontSize: m ? 28 : 40, fontWeight: 800, letterSpacing: '-0.045em', color: INK, lineHeight: 1.05, margin: m ? '6px 0 8px' : '8px 0 10px' };
    t.heroSub = { fontSize: m ? 12.5 : 14, color: 'var(--mrt-gray-600)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto', fontWeight: 500 };
    t.section = { marginBottom: m ? 24 : 36 };
    t.cardBox = {};
    t.secHead = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: m ? 12 : 16 };
    t.secNum = { flex: 'none', color: A, fontWeight: 800, fontSize: m ? 17 : 20, letterSpacing: '-0.02em' };
    t.plainBar = { flex: 'none', width: 4, height: m ? 16 : 18, borderRadius: 2, background: A };
    t.secTitle = { fontSize: m ? 16.5 : 20, fontWeight: 800, letterSpacing: '-0.03em', color: INK, lineHeight: 1.2 };
    t.kvWrap = { border: '1px solid var(--border-default)', borderRadius: 'var(--r-md)', overflow: 'hidden' };
    t.kvRow = { display: 'flex', flexDirection: m ? 'column' : 'row', gap: m ? 3 : 0, borderBottom: '1px solid var(--border-subtle)', padding: m ? '10px 13px' : 0 };
    t.kvLabel = { flex: m ? 'none' : '0 0 170px', background: m ? 'transparent' : 'var(--mrt-gray-50)', padding: m ? 0 : '13px 16px', fontSize: m ? 11 : 12.5, fontWeight: 700, color: 'var(--mrt-gray-600)', display: 'flex', alignItems: 'center', letterSpacing: '-0.01em' };
    t.kvValue = { flex: 1, padding: m ? 0 : '13px 18px', fontSize: m ? 13 : 14, fontWeight: 500, color: 'var(--mrt-gray-900)', display: 'flex', alignItems: 'center', lineHeight: 1.5 };
    t.payStrong = { flex: 1, padding: m ? 0 : '13px 18px', fontSize: m ? 15 : 17, fontWeight: 800, color: INK, display: 'flex', alignItems: 'center' };
    t.payAccent = { flex: 1, padding: m ? 0 : '13px 18px', fontSize: m ? 15 : 17, fontWeight: 800, color: A, display: 'flex', alignItems: 'center' };
    t.twoCol = { display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 22 : 34, marginBottom: m ? 24 : 36 };
    t.listItem = { display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: m ? 13 : 14, color: '#34373d', lineHeight: 1.5, padding: '5px 0' };
    t.bullet = { flex: 'none', width: 6, height: 6, borderRadius: '50%', background: A, marginTop: 7 };
    t.bulletMuted = { flex: 'none', width: 6, height: 6, borderRadius: '50%', background: 'var(--mrt-gray-400)', marginTop: 7 };
    t.cancelRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: m ? '11px 14px' : '13px 18px', borderBottom: '1px solid var(--border-subtle)' };
    t.cancelLabel = { fontSize: m ? 12.5 : 14, fontWeight: 700, color: A };
    t.cancelVal = { fontSize: m ? 12.5 : 14, fontWeight: 600, color: 'var(--mrt-gray-700)' };
    t.summaryGrid = { display: 'grid', gridTemplateColumns: m ? '1fr 1fr' : 'repeat(4,1fr)', gap: m ? 8 : 10 };
    t.summaryItem = { background: 'var(--mrt-gray-50)', borderRadius: 'var(--r-sm)', padding: m ? '10px 12px' : '12px 14px' };
    t.summaryLabel = { fontSize: m ? 10.5 : 11.5, fontWeight: 700, color: 'var(--mrt-gray-500)', marginBottom: 4 };
    t.summaryValue = { fontSize: m ? 12.5 : 14, fontWeight: 700, color: INK, lineHeight: 1.4, wordBreak: 'break-word' };
    t.termRow = { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0' };
    t.termNum = { flex: 'none', width: m ? 20 : 22, height: m ? 20 : 22, borderRadius: '50%', background: 'var(--mrt-blue-50)', color: A, fontSize: m ? 10.5 : 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 };
    t.termText = { fontSize: m ? 12 : 13, lineHeight: 1.65, color: 'var(--mrt-gray-700)', fontWeight: 500 };
    t.closeNote = { textAlign: 'center', fontSize: m ? 13 : 14.5, fontWeight: 700, color: INK, marginTop: m ? 28 : 40, marginBottom: m ? 8 : 10 };
    t.issueLine = { textAlign: 'center', fontSize: m ? 13 : 15, fontWeight: 800, color: A, marginBottom: m ? 22 : 30 };
    t.signLine = { display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, padding: m ? '14px 14px' : '18px 18px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--r-md)' };
    t.signLabel = { fontSize: m ? 12.5 : 13.5, fontWeight: 800, color: 'var(--mrt-gray-600)', flex: 'none' };
    t.signValue = { fontSize: m ? 16 : 20, fontWeight: 700, color: INK };
    t.signBlank = { flex: 1, borderBottom: '1px solid var(--border-strong)', height: m ? 22 : 26 };
    t.footer = { textAlign: 'center', borderTop: '1px solid var(--border-default)', paddingTop: m ? 20 : 26, marginTop: m ? 26 : 36 };
    t.footerName = { fontSize: m ? 12.5 : 14, fontWeight: 800, color: INK, letterSpacing: '0.04em' };
    t.footerMeta = { fontSize: m ? 10.5 : 12, color: 'var(--mrt-gray-500)', marginTop: 5, fontWeight: 500 };
    t.printBtn = { marginTop: m ? 18 : 22, display: 'inline-flex', alignItems: 'center', gap: 8, height: m ? 46 : 50, padding: '0 26px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-default)', background: '#fff', color: INK, fontSize: m ? 13.5 : 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' };
    t.formPanel = { border: '1.5px solid var(--mrt-blue)', background: 'var(--mrt-blue-50)', borderRadius: 'var(--r-lg)', padding: m ? '18px 14px' : '28px 28px', marginBottom: m ? 28 : 42 };
    t.formIntro = { fontSize: m ? 12 : 13.5, color: 'var(--mrt-gray-600)', margin: m ? '4px 0 16px' : '6px 0 20px', lineHeight: 1.6, fontWeight: 500 };
    t.formInnerCard = { background: '#fff', borderRadius: 'var(--r-md)', padding: m ? '14px 13px' : '20px 20px', marginBottom: 12, boxShadow: 'var(--shadow-xs)' };
    t.travLabel = { fontSize: m ? 12 : 13, fontWeight: 800, color: 'var(--mrt-gray-500)', marginBottom: m ? 12 : 14 };
    t.formGrid = { display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 11 : 15 };
    t.full = { gridColumn: '1 / -1' };
    t.fieldLabel = { fontSize: m ? 11 : 12, fontWeight: 700, color: 'var(--mrt-gray-600)', marginBottom: 6, display: 'block' };
    t.input = { width: '100%', height: m ? 44 : 46, padding: '0 13px', border: '1.5px solid var(--border-default)', borderRadius: 'var(--r-md)', fontSize: m ? 14 : 14.5, fontFamily: 'var(--font-sans)', color: INK, background: '#fff', boxSizing: 'border-box', outline: 'none', fontWeight: 500 };
    t.travActions = { display: 'flex', alignItems: 'center', gap: 16, margin: m ? '2px 2px 18px' : '4px 2px 24px' };
    t.addBtn = { background: 'none', border: 'none', color: A, fontSize: m ? 13 : 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 };
    t.delBtn = { background: 'none', border: 'none', color: 'var(--mrt-gray-500)', fontSize: m ? 12.5 : 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 };
    t.flightHead = { display: 'flex', alignItems: 'center', gap: 8, fontSize: m ? 15 : 17, fontWeight: 800, color: INK, letterSpacing: '-0.02em', marginTop: m ? 6 : 8 };
    t.flightDesc = { fontSize: m ? 11.5 : 13, color: 'var(--mrt-gray-600)', margin: '6px 0 14px', lineHeight: 1.6, fontWeight: 500 };
    t.flightGrid = { display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 12 : 16 };
    t.flightCard = { background: '#fff', borderRadius: 'var(--r-md)', padding: m ? '14px 13px' : '18px 18px', boxShadow: 'var(--shadow-xs)' };
    t.flightTitle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: m ? 12.5 : 14, fontWeight: 800, color: INK, marginBottom: 12 };
    t.agreeRow = { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: m ? 18 : 22, marginBottom: 14 };
    t.agreeText = { fontSize: m ? 12.5 : 14, color: '#33363b', fontWeight: 600, lineHeight: 1.5, paddingTop: 1 };
    t.successBox = { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--mrt-green-soft)', border: '1.5px solid var(--mrt-green)', borderRadius: 'var(--r-md)', padding: m ? '16px 16px' : '20px 22px', marginTop: m ? 18 : 22 };
    t.cta = { width: '100%', height: m ? 52 : 56, border: 'none', borderRadius: 14, background: INK, color: '#fff', fontSize: m ? 15 : 16.5, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer', fontFamily: 'var(--font-sans)', marginTop: m ? 8 : 10, boxShadow: 'var(--shadow-md)' };
    t.ctaDisabled = { width: '100%', height: m ? 52 : 56, border: 'none', borderRadius: 14, background: 'var(--mrt-gray-300)', color: '#fff', fontSize: m ? 15 : 16.5, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'not-allowed', fontFamily: 'var(--font-sans)', marginTop: m ? 8 : 10 };

    if (variant === 'card') {
        t.page = { ...t.page, background: 'var(--mrt-gray-50)' };
        t.section = { background: '#fff', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: m ? '18px 16px' : '28px 30px', marginBottom: m ? 16 : 22 };
        t.cardBox = { background: '#fff', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', padding: m ? '18px 16px' : '24px 26px' };
        t.twoCol = { display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 16 : 22, marginBottom: m ? 16 : 22 };
        t.secNum = { flex: 'none', width: m ? 26 : 30, height: m ? 26 : 30, borderRadius: 9, background: INK, color: '#fff', fontSize: m ? 14 : 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' };
        t.plainBar = { flex: 'none', width: m ? 14 : 16, height: m ? 14 : 16, borderRadius: 5, background: A };
        t.kvWrap = {};
        t.heroEn = { ...t.heroEn, color: A };
    }
    if (variant === 'editorial') {
        t.hero = { textAlign: 'left', paddingBottom: m ? 16 : 22, borderBottom: '2px solid ' + INK, marginBottom: m ? 26 : 38 };
        t.heroEn = { ...t.heroEn, color: A, letterSpacing: '0.38em' };
        t.heroTitle = { ...t.heroTitle, fontSize: m ? 32 : 50, margin: m ? '8px 0 12px' : '10px 0 16px' };
        t.heroSub = { ...t.heroSub, maxWidth: 'none', margin: 0, textAlign: 'left' };
        t.secHead = { display: 'flex', alignItems: 'baseline', gap: m ? 12 : 16, marginBottom: m ? 14 : 18, borderBottom: '1px solid var(--border-default)', paddingBottom: m ? 10 : 12 };
        t.secNum = { flex: 'none', fontSize: m ? 22 : 32, fontWeight: 800, color: 'var(--mrt-gray-300)', letterSpacing: '-0.04em', lineHeight: 1, minWidth: m ? 22 : 38 };
        t.plainBar = { flex: 'none', width: m ? 7 : 9, height: m ? 7 : 9, borderRadius: '50%', background: A, alignSelf: 'center' };
        t.secTitle = { ...t.secTitle, fontSize: m ? 18 : 23 };
        t.kvWrap = {};
        t.kvRow = { display: 'flex', flexDirection: m ? 'column' : 'row', gap: m ? 3 : 0, borderBottom: '1px solid var(--border-subtle)', padding: m ? '10px 0' : 0 };
        t.kvLabel = { flex: m ? 'none' : '0 0 160px', background: 'transparent', padding: m ? 0 : '12px 0', fontSize: m ? 11 : 12.5, fontWeight: 600, color: 'var(--mrt-gray-500)', display: 'flex', alignItems: 'center' };
        t.kvValue = { flex: 1, padding: m ? 0 : '12px 0', fontSize: m ? 13 : 14.5, fontWeight: 600, color: 'var(--mrt-gray-900)', display: 'flex', alignItems: 'center', lineHeight: 1.5 };
        t.payStrong = { flex: 1, padding: m ? 0 : '12px 0', fontSize: m ? 16 : 19, fontWeight: 800, color: INK, display: 'flex', alignItems: 'center' };
        t.payAccent = { flex: 1, padding: m ? 0 : '12px 0', fontSize: m ? 16 : 19, fontWeight: 800, color: A, display: 'flex', alignItems: 'center' };
        t.cancelRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: m ? '10px 0' : '13px 0', borderBottom: '1px solid var(--border-subtle)' };
        t.summaryItem = { background: 'transparent', borderBottom: '1px solid var(--border-subtle)', borderRadius: 0, padding: m ? '8px 0' : '10px 2px' };
        t.formPanel = { border: '1px solid var(--border-default)', background: '#fff', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--r-lg)', padding: m ? '18px 14px' : '28px 28px', marginBottom: m ? 28 : 42 };
        t.formInnerCard = { background: 'var(--mrt-gray-50)', borderRadius: 'var(--r-md)', padding: m ? '14px 13px' : '20px 20px', marginBottom: 12 };
        t.flightCard = { background: 'var(--mrt-gray-50)', borderRadius: 'var(--r-md)', padding: m ? '14px 13px' : '18px 18px' };
    }
    return t;
}

const useIsMobile = () => {
    const [m, setM] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
    useEffect(() => {
        const onResize = () => setM(window.innerWidth <= 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return m;
};

const BrandMark: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
    <svg style={style} viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="20" fill="#1A8CFF" />
        <path d="M25.5 24.8a8 8 0 1 1-2.6-13.9 6.4 6.4 0 1 0 2.6 13.9Z" fill="#fff" />
        <circle cx="27" cy="14" r="1.4" fill="#fff" />
        <circle cx="30" cy="19" r="1" fill="#fff" />
    </svg>
);

type SignaturePoint = { x: number; y: number };

const SignaturePad: React.FC<{
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}> = ({ value, disabled = false, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<SignaturePoint[][]>([]);
    const drawingRef = useRef(false);

    const drawAll = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = '#1A1B1E';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const stroke of strokesRef.current) {
            if (stroke.length === 0) continue;
            ctx.beginPath();
            ctx.moveTo(stroke[0].x * rect.width, stroke[0].y * rect.height);
            for (const point of stroke.slice(1)) ctx.lineTo(point.x * rect.width, point.y * rect.height);
            ctx.stroke();
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(drawAll);
        observer.observe(canvas);
        drawAll();
        return () => observer.disconnect();
    }, []);

    const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        };
    };

    const begin = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drawingRef.current = true;
        strokesRef.current.push([pointFromEvent(event)]);
        drawAll();
    };
    const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || disabled) return;
        strokesRef.current[strokesRef.current.length - 1]?.push(pointFromEvent(event));
        drawAll();
    };
    const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        onChange(event.currentTarget.toDataURL('image/png'));
    };
    const clear = () => {
        strokesRef.current = [];
        drawAll();
        onChange('');
    };

    return (
        <div>
            <div style={{ position: 'relative', height: 176, border: `1.5px solid ${value ? 'var(--mrt-blue)' : 'var(--border-strong)'}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    role="img"
                    aria-label="手書き署名欄"
                    onPointerDown={begin}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerCancel={end}
                    style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: disabled ? 'default' : 'crosshair' }}
                />
                {!value && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 22, borderBottom: '1px solid #D7DAE0', margin: '0 28px', pointerEvents: 'none' }} />}
                {!value && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#B4B8C0', fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}>指・マウス・ペンで署名してください</span>}
            </div>
            {!disabled && (
                <button type="button" onClick={clear} disabled={!value} style={{ marginTop: 8, border: 0, background: 'transparent', color: value ? 'var(--mrt-blue-strong)' : 'var(--mrt-gray-400)', fontSize: 12.5, fontWeight: 800, cursor: value ? 'pointer' : 'default', fontFamily: 'var(--font-sans)' }}>
                    署名を消して書き直す
                </button>
            )}
        </div>
    );
};

export const DocumentContract: React.FC = () => {
    const { reservationId } = useParams();
    const isMobile = useIsMobile();
    const [data, setData] = useState<ContractPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formTravelers, setFormTravelers] = useState<Traveler[]>([]);
    const [arrival, setArrival] = useState<{ date?: string; time?: string; flight?: string }>({});
    const [departure, setDeparture] = useState<{ date?: string; time?: string; flight?: string }>({});
    const [agreed, setAgreed] = useState(false);
    const [signerName, setSignerName] = useState('');
    const [signatureData, setSignatureData] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try {
                const res = await api.documents.contract.get(reservationId);
                setData(res);
            } catch (e: any) {
                setError(e.message || '契約書を読み込めませんでした。');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

    // Noto Sans JP 폰트 — 페이지 한정 주입
    useEffect(() => {
        const id = 'doc-noto-sans-jp';
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap';
        document.head.appendChild(link);
    }, []);

    useEffect(() => {
        if (!data) return;
        const c: any = data.contract || {};
        const existing: Traveler[] = Array.isArray(c.travelers) ? c.travelers : [];
        const count = existing.length > 0
            ? existing.length
            : Math.max(1, parseInt(String(data.reservation.travelers || '').replace(/[^0-9]/g, '')) || 1);
        const base: Traveler[] = Array.from({ length: count }, (_, i) => ({
            name: existing[i]?.name || (i === 0 ? data.reservation.customerName : '') || '',
            passportName: existing[i]?.passportName || '',
            birthdate: existing[i]?.birthdate || '',
            gender: existing[i]?.gender || '',
            phone: existing[i]?.phone || (i === 0 ? data.reservation.customerPhone : '') || '',
        }));
        setFormTravelers(base);
        setArrival({ date: c.arrival?.date || '', time: c.arrival?.time || '', flight: c.arrival?.flight || '' });
        setDeparture({ date: c.departure?.date || '', time: c.departure?.time || '', flight: c.departure?.flight || '' });
        if (c.agreement?.agreed) {
            setAgreed(true);
            setSignerName(c.agreement.name || '');
            setSignatureData(c.agreement.signatureData || '');
            setSaved(true);
        }
    }, [data]);

    const updTraveler = (i: number, field: keyof Traveler, val: string) =>
        setFormTravelers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

    const handleCustomerSubmit = async () => {
        if (!agreed) { alert('旅行契約内容への同意が必要です。'); return; }
        if (!signerName.trim()) { alert('署名者のお名前を入力してください。'); return; }
        if (!signatureData) { alert('手書き署名を記入してください。'); return; }
        if (!reservationId) return;
        setSaving(true);
        try {
            const agreement = { agreed: true, name: signerName.trim(), signatureData, signatureType: 'drawn' };
            const result = await api.documents.contract.saveCustomer(reservationId, { travelers: formTravelers, arrival, departure, agreement });
            setSaved(true);
            setData(prev => prev ? { ...prev, contract: result.contract } as ContractPageData : prev);
            alert('契約内容を送信しました。');
        } catch (e: any) {
            alert('送信に失敗しました。' + (e.message || ''));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <>
                <SEO title="海外旅行契約書" description="お客様専用の旅行契約書です。" robots="noindex, nofollow" />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e7e5df' }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: '#d6d3cb', borderTopColor: '#1A8CFF' }} />
                </div>
            </>
        );
    }

    if (error || !data) {
        return (
            <>
                <SEO title="海外旅行契約書" description="お客様専用の旅行契約書です。" robots="noindex, nofollow" />
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#e7e5df' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#1A1B1E', marginBottom: 8 }}>契約書を表示できません</p>
                        <p style={{ fontSize: 14, color: '#5F636B' }}>{error || 'URLをご確認ください。'}</p>
                    </div>
                </div>
            </>
        );
    }

    const m = isMobile;
    const t = buildTheme(m, VARIANT);
    const A = 'var(--mrt-blue)';
    const { reservation, contract, accommodations, guide, template } = data;
    const contractSettings = { ...fallbackContract, ...(template?.documentSettings?.contract || {}) };
    const issuedDate = contract.issuedDate || reservation.createdAt?.split('T')[0] || '';
    const contractNumber = reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase();
    const cancellationRows = contractSettings.cancellationRows?.length ? contractSettings.cancellationRows : fallbackContract.cancellationRows;
    const includedItems = (data.productIncluded && data.productIncluded.length) ? data.productIncluded : splitLines(contractSettings.includedText);
    const excludedItems = (data.productExcluded && data.productExcluded.length) ? data.productExcluded : splitLines(contractSettings.excludedText);
    const includedDisplay = includedItems.length ? includedItems : splitLines(fallbackContract.includedText);
    const excludedDisplay = excludedItems.length ? excludedItems : splitLines(fallbackContract.excludedText);
    const balance = reservation.balanceAmount ?? (reservation.totalPrice - (reservation.depositAmount || 0));

    const tripRows: Array<{ label: string; value: string }> = [
        { label: 'ご旅行名', value: reservation.productName },
        { label: 'ご旅行期間', value: `${fmtDate(reservation.startDate)} 〜 ${fmtDate(reservation.endDate)}` },
        { label: '参加人数', value: `${reservation.travelers}名` },
        { label: 'お客様名', value: `${reservation.customerName} 様` },
        { label: '旅行形態', value: contract.category || '貸切プライベートツアー' },
        { label: '地域', value: contract.region || '-' },
        { label: 'ガイド', value: guide?.name ? `${guide.name}${guide.phone ? `（${guide.phone}）` : ''}` : '日本語ガイドが同行します' },
    ];
    const payRows: Array<{ label: string; value: string; vStyle: React.CSSProperties; note?: string }> = [
        { label: '合計金額', value: fmtYen(reservation.totalPrice), vStyle: t.payStrong },
        { label: '予約金', value: reservation.depositAmount ? fmtYen(reservation.depositAmount) : '-', vStyle: t.kvValue, note: `${contractSettings.paymentMethod}（ご予約確定時）` },
        { label: '残金', value: fmtYen(balance), vStyle: t.payAccent, note: '現地にて現金（日本円）でお支払い' },
        { label: '支払方法', value: `予約金：${contractSettings.paymentMethod} ／ 残金：現地にて現金（日本円）`, vStyle: t.kvValue },
        { label: '支払期限', value: contractSettings.paymentDeadline, vStyle: t.kvValue },
        { label: 'お振込先', value: contractSettings.bankInfo, vStyle: t.kvValue, note: '※ 予約金のお振込先です（残金は現地で現金払い）' },
    ];
    const termRows = [...CONTRACT_NOTICES, ...PRIVACY_NOTICES, ...OTHER_NOTICES].map((text, i) => ({ n: i + 1, text }));
    const companyRows: Array<{ label: string; value: string }> = [
        { label: '会社名', value: COMPANY_INFO.nameJa },
        { label: '電話番号', value: COMPANY_INFO.phoneKR },
        { label: '代表者', value: COMPANY_INFO.representative || COMPANY_INFO.ceo },
        { label: '登録番号', value: COMPANY_INFO.registrationNumber },
        { label: 'Web', value: COMPANY_INFO.website },
    ];

    // 旅行者情報（요약, 입력값 실시간 반영）
    const summaryRows: Array<{ label: string; value: string }> = [];
    formTravelers.forEach((tv, i) => {
        const sfx = formTravelers.length > 1 ? ` ${i + 1}` : '';
        summaryRows.push({ label: `氏名${sfx}`, value: dash(tv.name) });
        summaryRows.push({ label: `パスポート名${sfx}`, value: dash(tv.passportName) });
        summaryRows.push({ label: `生年月日${sfx}`, value: dash(tv.birthdate) });
        summaryRows.push({ label: `電話番号${sfx}`, value: dash(tv.phone) });
    });
    summaryRows.push({ label: '到着日', value: (arrival.date && arrival.date.trim()) ? fmtDate(arrival.date) : fmtDate(reservation.startDate) });
    summaryRows.push({ label: '出発日', value: (departure.date && departure.date.trim()) ? fmtDate(departure.date) : fmtDate(reservation.endDate) });
    summaryRows.push({ label: '到着便', value: flightLine(arrival) });
    summaryRows.push({ label: '出発便', value: flightLine(departure) });

    const contractLocked = contract.status === 'signed' || contract.signature?.status === 'signed';
    const canSubmit = !contractLocked && agreed && signerName.trim().length > 0 && signatureData.length > 0;
    const agreeBox: React.CSSProperties = {
        flex: 'none', width: m ? 22 : 24, height: m ? 22 : 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: m ? 13 : 14, color: '#fff', fontWeight: 900, border: agreed ? `1.5px solid ${A}` : '1.5px solid var(--border-strong)', background: agreed ? A : '#fff',
    };

    return (
        <>
            <SEO title="海外旅行契約書" description="お客様専用の旅行契約書です。" robots="noindex, nofollow" />
            <style>{TOKENS}</style>

            <div className="mrtc-bg" style={{ minHeight: '100vh', background: '#e7e5df', display: 'flex', justifyContent: 'center', padding: m ? '12px 0 80px' : '40px 16px 90px', boxSizing: 'border-box' }}>
                <div className="mrtc" style={{ width: '100%', maxWidth: 880 }}>
                    <div style={{ ...t.page, borderRadius: m ? 0 : 12, boxShadow: m ? 'none' : '0 8px 30px rgba(0,0,0,.10)', border: m ? 'none' : '1px solid var(--border-default)' }}>

                        {/* 브랜드 행 */}
                        <div style={t.brandRow}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <BrandMark style={t.brandMark} />
                                <div>
                                    <div style={t.brandName}>{COMPANY_INFO.nameJa}</div>
                                    <div style={t.brandSub}>MILKYWAY JAPAN</div>
                                </div>
                            </div>
                            <div style={t.meta}>発行日：{fmtDate(issuedDate)}<br />契約番号：{contractNumber}</div>
                        </div>

                        {/* 히어로 */}
                        <div style={t.hero}>
                            <div style={t.heroEn}>TRAVEL CONTRACT</div>
                            <div style={t.heroTitle}>ご旅行契約書</div>
                            <div style={t.heroSub}>{contractSettings.intro}</div>
                        </div>

                        {/* 입력 폼 패널 (화면 전용) */}
                        <div className="no-print" style={t.formPanel}>
                            {contractLocked && (
                                <div style={{ marginBottom: 18, padding: '14px 16px', borderRadius: 12, background: 'var(--mrt-green-soft)', color: '#117A3E', fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
                                    署名済みの契約書です。契約内容はロックされています。<br />
                                    <span style={{ fontSize: 11.5, fontWeight: 600 }}>
                                        バージョン {contract.signature?.version || contract.version || 1}
                                        {contract.lockedAt ? ` · 署名日時 ${fmtDate(contract.lockedAt)}` : ''}
                                    </span>
                                </div>
                            )}
                            <fieldset disabled={contractLocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                            <div style={t.secHead}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1B1E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h9M4 12h6M4 17h5" /><path d="m16 16 4-4 2 2-4 4-2.6.6.6-2.6Z" fill="#E8F2FF" /></svg>
                                <span style={t.secTitle}>お客様情報の確認</span>
                                {saved && <span style={{ marginLeft: 'auto', borderRadius: 999, background: A, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#fff' }}>送信済み</span>}
                            </div>
                            <div style={t.formIntro}>パスポート情報と同意内容をご確認ください。入力後、旅行会社へ送信されます。</div>

                            {formTravelers.map((tv, i) => (
                                <div key={i} style={t.formInnerCard}>
                                    <div style={{ ...t.travLabel, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>旅行者 {i + 1}</span>
                                        {formTravelers.length > 1 && (
                                            <button type="button" aria-label="この旅行者を削除"
                                                onClick={() => setFormTravelers(prev => prev.filter((_, idx) => idx !== i))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mrt-gray-400)', fontSize: 12.5, fontWeight: 700, padding: 0, fontFamily: 'var(--font-sans)' }}>
                                                ✕ 削除
                                            </button>
                                        )}
                                    </div>
                                    <div style={t.formGrid}>
                                        <div>
                                            <label style={t.fieldLabel}>氏名</label>
                                            <input style={t.input} value={tv.name || ''} onChange={e => updTraveler(i, 'name', e.target.value)} placeholder="山田 太郎" />
                                        </div>
                                        <div>
                                            <label style={t.fieldLabel}>パスポート表記名</label>
                                            <input style={t.input} value={tv.passportName || ''} onChange={e => updTraveler(i, 'passportName', e.target.value)} placeholder="YAMADA TARO" />
                                        </div>
                                        <div>
                                            <label style={t.fieldLabel}>生年月日</label>
                                            <input type="date" style={t.input} value={tv.birthdate || ''} onChange={e => updTraveler(i, 'birthdate', e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={t.fieldLabel}>性別</label>
                                            <select style={t.input} value={tv.gender || ''} onChange={e => updTraveler(i, 'gender', e.target.value)}>
                                                <option value="">選択</option>
                                                <option value="男性">男性</option>
                                                <option value="女性">女性</option>
                                                <option value="その他">その他</option>
                                            </select>
                                        </div>
                                        <div style={t.full}>
                                            <label style={t.fieldLabel}>電話番号</label>
                                            <input style={t.input} value={tv.phone || ''} onChange={e => updTraveler(i, 'phone', e.target.value)} placeholder="090-1234-5678" />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div style={{ margin: m ? '2px 0 18px' : '4px 0 24px' }}>
                                <button type="button"
                                    onClick={() => setFormTravelers(prev => [...prev, { name: '', passportName: '', birthdate: '', gender: '', phone: '' }])}
                                    style={{ width: '100%', padding: m ? '11px' : '12px', border: '1.5px dashed var(--mrt-blue)', borderRadius: 'var(--r-md)', background: 'var(--mrt-blue-50)', color: 'var(--mrt-blue-strong)', fontSize: m ? 13 : 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                                    ＋ 旅行者を追加
                                </button>
                            </div>

                            <div style={t.flightHead}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A8CFF" aria-hidden><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" /></svg>
                                フライト情報（航空券）
                            </div>
                            <div style={t.flightDesc}>空港送迎の手配に使用します。往復のフライト日付・時刻・便名をできるだけ詳しくご記入ください。</div>
                            <div style={t.flightGrid}>
                                <div style={t.flightCard}>
                                    <div style={t.flightTitle}>🛬 到着便（モンゴル着）</div>
                                    <div style={t.formGrid}>
                                        <div>
                                            <label style={t.fieldLabel}>日付</label>
                                            <input type="date" style={t.input} value={arrival.date || ''} onChange={e => setArrival(p => ({ ...p, date: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={t.fieldLabel}>時刻</label>
                                            <input type="time" style={t.input} value={arrival.time || ''} onChange={e => setArrival(p => ({ ...p, time: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 11 }}>
                                        <label style={t.fieldLabel}>便名</label>
                                        <input style={t.input} value={arrival.flight || ''} onChange={e => setArrival(p => ({ ...p, flight: e.target.value }))} placeholder="例：OM502（成田→ウランバートル）" />
                                    </div>
                                </div>
                                <div style={t.flightCard}>
                                    <div style={t.flightTitle}>🛫 出発便（モンゴル発）</div>
                                    <div style={t.formGrid}>
                                        <div>
                                            <label style={t.fieldLabel}>日付</label>
                                            <input type="date" style={t.input} value={departure.date || ''} onChange={e => setDeparture(p => ({ ...p, date: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={t.fieldLabel}>時刻</label>
                                            <input type="time" style={t.input} value={departure.time || ''} onChange={e => setDeparture(p => ({ ...p, time: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 11 }}>
                                        <label style={t.fieldLabel}>便名</label>
                                        <input style={t.input} value={departure.flight || ''} onChange={e => setDeparture(p => ({ ...p, flight: e.target.value }))} placeholder="例：OM501（ウランバートル→成田）" />
                                    </div>
                                </div>
                            </div>

                            {saved && (
                                <div style={t.successBox}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#18A957" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1B1E' }}>送信が完了しました</div>
                                        <div style={{ fontSize: 12.5, color: 'var(--mrt-gray-600)', marginTop: 3, fontWeight: 500 }}>ご記入内容を旅行会社が確認のうえ、ご連絡いたします。</div>
                                    </div>
                                </div>
                            )}

                            <div style={t.agreeRow} onClick={() => setAgreed(v => !v)}>
                                <span style={agreeBox}>{agreed ? '✓' : ''}</span>
                                <span style={t.agreeText}>旅行契約内容、旅行条件、取消規定を確認し、<b style={{ color: A }}>同意します。</b></span>
                            </div>
                            <div>
                                <label style={t.fieldLabel}>署名者名</label>
                                <input style={t.input} value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="契約者のお名前" />
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <label style={t.fieldLabel}>手書き署名</label>
                                <SignaturePad value={signatureData} disabled={contractLocked} onChange={setSignatureData} />
                            </div>
                            <button style={canSubmit ? t.cta : t.ctaDisabled} disabled={!canSubmit || saving} onClick={handleCustomerSubmit}>
                                {contractLocked ? '署名済み・変更できません' : saving ? '送信中...' : '同意して署名する'}
                            </button>
                            </fieldset>
                        </div>

                        {/* 1. ご旅行内容 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.secNum}>1</span><span style={t.secTitle}>ご旅行内容</span></div>
                            <div style={t.kvWrap}>
                                {tripRows.map((r, i) => (
                                    <div key={i} style={t.kvRow}><div style={t.kvLabel}>{r.label}</div><div style={t.kvValue}>{r.value}</div></div>
                                ))}
                            </div>
                        </div>

                        {/* 2. お支払い条件 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.secNum}>2</span><span style={t.secTitle}>お支払い条件</span></div>
                            <div style={t.kvWrap}>
                                {payRows.map((r, i) => (
                                    <div key={i} style={t.kvRow}>
                                        <div style={t.kvLabel}>{r.label}</div>
                                        <div style={r.note ? { ...r.vStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 3 } : r.vStyle}>
                                            <span>{r.value}</span>
                                            {r.note && <span style={{ fontSize: m ? 11 : 12, fontWeight: 600, color: 'var(--mrt-gray-500)', lineHeight: 1.5 }}>{r.note}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3 / 4 포함·불포함 */}
                        <div style={t.twoCol}>
                            <div style={t.cardBox}>
                                <div style={t.secHead}><span style={t.secNum}>3</span><span style={t.secTitle}>旅行代金に含まれるもの</span></div>
                                <div>
                                    {includedDisplay.map((it, i) => (
                                        <div key={i} style={t.listItem}><span style={t.bullet} /><span>{it}</span></div>
                                    ))}
                                </div>
                            </div>
                            <div style={t.cardBox}>
                                <div style={t.secHead}><span style={t.secNum}>4</span><span style={t.secTitle}>旅行代金に含まれないもの</span></div>
                                <div>
                                    {excludedDisplay.map((it, i) => (
                                        <div key={i} style={t.listItem}><span style={t.bulletMuted} /><span>{it}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 5. キャンセル規定 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.secNum}>5</span><span style={t.secTitle}>キャンセル規定</span></div>
                            <div style={t.kvWrap}>
                                {cancellationRows.map((c, i) => (
                                    <div key={i} style={t.cancelRow}><span style={t.cancelLabel}>{c.period}</span><span style={t.cancelVal}>{c.fee}</span></div>
                                ))}
                            </div>
                        </div>

                        {/* 旅行者情報 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.plainBar} /><span style={t.secTitle}>旅行者情報</span></div>
                            <div style={t.summaryGrid}>
                                {summaryRows.map((r, i) => (
                                    <div key={i} style={t.summaryItem}><div style={t.summaryLabel}>{r.label}</div><div style={t.summaryValue}>{r.value}</div></div>
                                ))}
                            </div>
                        </div>

                        {/* 宿泊 */}
                        {accommodations && accommodations.length > 0 && (
                            <div style={t.section}>
                                <div style={t.secHead}><span style={t.plainBar} /><span style={t.secTitle}>宿泊</span></div>
                                {accommodations.map((a) => (
                                    <div key={a.day} style={{ ...t.summaryGrid, marginBottom: 10 }}>
                                        <div style={t.summaryItem}><div style={t.summaryLabel}>日程</div><div style={t.summaryValue}>{a.day}日目</div></div>
                                        <div style={t.summaryItem}><div style={t.summaryLabel}>宿泊施設</div><div style={t.summaryValue}>{a.accommodation?.name || '-'}</div></div>
                                        <div style={t.summaryItem}><div style={t.summaryLabel}>タイプ</div><div style={t.summaryValue}>{a.accommodation?.type || '-'}</div></div>
                                        <div style={t.summaryItem}><div style={t.summaryLabel}>地域</div><div style={t.summaryValue}>{a.accommodation?.location || '-'}</div></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 旅行条件・注意事項 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.plainBar} /><span style={t.secTitle}>旅行条件・注意事項</span></div>
                            <div>
                                {termRows.map((tm) => (
                                    <div key={tm.n} style={t.termRow}><span style={t.termNum}>{tm.n}</span><span style={t.termText}>{tm.text}</span></div>
                                ))}
                            </div>
                        </div>

                        <div style={t.closeNote}>{contractSettings.signatureNote}</div>
                        <div style={t.issueLine}>発行日：{fmtDate(issuedDate)}</div>

                        {/* 旅行会社 */}
                        <div style={t.section}>
                            <div style={t.secHead}><span style={t.plainBar} /><span style={t.secTitle}>旅行会社</span></div>
                            <div style={t.kvWrap}>
                                {companyRows.map((r, i) => (
                                    <div key={i} style={t.kvRow}><div style={t.kvLabel}>{r.label}</div><div style={t.kvValue}>{r.value}</div></div>
                                ))}
                            </div>
                            <div style={t.signLine}>
                                <span style={t.signLabel}>旅行者署名</span>
                                {contract.agreement?.agreed ? (
                                    <span style={{ ...t.signValue, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        {contract.agreement.signatureData && (
                                            <img src={contract.agreement.signatureData} alt={`${contract.agreement.name || '旅行者'}の手書き署名`} style={{ width: m ? 120 : 160, height: m ? 54 : 68, objectFit: 'contain', objectPosition: 'left center' }} />
                                        )}
                                        <span>
                                            {contract.agreement.name}
                                            <span style={{ display: 'block', marginTop: 3, fontSize: m ? 10.5 : 11.5, fontWeight: 700, color: A }}>署名・電子同意済み{contract.agreement.agreedAt ? `：${contract.agreement.agreedAt.split('T')[0]}` : ''}</span>
                                        </span>
                                    </span>
                                ) : (
                                    <span style={t.signBlank} />
                                )}
                            </div>
                        </div>

                        {/* 푸터 */}
                        <div style={t.footer}>
                            <div style={t.footerName}>{COMPANY_INFO.nameEn}</div>
                            <div style={t.footerMeta}>{COMPANY_INFO.website} · {COMPANY_INFO.email}</div>
                            <button className="no-print" style={t.printBtn} onClick={() => { try { window.print(); } catch { /* noop */ } }}>🖨 印刷 / PDF保存</button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};
