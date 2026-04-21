import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { COMPANY_INFO, CONTRACT_NOTICES, PRIVACY_NOTICES, OTHER_NOTICES } from '../constants/company';

interface Traveler {
    name?: string;
    passportName?: string;
    age?: number | string;
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
    accommodations: Array<{ day: number; accommodation: { name: string; type?: string; location?: string } }>;
    guide: { name?: string; phone?: string; languages?: any; specialties?: any } | null;
}

const fmtDate = (iso?: string) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
    } catch { return iso; }
};

const fmtYen = (n?: number) => {
    if (typeof n !== 'number' || isNaN(n)) return '¥-';
    return `¥${n.toLocaleString('ja-JP')}`;
};

const parseMaybeJson = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

export const DocumentContract: React.FC = () => {
    const { reservationId } = useParams();
    const [data, setData] = useState<ContractPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reservationId) return;
        (async () => {
            try {
                const res = await api.documents.contract.get(reservationId);
                setData(res);
            } catch (e: any) {
                setError(e.message || '読み込みに失敗しました');
            } finally {
                setLoading(false);
            }
        })();
    }, [reservationId]);

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
                    <p className="text-lg font-bold text-slate-800 mb-2">契約書が見つかりません</p>
                    <p className="text-sm text-slate-500">{error || 'URLをご確認ください。'}</p>
                </div>
            </div>
        );
    }

    const { reservation, contract, accommodations, guide } = data;
    const travelers: Traveler[] = (contract.travelers && contract.travelers.length > 0)
        ? contract.travelers
        : [{ name: reservation.customerName, phone: reservation.customerPhone }];
    const issuedDate = contract.issuedDate || reservation.createdAt?.split('T')[0] || '';
    const guideLanguages = parseMaybeJson(guide?.languages);

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
                .contract-table td, .contract-table th { border: 1px solid #c7d2d6; padding: 8px 10px; vertical-align: middle; }
                .contract-table th {
                    background: #d4f5ee; color: #0e1a18; font-weight: 700; text-align: center;
                    font-size: 14px; padding: 10px;
                }
                .contract-table td.label { background: #f1f5f9; color: #334155; font-weight: 600; text-align: center; width: 140px; }
                .contract-table td.value { background: #ffffff; color: #0e1a18; }
                .contract-badge { display: inline-block; background: #0f766e; color: #fff; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
            `}</style>

            <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
                <div className="doc-shell max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">

                    {/* Title */}
                    <div className="px-8 py-5 bg-teal-50 border-b-2 border-teal-500">
                        <h1 className="text-center text-xl font-bold text-teal-700 tracking-wider">海外旅行契約書（お客様控え）</h1>
                    </div>

                    <div className="px-6 py-6">
                        <p className="text-center text-sm text-slate-700 leading-relaxed mb-5">
                            この度は弊社旅行会社をご選択いただき、誠にありがとうございます。<br />
                            旅行者は下記のとおり旅行契約を締結し、本契約書を交付いたします。
                        </p>

                        {/* Traveler Info */}
                        <table className="contract-table mb-0">
                            <thead>
                                <tr><th colSpan={7}>旅行者情報</th></tr>
                            </thead>
                            <tbody>
                                {travelers.map((t, i) => (
                                    <tr key={i}>
                                        <td className="label">氏名</td>
                                        <td className="value">{t.name || '—'}</td>
                                        <td className="label">パスポート氏名</td>
                                        <td className="value">{t.passportName || '—'}</td>
                                        <td className="label">年齢</td>
                                        <td className="value" style={{ width: 60 }}>{t.age || '—'}</td>
                                        <td className="value" style={{ width: 90 }}>
                                            <div className="text-xs text-slate-500">連絡先</div>
                                            <div>{t.phone || '—'}</div>
                                            {t.gender && <div className="text-xs text-slate-500 mt-1">({t.gender})</div>}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td className="label">モンゴル到着日</td>
                                    <td className="value" colSpan={2}>{fmtDate(contract.arrival?.date || reservation.startDate)}</td>
                                    <td className="label">モンゴル出発日</td>
                                    <td className="value" colSpan={3}>{fmtDate(contract.departure?.date || reservation.endDate)}</td>
                                </tr>
                                <tr>
                                    <td className="label">モンゴル到着時間</td>
                                    <td className="value" colSpan={2}>{contract.arrival?.time || '—'}</td>
                                    <td className="label">モンゴル出発時間</td>
                                    <td className="value" colSpan={3}>{contract.departure?.time || '—'}</td>
                                </tr>
                                <tr>
                                    <td className="label">航空便名</td>
                                    <td className="value" colSpan={2}>{contract.arrival?.flight || '—'}</td>
                                    <td className="label">航空便名</td>
                                    <td className="value" colSpan={3}>{contract.departure?.flight || '—'}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Trip Info */}
                        <table className="contract-table mt-4">
                            <thead>
                                <tr><th colSpan={4}>旅行会社情報</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="label">旅行商品名</td>
                                    <td className="value" colSpan={3} style={{ textAlign: 'center' }}>
                                        <div className="font-bold">{reservation.productName}</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="label">旅行地域</td>
                                    <td className="value">
                                        {contract.region ? <span className="contract-badge">{contract.region}</span> : '—'}
                                    </td>
                                    <td className="label">参加人数</td>
                                    <td className="value" style={{ textAlign: 'center' }}>{reservation.travelers}</td>
                                </tr>
                                <tr>
                                    <td className="label">旅行費用</td>
                                    <td className="value" style={{ textAlign: 'right' }}>{fmtYen(reservation.totalPrice)}</td>
                                    <td className="label">予約金</td>
                                    <td className="value" style={{ textAlign: 'right' }}>{reservation.depositAmount ? fmtYen(reservation.depositAmount) : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="label">残金（現地支払い）</td>
                                    <td className="value" style={{ textAlign: 'right' }} colSpan={3}>
                                        {fmtYen(reservation.balanceAmount ?? (reservation.totalPrice - (reservation.depositAmount || 0)))}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="label">区分</td>
                                    <td className="value">{contract.category ? <span className="contract-badge">{contract.category}</span> : '—'}</td>
                                    <td className="label">主催</td>
                                    <td className="value">{COMPANY_INFO.nameJa}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Notices */}
                        <table className="contract-table mt-4">
                            <tbody>
                                <tr>
                                    <td className="label" style={{ width: 140 }}>注意事項</td>
                                    <td className="value">
                                        <ol className="list-decimal pl-4 space-y-1.5 text-xs leading-relaxed">
                                            {CONTRACT_NOTICES.map((n, i) => <li key={i}>{n}</li>)}
                                        </ol>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="label">個人情報記入時<br />の注意事項</td>
                                    <td className="value">
                                        <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed">
                                            {PRIVACY_NOTICES.map((n, i) => <li key={i}>{n}</li>)}
                                        </ul>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="label">その他事項</td>
                                    <td className="value">
                                        <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed">
                                            {OTHER_NOTICES.map((n, i) => <li key={i}>{n}</li>)}
                                        </ul>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Signing */}
                        <p className="text-center text-xs text-slate-700 mt-6 leading-relaxed">
                            {COMPANY_INFO.nameJa}と旅行者は、上記契約内容および約款を相互に誠実に履行・遵守することを確認し、<br />
                            下記のとおり署名および押印いたします。
                        </p>
                        <p className="text-center font-bold text-sm text-slate-800 mt-4">
                            作成日 {fmtDate(issuedDate)}
                        </p>

                        <table className="contract-table mt-4">
                            <tbody>
                                <tr>
                                    <td className="label" rowSpan={5} style={{ width: 140, textAlign: 'center' }}>
                                        旅行会社押印
                                        <div className="mt-2">
                                            <img src={COMPANY_INFO.stampImage} alt="stamp" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ maxWidth: 120, margin: '0 auto' }} loading="lazy" decoding="async" />
                                        </div>
                                    </td>
                                    <td className="label" style={{ width: 160 }}>電話番号（KR）</td>
                                    <td className="value">{COMPANY_INFO.phoneKR}</td>
                                </tr>
                                <tr>
                                    <td className="label">電話番号（MGL）</td>
                                    <td className="value">{COMPANY_INFO.phoneMGL}</td>
                                </tr>
                                <tr>
                                    <td className="label">担当者（代理）</td>
                                    <td className="value">{COMPANY_INFO.representative}</td>
                                </tr>
                                <tr>
                                    <td className="label">代表者</td>
                                    <td className="value">{COMPANY_INFO.ceo}</td>
                                </tr>
                                <tr>
                                    <td className="label">事業者登録番号<br />（モンゴル）</td>
                                    <td className="value">
                                        {COMPANY_INFO.registrationNumber}
                                        {COMPANY_INFO.registrationNote && <span className="text-slate-500 text-xs">（{COMPANY_INFO.registrationNote}）</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="label">旅行者氏名<br />（署名）</td>
                                    <td className="value" colSpan={2} style={{ height: 60 }}>&nbsp;</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Accommodations */}
                        <div className="mt-6">
                            <p className="font-bold text-sm text-slate-800 mb-2">[宿泊情報]</p>
                            {accommodations && accommodations.length > 0 ? (
                                <table className="contract-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 60 }}>日次</th>
                                            <th>宿泊施設</th>
                                            <th style={{ width: 140 }}>タイプ</th>
                                            <th>地域</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accommodations.map((a) => (
                                            <tr key={a.day}>
                                                <td className="value" style={{ textAlign: 'center' }}>{a.day}日目</td>
                                                <td className="value">{a.accommodation?.name || '—'}</td>
                                                <td className="value">{a.accommodation?.type || '—'}</td>
                                                <td className="value">{a.accommodation?.location || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-xs text-slate-500">更新予定</p>
                            )}
                        </div>

                        {/* Guide */}
                        <div className="mt-5">
                            <p className="font-bold text-sm text-slate-800 mb-2">【ガイド情報】</p>
                            {guide && guide.name ? (
                                <table className="contract-table">
                                    <tbody>
                                        <tr>
                                            <td className="label" style={{ width: 140 }}>担当ガイド</td>
                                            <td className="value">{guide.name}</td>
                                            <td className="label" style={{ width: 100 }}>連絡先</td>
                                            <td className="value">{guide.phone || '—'}</td>
                                        </tr>
                                        {guideLanguages.length > 0 && (
                                            <tr>
                                                <td className="label">対応言語</td>
                                                <td className="value" colSpan={3}>{guideLanguages.join(', ')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-xs text-slate-500">更新予定</p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 leading-relaxed">
                        <p className="font-bold text-slate-700">{COMPANY_INFO.nameEn}</p>
                        <p>{COMPANY_INFO.website} · {COMPANY_INFO.email}</p>
                    </div>

                    {/* Print button */}
                    <div className="no-print px-6 py-4 bg-white border-t border-slate-100 flex justify-center">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">print</span>
                            印刷 / PDF 保存
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};