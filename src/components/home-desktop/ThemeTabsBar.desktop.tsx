import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HomeData } from '../../hooks/useHomeData';

interface ThemeTabsBarProps {
    categories: HomeData['categories'];
    contentWidth?: number;
}

export function ThemeTabsBarDesktop({ categories, contentWidth = 1280 }: ThemeTabsBarProps) {
    const navigate = useNavigate();
    const [active, setActive] = useState<string>('all');

    const tabs = [
        { id: 'all', name: 'おすすめ', path: '/products' },
        ...categories.slice(0, 7).map((c) => ({
            id: c.id,
            name: c.name,
            path: `/category/${c.id}`,
        })),
    ];

    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '20px 32px 0' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {tabs.map((t) => {
                    const on = t.id === active;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                                setActive(t.id);
                                navigate(t.path);
                            }}
                            style={{
                                flexShrink: 0,
                                padding: '11px 20px',
                                borderRadius: 999,
                                background: on ? 'var(--primary-dark)' : '#fff',
                                color: on ? '#fff' : 'var(--fg-3)',
                                border: on ? '1px solid var(--primary-dark)' : '1px solid var(--border)',
                                fontSize: 13,
                                fontWeight: on ? 700 : 500,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: on ? '0 4px 14px -4px rgba(15,118,110,0.4)' : 'none',
                                transition: 'all 150ms',
                            }}
                        >
                            {t.name}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
