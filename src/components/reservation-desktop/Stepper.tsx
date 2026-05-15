import React from 'react';
import { MatIcon } from '../desktop-primitives/MatIcon';

export type StepIdx = 0 | 1 | 2;

const ITEMS = [
    { n: 1, label: '予約日・オプション' },
    { n: 2, label: 'ご予約者情報・決済' },
    { n: 3, label: '申し込み完了' },
];

/** Horizontal stepper shown at the top of each desktop booking page. */
export function Stepper({ step }: { step: StepIdx }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {ITEMS.map((it, i) => {
                const state: 'done' | 'current' | 'upcoming' =
                    i < step ? 'done' : i === step ? 'current' : 'upcoming';
                return (
                    <React.Fragment key={it.n}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background:
                                        state === 'upcoming' ? '#fff' : '#0f766e',
                                    color: state === 'upcoming' ? 'var(--fg-5)' : '#fff',
                                    border:
                                        state === 'upcoming' ? '1px solid var(--border)' : 'none',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    boxShadow:
                                        state === 'current'
                                            ? '0 0 0 4px var(--primary-tint, rgba(15,118,110,0.12))'
                                            : 'none',
                                    transition: 'all 200ms',
                                }}
                            >
                                {state === 'done' ? (
                                    <MatIcon name="check" size={18} color="#fff" />
                                ) : (
                                    it.n
                                )}
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
                                    STEP {it.n}
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: state === 'upcoming' ? 500 : 700,
                                        color:
                                            state === 'upcoming' ? 'var(--fg-5)' : 'var(--fg-1)',
                                        marginTop: 2,
                                    }}
                                >
                                    {it.label}
                                </div>
                            </div>
                        </div>
                        {i < ITEMS.length - 1 && (
                            <div
                                style={{
                                    flex: 1,
                                    height: 2,
                                    background: state === 'done' ? '#0f766e' : 'var(--border)',
                                    marginTop: 4,
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
