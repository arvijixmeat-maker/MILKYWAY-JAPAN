import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { Stepper, type StepIdx } from './Stepper';

interface ReservationShellProps {
    step: StepIdx;
    productName?: string;
    /** Custom back behavior. Defaults to navigate(-1). */
    onBack?: () => void;
    /** Hide the back button on the final "complete" step. */
    hideBack?: boolean;
    /** Inline content under the stepper. */
    children: ReactNode;
}

const CONTENT_WIDTH = 1280;

const STEP_TITLES: Record<StepIdx, { title: string; subtitle: string }> = {
    0: {
        title: '予約日およびオプションの選択',
        subtitle: '旅行開始日と人数、オプションを選択してください',
    },
    1: {
        title: '予約情報および決済確認',
        subtitle: 'ご予約者情報と決済方法をご確認ください',
    },
    2: {
        title: '予約申し込み完了',
        subtitle: 'ありがとうございます。お支払い完了をもって予約確定となります',
    },
};

/**
 * Shared chrome for the 3-step desktop booking flow:
 *   - Breadcrumb + Back button
 *   - Step title + subtitle
 *   - Stepper visualizing progress
 *   - Slot for the main step body
 *
 * Used by all three pages (Reservation, Payment, ReservationComplete) so the
 * visual continuity stays even though the URL changes on Next.
 */
export function ReservationShell({
    step,
    productName,
    onBack,
    hideBack,
    children,
}: ReservationShellProps) {
    const navigate = useNavigate();
    const { title, subtitle } = STEP_TITLES[step];
    const handleBack = onBack ?? (() => navigate(-1));
    const cleanName = productName?.replace(/^\[[^\]]+\]\s*/, '') ?? null;

    return (
        <div style={{ background: 'var(--bg-muted)', minHeight: '100vh' }}>
            {/* Breadcrumb + back */}
            <div
                style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)' }}
            >
                <div
                    style={{
                        maxWidth: CONTENT_WIDTH,
                        margin: '0 auto',
                        padding: '16px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    {!hideBack && (
                        <button
                            type="button"
                            onClick={handleBack}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px 8px 10px',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: 999,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--fg-2)',
                            }}
                        >
                            <MatIcon name="chevron_left" size={18} color="var(--fg-2)" /> 戻る
                        </button>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: 'var(--fg-5)',
                            flexWrap: 'wrap',
                        }}
                    >
                        <span>ホーム</span>
                        <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                        <span>ツアー商品</span>
                        {cleanName && (
                            <>
                                <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                                <span>{cleanName}</span>
                            </>
                        )}
                        <MatIcon name="chevron_right" size={14} color="var(--fg-6)" />
                        <span style={{ color: 'var(--fg-2)', fontWeight: 700 }}>予約</span>
                    </div>
                </div>
            </div>

            {/* Step header + stepper */}
            <div style={{ background: '#fff', borderBottom: '1px solid var(--border-subtle)' }}>
                <div
                    style={{
                        maxWidth: CONTENT_WIDTH,
                        margin: '0 auto',
                        padding: '32px 32px 28px',
                    }}
                >
                    <h1
                        style={{
                            fontSize: 28,
                            fontWeight: 700,
                            color: 'var(--fg-1)',
                            margin: '0 0 4px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title}
                    </h1>
                    <p
                        style={{
                            fontSize: 13,
                            color: 'var(--fg-4)',
                            margin: '0 0 24px',
                        }}
                    >
                        {subtitle}
                    </p>
                    <Stepper step={step} />
                </div>
            </div>

            {/* Body */}
            <div
                style={{
                    maxWidth: CONTENT_WIDTH,
                    margin: '0 auto',
                    padding: '36px 32px 80px',
                }}
            >
                {children}
            </div>
        </div>
    );
}
