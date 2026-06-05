import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { COMPANY_INFO, CONTRACT_NOTICES, PRIVACY_NOTICES, OTHER_NOTICES } from '../constants/company';

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
    agreement?: { agreed?: boolean; name?: string; agreedAt?: string };
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
}

const fallbackContract: Required<ContractSettings> = {
    intro: '本旅行条件書および下記の旅行条件に基づき、募集型企画旅行契約を締結いたします。',
    paymentMethod: '銀行振込',
    paymentDeadline: 'ご案内メールに記載の期日まで',
    bankInfo: '三井住友銀行 新宿支店（普通）1234567\nモンゴル大自然ツアー（カ',
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

const parseMaybeJson = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const splitLines = (value?: string) => (value || '').split(/\r?\n|、|,/).map(v => v.trim()).filter(Boolean);

export const DocumentContract: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ContractPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formTravelers, setFormTravelers] = useState<Traveler[]>([]);
    const [agreed, setAgreed] = useState(false);
    const [signerName, setSignerName] = useState('');
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
        if (c.agreement?.agreed) {
            setAgreed(true);
            setSignerName(c.agreement.name || '');
            setSaved(true);
        }
    }, [data]);

    const updTraveler = (i: number, field: keyof Traveler, val: string) =>
        setFormTravelers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

    const handleCustomerSubmit = async () => {
        if (!agreed) { alert('旅行契約内容への同意が必要です。'); return; }
        if (!signerName.trim()) { alert('署名欄にお名前を入力してください。'); return; }
        if (!reservationId) return;
        setSaving(true);
        try {
            const agreement = { agreed: true, name: signerName.trim(), agreedAt: new Date().toISOString() };
            await api.documents.contract.saveCustomer(reservationId, { travelers: formTravelers, agreement });
            setSaved(true);
            setData(prev => prev ? { ...prev, contract: { ...prev.contract, travelers: formTravelers, agreement } } as ContractPageData : prev);
            alert('契約内容を送信しました。');
        } catch (e: any) {
            alert('送信に失敗しました。' + (e.message || ''));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="text-center">
                    <p className="text-lg font-bold text-slate-800 mb-2">契約書を表示できません</p>
                    <p className="text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        );
    }

    const { reservation, contract, accommodations, guide, template } = data;
    const contractSettings = { ...fallbackContract, ...(template?.documentSettings?.contract || {}) };
    const travelers: Traveler[] = (contract.travelers && contract.travelers.length > 0)
        ? contract.travelers
        : [{ name: reservation.customerName, phone: reservation.customerPhone }];
    const issuedDate = contract.issuedDate || reservation.createdAt?.split('T')[0] || '';
    const guideLanguages = parseMaybeJson(guide?.languages);
    const cancellationRows = contractSettings.cancellationRows?.length ? contractSettings.cancellationRows : fallbackContract.cancellationRows;
    const includedItems = splitLines(contractSettings.includedText);
    const excludedItems = splitLines(contractSettings.excludedText);
    const balance = reservation.balanceAmount ?? (reservation.totalPrice - (reservation.depositAmount || 0));

    return (
        <>
            <style>{`
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .doc-shell { max-width: 100% !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
                    table { page-break-inside: avoid; }
                }
                @page { margin: 12mm; }
                .contract-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .contract-table td, .contract-table th { border: 1px solid #b8e7e2; padding: 8px 10px; vertical-align: middle; }
                .contract-table th { background: #DDF8F5; color: #064E48; font-weight: 800; text-align: center; font-size: 14px; padding: 10px; }
                .contract-table td.label { background: #F7FAFA; color: #0F8F84; font-weight: 800; text-align: center; width: 140px; }
                .contract-table td.value { background: #ffffff; color: #0e1a18; }
                .contract-badge { display: inline-block; background: #0F8F84; color: #fff; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
            `}</style>

            <div className="min-h-screen bg-[#F7FAFA] py-8 px-4 print:bg-white print:py-0 print:px-0">
                <div className="doc-shell max-w-3xl mx-auto bg-white rounded-[24px] border border-[#8FE7DE]/70 shadow-xl overflow-hidden print:shadow-none print:rounded-none">
                    <div className="px-8 py-7 bg-white border-b border-[#8FE7DE]/70">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 text-[#0F8F84]">
                                <span className="material-symbols-outlined text-[34px]">landscape</span>
                                <div>
                                    <p className="text-base font-black">モンゴル大自然ツアー</p>
                                    <p className="text-[10px] font-bold tracking-[0.2em]">MONGOLIA NATURE TOUR</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-[#39C4B7]/10 px-4 py-3 text-right text-xs font-bold text-[#0F8F84]">
                                <p>発行日：{fmtDate(issuedDate)}</p>
                                <p>契約番号：{reservation.reservationNumber || reservation.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                        <h1 className="mt-8 text-center text-4xl font-black tracking-[0.18em] text-[#0F8F84]">ご旅行契約書</h1>
                        <p className="mt-1 text-center text-sm font-semibold uppercase tracking-widest text-slate-500">Travel Contract</p>
                        <p className="mx-auto mt-5 max-w-2xl whitespace-pre-wrap text-center text-sm leading-relaxed text-slate-700">{contractSettings.intro}</p>
                    </div>

                    <div className="px-6 py-6">
                        <div className="no-print mb-6 rounded-xl border-2 border-teal-300 bg-teal-50/50 p-5">
                            <div className="mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-600">edit_note</span>
                                <h2 className="text-base font-bold text-teal-800">お客様情報の確認</h2>
                                {saved && <span className="ml-auto rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white">送信済み</span>}
                            </div>
                            <p className="mb-4 text-xs text-slate-600">パスポート情報と同意内容をご確認ください。入力後、旅行会社へ送信されます。</p>

                            <div className="space-y-3">
                                {formTravelers.map((t, i) => (
                                    <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <p className="mb-2 text-xs font-bold text-slate-400">旅行者 {i + 1}</p>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">氏名</span>
                                                <input value={t.name || ''} onChange={e => updTraveler(i, 'name', e.target.value)} placeholder="山田 太郎" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">パスポート表記名</span>
                                                <input value={t.passportName || ''} onChange={e => updTraveler(i, 'passportName', e.target.value)} placeholder="YAMADA TARO" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">生年月日</span>
                                                <input type="date" value={t.birthdate || ''} onChange={e => updTraveler(i, 'birthdate', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">性別</span>
                                                <select value={t.gender || ''} onChange={e => updTraveler(i, 'gender', e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10">
                                                    <option value="">選択</option>
                                                    <option value="男性">男性</option>
                                                    <option value="女性">女性</option>
                                                </select>
                                            </label>
                                            <label className="block sm:col-span-2">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">電話番号</span>
                                                <input value={t.phone || ''} onChange={e => updTraveler(i, 'phone', e.target.value)} placeholder="090-1234-5678" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10" />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setFormTravelers(prev => [...prev, { name: '', passportName: '', birthdate: '', gender: '', phone: '' }])} className="text-xs font-bold text-teal-600 hover:text-teal-700">＋旅行者を追加</button>
                                    {formTravelers.length > 1 && <button onClick={() => setFormTravelers(prev => prev.slice(0, -1))} className="text-xs font-bold text-slate-400 hover:text-slate-600">最後を削除</button>}
                                </div>
                            </div>

                            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                                <label className="flex cursor-pointer items-start gap-2">
                                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-600" />
                                    <span className="text-sm text-slate-700">旅行契約内容、旅行条件、取消規定を確認し、<b className="text-teal-700">同意します。</b></span>
                                </label>
                                <div className="mt-3">
                                    <span className="mb-1 block text-[11px] font-bold text-slate-500">署名（お名前）</span>
                                    <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="お名前を入力してください" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10" />
                                </div>
                                <button onClick={handleCustomerSubmit} disabled={saving} className="mt-4 w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
                                    {saving ? '送信中...' : saved ? '再送信する' : '同意して送信する'}
                                </button>
                                {saved && <p className="mt-2 text-center text-xs font-bold text-teal-600">契約内容が送信されました。</p>}
                            </div>
                        </div>

                        <table className="contract-table">
                            <thead><tr><th colSpan={4}>1. ご旅行内容</th></tr></thead>
                            <tbody>
                                <tr><td className="label">ご旅行名</td><td className="value" colSpan={3}>{reservation.productName}</td></tr>
                                <tr><td className="label">ご旅行期間</td><td className="value" colSpan={3}>{fmtDate(reservation.startDate)} 〜 {fmtDate(reservation.endDate)}</td></tr>
                                <tr><td className="label">参加人数</td><td className="value">{reservation.travelers}名</td><td className="label">お客様名</td><td className="value">{reservation.customerName} 様</td></tr>
                                <tr><td className="label">旅行形態</td><td className="value">{contract.category || '貸切プライベートツアー'}</td><td className="label">地域</td><td className="value">{contract.region || '-'}</td></tr>
                                <tr><td className="label">ガイド</td><td className="value" colSpan={3}>{guide?.name ? `${guide.name}${guide.phone ? `（${guide.phone}）` : ''}` : '日本語ガイドが同行します'}</td></tr>
                            </tbody>
                        </table>

                        <table className="contract-table mt-4">
                            <thead><tr><th colSpan={4}>2. お支払い条件</th></tr></thead>
                            <tbody>
                                <tr><td className="label">合計金額</td><td className="value" style={{ textAlign: 'right' }}>{fmtYen(reservation.totalPrice)}</td><td className="label">予約金</td><td className="value" style={{ textAlign: 'right' }}>{reservation.depositAmount ? fmtYen(reservation.depositAmount) : '-'}</td></tr>
                                <tr><td className="label">残金</td><td className="value" style={{ textAlign: 'right' }}>{fmtYen(balance)}</td><td className="label">支払方法</td><td className="value">{contractSettings.paymentMethod}</td></tr>
                                <tr><td className="label">支払期限</td><td className="value" colSpan={3}>{contractSettings.paymentDeadline}</td></tr>
                                <tr><td className="label">お振込先</td><td className="value whitespace-pre-wrap" colSpan={3}>{contractSettings.bankInfo}</td></tr>
                            </tbody>
                        </table>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <section className="rounded-xl border border-[#8FE7DE]/70 p-4">
                                <h2 className="text-sm font-black text-[#0F8F84]">3. 旅行代金に含まれるもの</h2>
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
                                    {(includedItems.length ? includedItems : splitLines(fallbackContract.includedText)).map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </section>
                            <section className="rounded-xl border border-[#8FE7DE]/70 p-4">
                                <h2 className="text-sm font-black text-[#0F8F84]">4. 旅行代金に含まれないもの</h2>
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
                                    {(excludedItems.length ? excludedItems : splitLines(fallbackContract.excludedText)).map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </section>
                        </div>

                        <table className="contract-table mt-4">
                            <thead><tr><th colSpan={2}>5. キャンセル規定</th></tr></thead>
                            <tbody>
                                {cancellationRows.map((row, index) => (
                                    <tr key={index}>
                                        <td className="label">{row.period}</td>
                                        <td className="value" style={{ textAlign: 'center' }}>{row.fee}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <table className="contract-table mt-4">
                            <thead><tr><th colSpan={7}>旅行者情報</th></tr></thead>
                            <tbody>
                                {travelers.map((t, i) => (
                                    <tr key={i}>
                                        <td className="label">氏名</td>
                                        <td className="value">{t.name || '-'}</td>
                                        <td className="label">パスポート名</td>
                                        <td className="value">{t.passportName || '-'}</td>
                                        <td className="label">生年月日</td>
                                        <td className="value">{t.birthdate || t.age || '-'}</td>
                                        <td className="value">{t.phone || '-'}</td>
                                    </tr>
                                ))}
                                <tr><td className="label">到着日</td><td className="value" colSpan={2}>{fmtDate(contract.arrival?.date || reservation.startDate)}</td><td className="label">出発日</td><td className="value" colSpan={3}>{fmtDate(contract.departure?.date || reservation.endDate)}</td></tr>
                                <tr><td className="label">到着便</td><td className="value" colSpan={2}>{contract.arrival?.flight || '-'}</td><td className="label">出発便</td><td className="value" colSpan={3}>{contract.departure?.flight || '-'}</td></tr>
                            </tbody>
                        </table>

                        {accommodations && accommodations.length > 0 && (
                            <table className="contract-table mt-4">
                                <thead><tr><th style={{ width: 60 }}>日程</th><th>宿泊施設</th><th style={{ width: 140 }}>タイプ</th><th>地域</th></tr></thead>
                                <tbody>
                                    {accommodations.map((a) => (
                                        <tr key={a.day}>
                                            <td className="value" style={{ textAlign: 'center' }}>{a.day}日目</td>
                                            <td className="value">{a.accommodation?.name || '-'}</td>
                                            <td className="value">{a.accommodation?.type || '-'}</td>
                                            <td className="value">{a.accommodation?.location || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {guide && guide.name && (
                            <table className="contract-table mt-4">
                                <thead><tr><th colSpan={4}>ガイド情報</th></tr></thead>
                                <tbody>
                                    <tr><td className="label">担当ガイド</td><td className="value">{guide.name}</td><td className="label">連絡先</td><td className="value">{guide.phone || '-'}</td></tr>
                                    {guideLanguages.length > 0 && <tr><td className="label">対応言語</td><td className="value" colSpan={3}>{guideLanguages.join(', ')}</td></tr>}
                                </tbody>
                            </table>
                        )}

                        <table className="contract-table mt-4">
                            <tbody>
                                <tr>
                                    <td className="label" style={{ width: 140 }}>旅行条件・注意事項</td>
                                    <td className="value">
                                        <ol className="list-decimal pl-4 space-y-1.5 text-xs leading-relaxed">
                                            {[...CONTRACT_NOTICES, ...PRIVACY_NOTICES, ...OTHER_NOTICES].map((n, i) => <li key={i}>{n}</li>)}
                                        </ol>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <p className="text-center text-xs text-slate-700 mt-6 leading-relaxed">{contractSettings.signatureNote}</p>
                        <p className="text-center font-bold text-sm text-slate-800 mt-4">発行日：{fmtDate(issuedDate)}</p>

                        <table className="contract-table mt-4">
                            <tbody>
                                <tr>
                                    <td className="label" rowSpan={5} style={{ width: 140, textAlign: 'center' }}>
                                        旅行会社
                                        <div className="mt-2">
                                            <img src={COMPANY_INFO.stampImage} alt="stamp" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ maxWidth: 120, margin: '0 auto' }} loading="lazy" decoding="async" />
                                        </div>
                                    </td>
                                    <td className="label" style={{ width: 160 }}>会社名</td>
                                    <td className="value">{COMPANY_INFO.nameJa}</td>
                                </tr>
                                <tr><td className="label">電話番号</td><td className="value">{COMPANY_INFO.phoneKR}</td></tr>
                                <tr><td className="label">代表者</td><td className="value">{COMPANY_INFO.representative || COMPANY_INFO.ceo}</td></tr>
                                <tr><td className="label">登録番号</td><td className="value">{COMPANY_INFO.registrationNumber}</td></tr>
                                <tr><td className="label">Web</td><td className="value">{COMPANY_INFO.website}</td></tr>
                                <tr>
                                    <td className="label">旅行者署名</td>
                                    <td className="value" colSpan={2} style={{ height: 64 }}>
                                        {contract.agreement?.agreed ? (
                                            <div>
                                                <span className="font-bold text-slate-800">{contract.agreement.name}</span>
                                                <span className="ml-2 text-xs text-teal-600">電子同意済み{contract.agreement.agreedAt ? `：${contract.agreement.agreedAt.split('T')[0]}` : ''}</span>
                                            </div>
                                        ) : <span>&nbsp;</span>}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 leading-relaxed">
                        <p className="font-bold text-slate-700">{COMPANY_INFO.nameEn}</p>
                        <p>{COMPANY_INFO.website} · {COMPANY_INFO.email}</p>
                    </div>

                    <div className="no-print px-6 py-4 bg-white border-t border-slate-100 flex justify-center">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#39C4B7] hover:bg-[#0F8F84] text-white text-sm font-bold transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            印刷 / PDF保存
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
