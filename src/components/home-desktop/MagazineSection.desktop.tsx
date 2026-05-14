import { useNavigate } from 'react-router-dom';
import type { HomeData } from '../../hooks/useHomeData';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { SectionHeader } from '../desktop-primitives/SectionHeader';
import { TagChip } from '../desktop-primitives/TagChip';

interface MagazineSectionProps {
    magazines: HomeData['magazines'];
    contentWidth?: number;
}

export function MagazineSectionDesktop({ magazines, contentWidth = 1280 }: MagazineSectionProps) {
    const navigate = useNavigate();
    const items = magazines.slice(0, 3);

    if (items.length === 0) return null;

    return (
        <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '72px 32px 0' }}>
            <SectionHeader
                eyebrow="Travel Magazine"
                title="今すぐ出発したい旅行コース"
                subtitle="モンゴリア銀河系が厳選した最高の旅行先"
                onAll={() => navigate('/travel-guide')}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                {items.map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => navigate(`/travel-guide/${it.id}`)}
                        style={{
                            padding: 0,
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            position: 'relative',
                            borderRadius: 24,
                            overflow: 'hidden',
                            aspectRatio: '3/4',
                            backgroundImage: `url(${it.image || '/og-image.jpg'})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
                            transition: 'transform 300ms var(--ease-out)',
                            fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background:
                                    'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                background: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <MatIcon name="flight_takeoff" size={20} color="#fff" />
                        </div>
                        <div style={{ position: 'absolute', top: 20, left: 20 }}>
                            <TagChip tone="light" size="sm">MAGAZINE</TagChip>
                        </div>
                        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, color: '#fff' }}>
                            {it.category && (
                                <div
                                    style={{
                                        display: 'inline-block',
                                        background: 'rgba(0,0,0,0.4)',
                                        backdropFilter: 'blur(6px)',
                                        padding: '4px 10px',
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 500,
                                        marginBottom: 12,
                                    }}
                                >
                                    {it.category}
                                </div>
                            )}
                            <div
                                style={{
                                    fontSize: 22,
                                    fontWeight: 700,
                                    lineHeight: 1.3,
                                    letterSpacing: '-0.01em',
                                    marginBottom: 8,
                                }}
                            >
                                {it.title}
                            </div>
                            {it.description && (
                                <div
                                    style={{
                                        fontSize: 13,
                                        opacity: 0.85,
                                        lineHeight: 1.55,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {it.description}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
