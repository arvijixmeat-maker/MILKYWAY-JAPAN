import { useNavigate } from 'react-router-dom';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { ReservationShell } from './ReservationShell';
import { formatPrice } from './primitives';

interface ReservationCompleteDesktopProps {
    productName: string;
    email: string;
    total: number;
    deposit: number;
}

/**
 * Step 2 — final confirmation screen.
 * Mirrors the handoff `StepComplete` layout. Buttons route back to
 * /products and /mypage/reservations.
 */
export function ReservationCompleteDesktop({
    productName,
    email,
    total,
    deposit,
}: ReservationCompleteDesktopProps) {
    const navigate = useNavigate();
    const cleanName = productName.replace(/^\[[^\]]+\]\s*/, '');

    return (
        <ReservationShell step={2} productName={productName} hideBack>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 24,
                        padding: '48px 56px',
                        boxShadow: 'var(--shadow-toss)',
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            width: 88,
                            height: 88,
                            margin: '0 auto 24px',
                            borderRadius: 999,
                            background: '#0f766e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 12px 32px -8px rgba(15,118,110,0.45)',
                        }}
                    >
                        <MatIcon name="check" size={52} color="#fff" />
                    </div>
                    <h2
                        style={{
                            fontSize: 30,
                            fontWeight: 700,
                            color: 'var(--fg-1)',
                            margin: '0 0 14px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        予約の申し込みが完了しました
                    </h2>
                    <p
                        style={{
                            fontSize: 14,
                            color: 'var(--fg-4)',
                            lineHeight: 1.75,
                            margin: 0,
                        }}
                    >
                        ご入力いただいたメールアドレス{' '}
                        <strong style={{ color: 'var(--fg-1)', fontWeight: 700 }}>
                            {email}
                        </strong>{' '}
                        に
                        <br />
                        PayPal の請求書をお送りします。
                        <br />
                        <strong style={{ color: '#0f766e', fontWeight: 700 }}>
                            お支払い完了をもって予約確定となります。
                        </strong>
                    </p>

                    <div
                        style={{
                            margin: '32px 0 28px',
                            padding: '26px 28px',
                            background: 'var(--bg-muted)',
                            borderRadius: 16,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 20,
                            textAlign: 'left',
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'var(--fg-5)',
                                    letterSpacing: '0.04em',
                                    fontWeight: 600,
                                }}
                            >
                                選択ツアー
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    marginTop: 4,
                                    lineHeight: 1.4,
                                }}
                            >
                                {cleanName}
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'var(--fg-5)',
                                    letterSpacing: '0.04em',
                                    fontWeight: 600,
                                }}
                            >
                                決済する予約金額
                            </div>
                            <div
                                style={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: 'var(--fg-1)',
                                    marginTop: 4,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                ¥{formatPrice(deposit)}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: 'var(--fg-5)',
                                    marginTop: 2,
                                }}
                            >
                                総旅行費用: ¥{formatPrice(total)}
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            padding: '20px 24px',
                            background: '#fff',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 14,
                            textAlign: 'left',
                        }}
                    >
                        {[
                            {
                                i: 'mark_email_read',
                                t: 'ご登録のEメール宛に決済用の PayPal ご請求メールをお送りします。',
                            },
                            {
                                i: 'credit_score',
                                t: 'メール内のリンクから、クレジットカード等で安全・簡単にお支払いいただけます。',
                            },
                            {
                                i: 'report',
                                t: 'お支払いが確認できない場合、自動的にキャンセルとなることがございます。',
                            },
                        ].map((s) => (
                            <div
                                key={s.t}
                                style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background:
                                            'var(--primary-tint, rgba(15,118,110,0.08))',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <MatIcon name={s.i} size={20} filled color="#0f766e" />
                                </div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        color: 'var(--fg-3)',
                                        lineHeight: 1.65,
                                        paddingTop: 8,
                                    }}
                                >
                                    {s.t}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            style={{
                                flex: '0 0 200px',
                                padding: '16px',
                                background: '#fff',
                                color: 'var(--fg-1)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            トップページへ戻る
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/mypage/reservations')}
                            style={{
                                flex: 1,
                                padding: '16px',
                                background: '#0f766e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                boxShadow: '0 8px 20px -6px rgba(15,118,110,0.5)',
                            }}
                        >
                            <MatIcon name="receipt_long" size={18} color="#fff" /> 予約履歴を確認する
                        </button>
                    </div>
                </div>

                {/* Help band */}
                <div
                    style={{
                        marginTop: 18,
                        padding: '18px 24px',
                        background: '#fff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 999,
                            background: 'var(--bg-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MatIcon name="support_agent" size={22} color="#0f766e" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: 'var(--fg-1)',
                            }}
                        >
                            お支払い・予約に関するご質問
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--fg-5)',
                                marginTop: 2,
                            }}
                        >
                            日本語スタッフが24時間以内にご返信します
                        </div>
                    </div>
                </div>
            </div>
        </ReservationShell>
    );
}
