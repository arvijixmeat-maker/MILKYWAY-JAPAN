import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { PageHero } from '../desktop-primitives/PageHero';

interface MeUser {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    avatarUrl?: string;
}

interface Reservation {
    id: string;
    status?: string;
    productName?: string;
    product_name?: string;
    startDate?: string;
    start_date?: string;
    endDate?: string;
    end_date?: string;
    createdAt?: string;
    created_at?: string;
    totalPrice?: number;
    total_price?: number;
    depositStatus?: string;
    deposit_status?: string;
    balanceStatus?: string;
    balance_status?: string;
}

interface Quote {
    id: string;
    status?: string;
    destination?: string;
    period?: string;
    createdAt?: string;
    created_at?: string;
}

const MENU_ITEMS = [
    { id: 'overview', label: '概要', icon: 'dashboard', path: '/mypage' },
    { id: 'reservations', label: 'ご予約', icon: 'event_available', path: '/mypage/reservations' },
    { id: 'estimates', label: '見積もり履歴', icon: 'description', path: '/mypage/estimates' },
    { id: 'travel-mates', label: '同行者投稿', icon: 'group', path: '/mypage/travel-mates' },
    { id: 'wishlist', label: 'ウィッシュリスト', icon: 'favorite', path: '/mypage/wishlist' },
    { id: 'recently-viewed', label: '最近見た商品', icon: 'history', path: '/mypage/recently-viewed' },
    { id: 'reviews', label: 'マイレビュー', icon: 'reviews', path: '/mypage/reviews' },
    { id: 'notifications', label: 'お知らせ', icon: 'notifications', path: '/mypage/notifications' },
];

export function MyPageDesktop({ contentWidth = 1280 }: { contentWidth?: number }) {
    const navigate = useNavigate();
    const [me, setMe] = useState<MeUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api.auth
            .me()
            .then((u: MeUser | null) => {
                if (!cancelled) {
                    setMe(u);
                    setAuthChecked(true);
                }
            })
            .catch(() => {
                if (!cancelled) setAuthChecked(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const { data: reservations = [] } = useQuery<Reservation[]>({
        queryKey: ['myReservations'],
        enabled: !!me,
        queryFn: async () => {
            try {
                const data = await api.reservations.list();
                return Array.isArray(data) ? (data as Reservation[]) : [];
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 30,
    });

    const { data: quotes = [] } = useQuery<Quote[]>({
        queryKey: ['myQuotes'],
        enabled: !!me,
        queryFn: async () => {
            try {
                const data = await api.quotes.list();
                return Array.isArray(data) ? (data as Quote[]) : [];
            } catch {
                return [];
            }
        },
        staleTime: 1000 * 30,
    });

    const handleLogout = async () => {
        try {
            await api.auth.logout();
        } catch {
            // ignore
        }
        navigate('/login');
    };

    // Capture "now" once at component mount so render stays pure.
    const [nowTs] = useState(() => Date.now());
    const activeRes = reservations.filter((r) => r.status === 'confirmed' || r.status === 'paid' || r.status === 'in_progress');
    const upcomingRes = useMemo(
        () => reservations.filter((r) => {
            const start = r.startDate || r.start_date;
            return start && new Date(start).getTime() > nowTs;
        }),
        [reservations, nowTs]
    );

    // ====== Auth gate ======
    if (authChecked && !me) {
        return (
            <div style={{ background: '#fff', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 420 }}>
                    <div
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: 999,
                            background: 'var(--primary-tint)',
                            margin: '0 auto 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MatIcon name="person" size={36} color="#0f766e" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>ログインが必要です</h2>
                    <p style={{ fontSize: 14, color: 'var(--fg-4)', marginTop: 10, lineHeight: 1.7 }}>
                        マイページをご利用いただくにはログインしてください。
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{
                            marginTop: 22,
                            padding: '14px 32px',
                            background: '#0f766e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: '0 8px 20px -6px rgba(15,118,110,0.5)',
                        }}
                    >
                        ログイン
                    </button>
                </div>
            </div>
        );
    }

    if (!authChecked) {
        return (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--fg-5)' }}>読み込み中...</div>
        );
    }

    return (
        <div style={{ background: '#fff' }}>
            <PageHero
                eyebrow="My Page"
                title="マイページ"
                subtitle="ご予約状況、お見積もり、ウィッシュリストなどを一括管理できます。"
                breadcrumbs={[
                    { label: 'ホーム', path: '/' },
                    { label: 'マイページ' },
                ]}
                contentWidth={contentWidth}
            />

            <section style={{ maxWidth: contentWidth, margin: '0 auto', padding: '40px 32px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, alignItems: 'start' }}>
                    {/* Left sidebar */}
                    <aside style={{ position: 'sticky', top: 156, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Profile card */}
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 20,
                                padding: 22,
                                boxShadow: 'var(--shadow-toss)',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: 88,
                                    height: 88,
                                    borderRadius: 999,
                                    background: me?.image || me?.avatarUrl
                                        ? `url(${me.image || me.avatarUrl}) center/cover`
                                        : 'linear-gradient(135deg, #0f766e, #115e59)',
                                    color: '#fff',
                                    margin: '0 auto 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    fontWeight: 700,
                                    boxShadow: '0 8px 24px -8px rgba(15,118,110,0.4)',
                                }}
                            >
                                {!me?.image && !me?.avatarUrl && (me?.name || me?.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
                                {me?.name || me?.email || 'ゲスト'} 様
                            </div>
                            {me?.email && (
                                <div
                                    style={{
                                        fontSize: 12,
                                        color: 'var(--fg-5)',
                                        marginTop: 4,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {me.email}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleLogout}
                                style={{
                                    marginTop: 16,
                                    width: '100%',
                                    padding: '10px',
                                    background: '#fff',
                                    color: 'var(--fg-3)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                ログアウト
                            </button>
                        </div>

                        {/* Menu */}
                        <nav
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 20,
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-toss)',
                            }}
                        >
                            {MENU_ITEMS.map((it, i) => (
                                <button
                                    key={it.id}
                                    type="button"
                                    onClick={() => navigate(it.path)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        width: '100%',
                                        padding: '14px 18px',
                                        background: i === 0 ? 'var(--primary-tint)' : 'none',
                                        border: 'none',
                                        borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        fontSize: 14,
                                        fontWeight: i === 0 ? 700 : 500,
                                        color: i === 0 ? 'var(--primary-dark)' : 'var(--fg-2)',
                                        textAlign: 'left',
                                    }}
                                >
                                    <MatIcon name={it.icon} size={20} color={i === 0 ? '#0f766e' : 'var(--fg-4)'} />
                                    <span style={{ flex: 1 }}>{it.label}</span>
                                    <MatIcon name="chevron_right" size={16} color="var(--fg-5)" />
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                            <StatCard label="ご予約" value={String(reservations.length)} icon="event_available" onClick={() => navigate('/mypage/reservations')} />
                            <StatCard label="進行中" value={String(activeRes.length)} icon="local_fire_department" onClick={() => navigate('/mypage/reservations')} />
                            <StatCard label="見積もり" value={String(quotes.length)} icon="description" onClick={() => navigate('/mypage/estimates')} />
                            <StatCard label="ウィッシュ" value="—" icon="favorite" onClick={() => navigate('/mypage/wishlist')} />
                        </div>

                        {/* Upcoming reservation */}
                        <div
                            style={{
                                background: '#fff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 20,
                                padding: 24,
                                boxShadow: 'var(--shadow-toss)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                                <div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            color: '#0f766e',
                                            textTransform: 'uppercase',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Upcoming Trip
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                                        次のご予約
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/mypage/reservations')}
                                    style={smallActionBtn}
                                >
                                    すべて見る <MatIcon name="arrow_forward" size={14} color="var(--fg-2)" />
                                </button>
                            </div>

                            {upcomingRes.length === 0 ? (
                                <div
                                    style={{
                                        padding: '40px 24px',
                                        textAlign: 'center',
                                        background: 'var(--bg-muted)',
                                        borderRadius: 16,
                                        color: 'var(--fg-5)',
                                        fontSize: 13,
                                    }}
                                >
                                    予定中のご予約はありません。
                                    <div style={{ marginTop: 12 }}>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/products')}
                                            style={{
                                                padding: '10px 18px',
                                                background: '#0f766e',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 999,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                            }}
                                        >
                                            ツアーを探す
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {upcomingRes.slice(0, 3).map((r) => (
                                        <ReservationRow key={r.id} r={r} onClick={() => navigate(`/mypage/reservations/${r.id}`)} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick actions grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                            <QuickAction
                                title="お見積もり依頼"
                                desc="1分でリクエスト"
                                icon="edit_note"
                                onClick={() => navigate('/custom-estimate')}
                                primary
                            />
                            <QuickAction
                                title="同行者を募集"
                                desc="旅費を分担"
                                icon="group_add"
                                onClick={() => navigate('/travel-mates/write')}
                            />
                            <QuickAction
                                title="レビューを書く"
                                desc="体験をシェア"
                                icon="reviews"
                                onClick={() => navigate('/reviews/write')}
                            />
                        </div>

                        {/* Recent estimates */}
                        {quotes.length > 0 && (
                            <div
                                style={{
                                    background: '#fff',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 20,
                                    padding: 24,
                                    boxShadow: 'var(--shadow-toss)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: 0, letterSpacing: '-0.01em' }}>
                                        最近の見積もりリクエスト
                                    </h2>
                                    <button type="button" onClick={() => navigate('/mypage/estimates')} style={smallActionBtn}>
                                        すべて見る <MatIcon name="arrow_forward" size={14} color="var(--fg-2)" />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {quotes.slice(0, 3).map((q) => (
                                        <div
                                            key={q.id}
                                            onClick={() => navigate(`/estimate/${q.id}`)}
                                            role="button"
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr auto',
                                                gap: 12,
                                                padding: '14px 18px',
                                                background: 'var(--bg-muted)',
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>
                                                    {q.destination || 'モンゴル旅行'}
                                                </div>
                                                {q.period && (
                                                    <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 3 }}>{q.period}</div>
                                                )}
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    background:
                                                        q.status === 'answered'
                                                            ? 'var(--primary-tint)'
                                                            : q.status === 'completed'
                                                                ? '#dcfce7'
                                                                : 'var(--bg-muted)',
                                                    color:
                                                        q.status === 'answered'
                                                            ? 'var(--primary-dark)'
                                                            : q.status === 'completed'
                                                                ? '#15803d'
                                                                : 'var(--fg-5)',
                                                    border: '1px solid ' + (q.status === 'answered' ? 'rgba(15,118,110,0.3)' : 'var(--border-subtle)'),
                                                }}
                                            >
                                                {q.status === 'answered' ? '回答済み' : q.status === 'completed' ? '完了' : '対応中'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Support card */}
                        <div
                            style={{
                                padding: '24px 26px',
                                background: 'linear-gradient(120deg, var(--primary-tint) 0%, transparent 100%)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 20,
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                gap: 24,
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        color: '#0f766e',
                                        textTransform: 'uppercase',
                                        marginBottom: 8,
                                    }}
                                >
                                    Customer Support
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
                                    お困りのことはありませんか？
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--fg-4)', marginTop: 6, lineHeight: 1.6 }}>
                                    日本語スタッフが24時間以内にご返信。FAQも合わせてご確認ください。
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/faq')}
                                    style={{
                                        padding: '12px 22px',
                                        background: '#fff',
                                        color: 'var(--fg-1)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 999,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    FAQを見る
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (typeof window.openChannelTalk === 'function') window.openChannelTalk();
                                    }}
                                    style={{
                                        padding: '12px 22px',
                                        background: '#0f766e',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 999,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <MatIcon name="chat" size={16} color="#fff" /> 問い合わせ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div style={{ height: 96 }} />
        </div>
    );
}

function StatCard({ label, value, icon, onClick }: { label: string; value: string; icon: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 16,
                padding: '20px 18px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                boxShadow: 'var(--shadow-toss)',
                transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-toss)';
                e.currentTarget.style.transform = '';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'var(--primary-tint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MatIcon name={icon} size={22} color="#0f766e" />
                </div>
                <MatIcon name="arrow_outward" size={16} color="var(--fg-5)" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 4 }}>{label}</div>
        </button>
    );
}

function ReservationRow({ r, onClick }: { r: Reservation; onClick: () => void }) {
    const productName = r.productName || r.product_name || 'モンゴルツアー';
    const startDate = r.startDate || r.start_date;
    const endDate = r.endDate || r.end_date;
    const dateLabel = startDate
        ? endDate
            ? `${startDate.slice(0, 10)} 〜 ${endDate.slice(0, 10)}`
            : startDate.slice(0, 10)
        : '';
    const statusColor =
        r.status === 'confirmed'
            ? '#16a34a'
            : r.status === 'paid'
                ? '#0f766e'
                : r.status === 'pending'
                    ? '#f59e0b'
                    : 'var(--fg-5)';
    const statusLabel =
        r.status === 'confirmed' ? '確定' :
        r.status === 'paid' ? '支払い済み' :
        r.status === 'pending' ? '入金待ち' :
        r.status === 'in_progress' ? '進行中' :
        r.status === 'completed' ? '完了' :
        '準備中';

    return (
        <div
            onClick={onClick}
            role="button"
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                padding: '18px 20px',
                background: 'var(--bg-muted)',
                borderRadius: 14,
                cursor: 'pointer',
                alignItems: 'center',
            }}
        >
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            background: statusColor,
                            padding: '3px 8px',
                            borderRadius: 4,
                            letterSpacing: '0.04em',
                        }}
                    >
                        {statusLabel}
                    </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>{productName}</div>
                {dateLabel && (
                    <div style={{ fontSize: 12, color: 'var(--fg-5)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MatIcon name="calendar_month" size={13} color="var(--fg-5)" /> {dateLabel}
                    </div>
                )}
            </div>
            <MatIcon name="chevron_right" size={20} color="var(--fg-4)" />
        </div>
    );
}

function QuickAction({
    title,
    desc,
    icon,
    onClick,
    primary,
}: {
    title: string;
    desc: string;
    icon: string;
    onClick: () => void;
    primary?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                background: primary ? 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' : '#fff',
                color: primary ? '#fff' : 'var(--fg-1)',
                border: primary ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: 16,
                padding: '22px 20px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                boxShadow: primary ? '0 8px 20px -6px rgba(15,118,110,0.4)' : 'var(--shadow-toss)',
                transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: primary ? 'rgba(255,255,255,0.15)' : 'var(--primary-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                }}
            >
                <MatIcon name={icon} size={22} color={primary ? '#fff' : '#0f766e'} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
            <div style={{ fontSize: 12, color: primary ? 'rgba(255,255,255,0.8)' : 'var(--fg-5)', marginTop: 4 }}>{desc}</div>
        </button>
    );
}

const smallActionBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--fg-2)',
    cursor: 'pointer',
    fontFamily: 'inherit',
};
