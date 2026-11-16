import React, { useState } from 'react';
import { C, IC } from './tripDocContent';
import { SectionHead, BigLine, Svg } from './tripDocUi';
import { inter } from './tripDocStyle';
import { COMPANY_INFO, EMBASSY_INFO, LOCAL_EMERGENCY } from '../../constants/company';
import {
    ACTIVITY_NOTICE, SAFETY_INTRO, MEDICAL_NOTES, CONFIRM_PURPOSE, HEALTH_RISKS, MEDICAL_CONSULT, SENIOR_NOTES,
    PRECONTRACT, ADDITIONAL_COST_TAGS, ADDITIONAL_COST_EXAMPLE, COOPERATION, CANCELLATION_CLAUSE, AGREEMENT_TEXT,
} from './legalTexts';

/**
 * 확정일정표 전용 — 긴급 연락처 · 안전 안내 · 약관 (옛 확정일정표와 같은 문구를 새 디자인으로).
 * 긴급 연락처는 항상 보이고, 긴 약관은 항목별로 펼쳐 본다(인쇄 시에는 모두 펼침).
 */
const tel = (p: string) => `tel:${p.replace(/[^+\d]/g, '')}`;

const Bullets: React.FC<{ items: string[]; numbered?: boolean; color?: string }> = ({ items, numbered, color = C.mintBright }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((t, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: numbered ? '22px minmax(0,1fr)' : '12px minmax(0,1fr)', gap: 8, fontSize: 13, lineHeight: 1.7, color: C.body }}>
                {numbered
                    ? <span style={{ ...inter, fontSize: 13, fontWeight: 700, color: C.mintDeep }}>{i + 1}</span>
                    : <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 9 }} />}
                <span>{t}</span>
            </div>
        ))}
    </div>
);

const Fold: React.FC<{ title: string; children: React.ReactNode; warn?: boolean }> = ({ title, children, warn }) => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderRadius: 24, background: warn ? '#FFF6F6' : C.paper, border: `1.5px solid ${warn ? '#FAD4D5' : 'transparent'}`, overflow: 'hidden' }}>
            <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="tdoc-fold-btn"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: C.ink }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</span>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: open ? C.ink : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Svg d={IC.chev} size={14} stroke={open ? C.mintPale : C.body} sw={2.2} style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform .2s' }} />
                </span>
            </button>
            <div className="tdoc-fold-body" style={{ display: open ? 'block' : 'none', padding: '0 18px 18px' }}>{children}</div>
        </div>
    );
};

export const TripDocLegal: React.FC<{ emergencyPhone?: string; note?: string }> = ({ emergencyPhone, note }) => {
    const phone2 = emergencyPhone || COMPANY_INFO.phoneSecondary;
    const prose: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.8, color: C.body };
    return (
        <div style={{ padding: '32px 20px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <style>{`@media print{.tdoc-fold-body{display:block!important}.tdoc-fold-btn span:last-child{display:none!important}}`}</style>
            <SectionHead en="SAFETY & EMERGENCY" pill="海外安全情報・ご案内事項">
                <BigLine parts={['もしもの時も', { a: '安心' }, 'のサポート']} />
            </SectionHead>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16, padding: '22px 20px', borderRadius: 28, background: C.ink, color: '#FFFFFF', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF4F4F', boxShadow: '0 0 0 4px rgba(255,79,79,.25)' }} />
                    <span style={{ fontSize: 16, fontWeight: 700 }}>緊急時の連絡先</span>
                </div>
                <span style={{ fontSize: 12, lineHeight: 1.7, color: C.faint }}>現地状況は刻々と変化するため、現地総括責任者が常時管理しております。ご出発前に <b style={{ color: '#FFFFFF' }}>LINE／カカオトーク</b> の連絡先をご案内いたします。</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ ...inter, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.mintPale }}>LOCAL OFFICE · 日本語対応可</span>
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                        {[COMPANY_INFO.phoneKR, phone2].filter((p, i, a) => p && a.indexOf(p) === i).map(p => (
                            <a key={p} href={tel(p)} style={{ ...inter, color: '#FFFFFF', fontSize: 18, fontWeight: 700 }}>{p}</a>
                        ))}
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
                    {LOCAL_EMERGENCY.map(e => (
                        <a key={e.number} href={tel(e.number)} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <span style={{ fontSize: 11, color: C.faint }}>{e.label}</span>
                            <span style={{ ...inter, fontSize: 22, fontWeight: 700, color: '#FF8A8D' }}>{e.number}</span>
                        </a>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px', borderRadius: 24, background: C.paper }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{EMBASSY_INFO.nameJa}</span>
                    <span style={{ fontSize: 12, lineHeight: 1.6, color: C.sub }}>{EMBASSY_INFO.addressJa}</span>
                    {[['代表電話', EMBASSY_INFO.phone], ['緊急（24時間）', EMBASSY_INFO.emergencyPhone]].map(([k, v]) => (
                        <span key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}><span style={{ color: C.sub }}>{k}</span><a href={tel(v)} style={{ ...inter, fontWeight: 700, color: C.mintDeep }}>{v}</a></span>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 24, background: C.paper }}>
                    <span style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>会社情報</span>
                    {[['商号', COMPANY_INFO.nameLegal], ['代表者', COMPANY_INFO.ceo], ['事業者登録', COMPANY_INFO.registrationNumber], ['観光事業登録', COMPANY_INFO.tourRegistrationNumber], ['所在地', COMPANY_INFO.addressJa]].map(([k, v]) => (
                        <span key={k} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, fontSize: 12.5, lineHeight: 1.5 }}><span style={{ color: C.sub }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></span>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Fold title="現地アクティビティ参加に関するご案内" warn><Bullets items={ACTIVITY_NOTICE} color={C.red} /></Fold>
                <Fold title="安全に関するご案内"><p style={prose}>{SAFETY_INTRO}</p></Fold>
                <Fold title="医療機関について"><Bullets items={MEDICAL_NOTES} /></Fold>
                <Fold title="本確認書の目的"><p style={prose}>{CONFIRM_PURPOSE}</p></Fold>
                <Fold title="ご契約前の確認事項"><Bullets items={PRECONTRACT} numbered /></Fold>
                <Fold title="健康および疾病リスク" warn><Bullets items={HEALTH_RISKS} numbered /></Fold>
                <Fold title="ご契約前に医師へご相談いただきたい方">
                    <Bullets items={MEDICAL_CONSULT} numbered />
                    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 16, background: '#FFFFFF' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.mintDeep, marginBottom: 6 }}>75歳以上のお客様へ</div>
                        <Bullets items={SENIOR_NOTES} numbered />
                    </div>
                </Fold>
                <Fold title="追加滞在費用発生の可能性について">
                    <p style={prose}>以下のような不可抗力により旅程変更や延泊が必要となった場合、発生する追加費用はお客様負担となります。</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                        {ADDITIONAL_COST_TAGS.map(t => <span key={t} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 999, background: '#FFFFFF', color: C.body }}>{t}</span>)}
                    </div>
                    <p style={{ ...prose, fontSize: 12, color: C.sub }}>{ADDITIONAL_COST_EXAMPLE}</p>
                </Fold>
                <Fold title="ガイドおよびスタッフへのご協力"><Bullets items={COOPERATION} numbered /></Fold>
                <Fold title="海外旅行標準約款 第15条（旅行開始前の契約解除）"><p style={prose}>{CANCELLATION_CLAUSE}</p></Fold>
            </div>

            <div style={{ padding: '18px 20px', borderRadius: 24, border: `1.5px dashed ${C.mintPale}`, background: C.mintBg, fontSize: 13, fontWeight: 600, lineHeight: 1.8, textAlign: 'center' }}>{AGREEMENT_TEXT}</div>
            <span style={{ fontSize: 11, lineHeight: 1.7, color: C.mute, textAlign: 'center' }}>※ {note || '本日程は現地事情（天候・交通状況など）により変更となる場合がございます。'}</span>
        </div>
    );
};
