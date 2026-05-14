import { MatIcon } from '../desktop-primitives/MatIcon';
import { SectionHeader } from '../desktop-primitives/SectionHeader';

interface TrustSectionProps {
    contentWidth?: number;
}

const ITEMS = [
    { n: '01', i: 'translate', t: '日本語完全対応', d: '日本語堪能な専門ガイドが同行し、言葉の壁なく安心して楽しめます。' },
    { n: '02', i: 'support_agent', t: '24時間サポート', d: '旅行中も日本語で24時間対応。困ったときはすぐにご連絡ください。' },
    { n: '03', i: 'restaurant', t: '日本人向けの食事', d: '日本人の味覚に合わせたメニュー。食物アレルギーにも個別対応します。' },
    { n: '04', i: 'directions_car', t: '安全第一の車両管理', d: '整備された車両と経験豊富なドライバーで、安全な旅をお約束します。' },
];

export function TrustSectionDesktop({ contentWidth = 1280 }: TrustSectionProps) {
    return (
        <section style={{ background: '#fff', padding: '72px 0 24px', marginTop: 72 }}>
            <div style={{ maxWidth: contentWidth, margin: '0 auto', padding: '0 32px' }}>
                <SectionHeader
                    eyebrow="Why Milkyway Japan"
                    title="Milkyway Japan が選ばれる 4 つの理由"
                    subtitle="モンゴル現地の旅行社だからできる、確かなサポートと安心の品質。"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {ITEMS.map((it) => (
                        <div
                            key={it.n}
                            style={{
                                padding: '32px 28px',
                                background: 'var(--bg-muted)',
                                borderRadius: 24,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 18,
                                minHeight: 240,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 16,
                                        background: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <MatIcon name={it.i} size={28} color="#0f766e" />
                                </div>
                                <div
                                    style={{
                                        fontSize: 28,
                                        fontWeight: 700,
                                        color: '#0f766e',
                                        opacity: 0.5,
                                        fontFamily: 'ui-monospace, Menlo, monospace',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {it.n}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: 'var(--fg-1)',
                                        marginBottom: 8,
                                        letterSpacing: '-0.01em',
                                    }}
                                >
                                    {it.t}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--fg-4)', lineHeight: 1.7 }}>{it.d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
