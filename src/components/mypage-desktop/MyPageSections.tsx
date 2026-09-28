import { useState, type CSSProperties, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useNotification, type Notification } from '../../contexts/NotificationContext';
import { useToast } from '../ui/Toast';
import { formatRelativeTime } from '../../utils/formatDate';
import { STATUS_MAP } from '../../utils/reservationDetail';
import type { HomeProduct, ReviewStat } from '../home-desktop/homeDesktopData';
import { MW, MW_FONT_EN, MW_GRADIENT, cleanTitle, isUsableImage, yen } from '../desktop-primitives/mwTokens';
import { EmptyBox, FilterPills, Ico, Loading, PanelHead } from './myPageUi';
import { HAIR, ICON, PAPER, TONE, cardBox, ghostBtn, ghostHover, hover, mintBtn, mintHover, reservationTone, smallPill, type BadgeTone } from './myPageTheme';
import { daysUntil, parseDbTime, type MeUser, type MyMatePost, type MyQuote, type MyReservation, type MyReview, type RecentItem } from './useMyPageData';

type Go = (path: string) => void;

/* ---------- shared rows ---------- */

const dateRange = (start: string, end: string) => [start, end].filter(Boolean).join(' 〜 ');

const reservationMeta = (r: MyReservation) => [dateRange(r.start, r.end), r.travelers > 0 ? `${r.travelers}名` : ''].filter(Boolean).join('・');

function Badge({ label, tone, style }: { label: string; tone: BadgeTone; style?: CSSProperties }) {
    return (
        <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}`, whiteSpace: 'nowrap', ...style }}>
            {label}
        </span>
    );
}

function ListRow({ title, meta, badge, onClick, extra }: { title: string; meta: string; badge: ReactNode; onClick: () => void; extra?: ReactNode }) {
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 14, background: PAPER, color: MW.navy, textDecoration: 'none' }}
            {...hover({ background: MW.mintBg }, { background: PAPER })}
        >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                {meta && <span style={{ fontSize: 13, color: MW.mute }}>{meta}</span>}
            </div>
            {extra}
            {badge}
        </a>
    );
}

function Thumb({ src, size, radius = 12 }: { src?: string; size: number; radius?: number }) {
    return (
        <span style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0, background: MW.mintTint, display: 'block' }}>
            {isUsableImage(src) && <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </span>
    );
}

const QUOTE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
    new: { label: '回答待ち', tone: TONE.plain },
    pending: { label: '回答待ち', tone: TONE.plain },
    waiting: { label: '回答待ち', tone: TONE.plain },
    processing: { label: 'ご相談中', tone: TONE.plain },
    answered: { label: '回答済み', tone: TONE.tint },
    reservation_requested: { label: '予約リクエスト中', tone: TONE.tint },
    converted: { label: '予約確定済み', tone: TONE.solid },
    completed: { label: '完了', tone: TONE.done },
    cancelled: { label: 'キャンセル', tone: TONE.red },
};

function QuoteRows({ quotes, go }: { quotes: MyQuote[]; go: Go }) {
    return (
        <>
            {quotes.map((q) => {
                const st = QUOTE_STATUS[q.status] || QUOTE_STATUS.new;
                const requested = q.createdAt ? `依頼日 ${q.createdAt.slice(0, 10)}` : '';
                return (
                    <ListRow
                        key={q.id}
                        title={q.destination ? `オーダーメイド見積もり（${q.destination}）` : 'オーダーメイド見積もり'}
                        meta={[q.period, q.headcount, requested].filter(Boolean).join('・')}
                        badge={<Badge label={st.label} tone={st.tone} />}
                        onClick={() => go(q.status === 'converted' ? '/mypage/reservations' : `/estimate/${q.id}`)}
                    />
                );
            })}
        </>
    );
}

function ReservationRows({ reservations, today, go }: { reservations: MyReservation[]; today: string; go: Go }) {
    return (
        <>
            {reservations.map((r) => {
                const d = r.start && r.status !== 'cancelled' ? daysUntil(r.start, today) : -1;
                return (
                    <ListRow
                        key={r.id}
                        title={r.productName}
                        meta={reservationMeta(r)}
                        extra={d >= 0 && d <= 90 ? <DayChip days={d} /> : undefined}
                        badge={<Badge label={(STATUS_MAP[r.status] || { label: r.status || '準備中' }).label} tone={reservationTone(r.status)} />}
                        onClick={() => go(`/mypage/reservations/${r.id}`)}
                    />
                );
            })}
        </>
    );
}

function DayChip({ days }: { days: number }) {
    return (
        <span style={{ fontFamily: MW_FONT_EN, fontSize: 12, fontWeight: 600, color: MW.mintDeep, background: MW.mintTint, padding: '6px 10px', borderRadius: 999, flexShrink: 0 }}>
            {days === 0 ? 'D-DAY' : `D-${days}`}
        </span>
    );
}

/* ---------- 概要 ---------- */

export function OverviewSection({
    reservations, quotes, wishCount, today, productById, loading, go,
}: {
    reservations: MyReservation[];
    quotes: MyQuote[];
    wishCount: number;
    today: string;
    productById: Map<string, HomeProduct>;
    loading: boolean;
    go: Go;
}) {
    const active = reservations.filter((r) => !['cancelled', 'completed'].includes(r.status) && (r.end || r.start) >= today);
    const next = reservations
        .filter((r) => r.status !== 'cancelled' && !!r.start && r.start >= today)
        .sort((a, b) => a.start.localeCompare(b.start))[0];
    const stats = [
        { label: 'ご予約', value: reservations.length, d: ICON.bookings, path: '/mypage/reservations' },
        { label: '進行中', value: active.length, d: ICON.active, path: '/mypage/reservations' },
        { label: '見積もり', value: quotes.length, d: ICON.quotes, path: '/mypage/estimates' },
        { label: 'ウィッシュ', value: wishCount, d: ICON.wish, path: '/mypage/wishlist' },
    ];

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 16 }}>
                {stats.map((s) => (
                    <button
                        key={s.label}
                        type="button"
                        onClick={() => go(s.path)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, border: `1px solid ${MW.line}`, borderRadius: 20, background: '#fff', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s,transform .15s', color: MW.navy }}
                        {...hover({ borderColor: MW.mint, transform: 'translateY(-2px)' }, { borderColor: MW.line, transform: '' })}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, width: '100%' }}>
                            <span style={{ width: 40, height: 40, borderRadius: 12, background: MW.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Ico d={s.d} />
                            </span>
                            <span style={{ color: MW.mute2, fontSize: 14 }}>↗</span>
                        </div>
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 24, fontWeight: 600 }}>{loading ? '—' : s.value}</span>
                        <span style={{ fontSize: 13, color: MW.mute }}>{s.label}</span>
                    </button>
                ))}
            </div>

            <div style={{ ...cardBox, gap: 20 }}>
                <PanelHead
                    eyebrow="UPCOMING TRIP"
                    title="次のご予約"
                    action={<button type="button" onClick={() => go('/mypage/reservations')} style={{ ...ghostBtn, color: MW.navy }} {...hover({ borderColor: MW.mint }, { borderColor: MW.line })}>すべて見る →</button>}
                />
                {loading ? (
                    <Loading />
                ) : next ? (
                    <a
                        href={`/mypage/reservations/${next.id}`}
                        onClick={(e) => { e.preventDefault(); go(`/mypage/reservations/${next.id}`); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 16, background: PAPER, color: MW.navy, textDecoration: 'none' }}
                        {...hover({ background: MW.mintBg }, { background: PAPER })}
                    >
                        <Thumb src={productById.get(next.productId)?.mainImages[0]} size={72} />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                            <Badge label={(STATUS_MAP[next.status] || { label: next.status }).label} tone={reservationTone(next.status)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }} />
                            <span style={{ fontSize: 16, fontWeight: 900 }}>{next.productName}</span>
                            <span style={{ fontSize: 13, color: MW.mute }}>{reservationMeta(next)}</span>
                        </div>
                        <DayChip days={daysUntil(next.start, today)} />
                        <span style={{ color: MW.mute, fontSize: 18 }}>›</span>
                    </a>
                ) : (
                    <EmptyBox text="予定中のご予約はありません。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: 12 }}>
                <QuickLink primary title="お見積もり依頼" sub="1分でリクエスト" d={ICON.quoteRequest} onClick={() => go('/custom-estimate')} />
                <QuickLink title="同行者を募集" sub="旅費を分担" d={ICON.mateAdd} onClick={() => go('/travel-mates/write')} />
                <QuickLink title="レビューを書く" sub="体験をシェア" d={ICON.reviews} onClick={() => go('/reviews/write')} />
            </div>

            <div style={{ ...cardBox, gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 6 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>最近の見積もりリクエスト</h2>
                    <button type="button" onClick={() => go('/mypage/estimates')} style={{ ...ghostBtn, color: MW.navy }} {...hover({ borderColor: MW.mint }, { borderColor: MW.line })}>すべて見る →</button>
                </div>
                {loading ? <Loading /> : quotes.length > 0 ? (
                    <QuoteRows quotes={quotes.slice(0, 3)} go={go} />
                ) : (
                    <EmptyBox text="お見積もりのリクエストはまだありません。" action={{ label: 'お見積もりを依頼する', onClick: () => go('/custom-estimate') }} />
                )}
            </div>
        </>
    );
}

function QuickLink({ title, sub, d, onClick, primary }: { title: string; sub: string; d: string; onClick: () => void; primary?: boolean }) {
    const base: CSSProperties = primary
        ? { background: MW_GRADIENT, border: '1px solid transparent' }
        : { background: '#fff', border: `1px solid ${MW.line}` };
    return (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            style={{ ...base, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 18, color: MW.navy, textDecoration: 'none', transition: 'transform .15s,border-color .15s' }}
            {...hover(
                primary ? { transform: 'translateY(-2px)' } : { transform: 'translateY(-2px)', borderColor: MW.mint },
                primary ? { transform: '' } : { transform: '', borderColor: MW.line },
            )}
        >
            <span style={{ width: 48, height: 48, borderRadius: 14, background: primary ? 'rgba(255,255,255,0.4)' : MW.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ico d={d} size={22} color={primary ? MW.navy : MW.mintDeep} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 900, whiteSpace: 'nowrap' }}>{title}</span>
                <span style={{ fontSize: 12, color: primary ? MW.navy : MW.mute }}>{sub}</span>
            </span>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: primary ? 'rgba(255,255,255,0.4)' : PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: primary ? MW.navy : MW.mintDeep }}>→</span>
        </a>
    );
}

/* ---------- ご予約 / 見積もり履歴 ---------- */

export function ReservationsSection({ reservations, today, loading, go }: { reservations: MyReservation[]; today: string; loading: boolean; go: Go }) {
    return (
        <div style={{ ...cardBox, gap: 12 }}>
            <div style={{ marginBottom: 6 }}>
                <PanelHead eyebrow="BOOKINGS" title="ご予約" count={loading ? undefined : reservations.length} sub="ご予約の状況・お支払い・旅行書類は各予約の詳細からご確認いただけます。" />
            </div>
            {loading ? <Loading /> : reservations.length > 0 ? (
                <ReservationRows reservations={reservations} today={today} go={go} />
            ) : (
                <EmptyBox text="ご予約はまだありません。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
            )}
        </div>
    );
}

export function EstimatesSection({ quotes, loading, go }: { quotes: MyQuote[]; loading: boolean; go: Go }) {
    return (
        <div style={{ ...cardBox, gap: 12 }}>
            <div style={{ marginBottom: 6 }}>
                <PanelHead
                    eyebrow="QUOTES"
                    title="見積もり履歴"
                    count={loading ? undefined : quotes.length}
                    sub="オーダーメイド旅行のお見積もりリクエストと回答状況です。"
                    action={<button type="button" onClick={() => go('/custom-estimate')} style={mintBtn} {...mintHover}>＋ 新しく依頼する</button>}
                />
            </div>
            {loading ? <Loading /> : quotes.length > 0 ? (
                <QuoteRows quotes={quotes} go={go} />
            ) : (
                <EmptyBox text="お見積もりのリクエストはまだありません。" action={{ label: 'お見積もりを依頼する', onClick: () => go('/custom-estimate') }} />
            )}
        </div>
    );
}

/* ---------- 同行者投稿 ---------- */

type MateFilter = 'all' | 'open' | 'closed';

export function MatesSection({ me, posts, loading, go }: { me: MeUser; posts: MyMatePost[]; loading: boolean; go: Go }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [filter, setFilter] = useState<MateFilter>('all');
    const key = ['myPage', 'mates', me.id];
    const items = posts.filter((p) => filter === 'all' || (filter === 'closed' ? p.status === 'closed' : p.status !== 'closed'));
    const write = () => go('/travel-mates/write');

    const toggleStatus = async (p: MyMatePost) => {
        const status = p.status === 'recruiting' ? 'closed' : 'recruiting';
        try {
            await api.travelMates.update(p.id, { status });
            queryClient.setQueryData<MyMatePost[]>(key, (cur = []) => cur.map((x) => (x.id === p.id ? { ...x, status } : x)));
        } catch (e) {
            console.error('Travel mate status update failed:', e);
            showToast('error', '募集状況の変更に失敗しました。');
        }
    };
    const remove = async (p: MyMatePost) => {
        if (!window.confirm('この投稿を削除しますか？')) return;
        try {
            await api.travelMates.delete(p.id);
            queryClient.setQueryData<MyMatePost[]>(key, (cur = []) => cur.filter((x) => x.id !== p.id));
        } catch (e) {
            console.error('Travel mate delete failed:', e);
            showToast('error', '投稿の削除に失敗しました。');
        }
    };

    return (
        <div style={cardBox}>
            <PanelHead
                eyebrow="TRAVEL MATES"
                title="同行者投稿"
                count={loading ? undefined : posts.length}
                sub="一緒に旅する仲間を募集して、車両・ガイド費用を分担できます。"
                action={<button type="button" onClick={write} style={mintBtn} {...mintHover}>＋ 新規投稿</button>}
            />
            <FilterPills<MateFilter> items={[['all', 'すべて'], ['open', '募集中'], ['closed', '募集終了']]} value={filter} onChange={setFilter} />
            {loading ? <Loading /> : items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {items.map((p) => {
                        const closed = p.status === 'closed';
                        const tone = closed ? TONE.done : TONE.tint;
                        const pct = p.capacity > 0 ? Math.min(100, Math.round((p.joined / p.capacity) * 100)) : 0;
                        return (
                            <div
                                key={p.id}
                                style={{ display: 'flex', gap: 18, padding: '18px 20px', border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff', flexWrap: 'wrap', alignItems: 'center' }}
                                {...hover({ borderColor: MW.mint }, { borderColor: MW.line })}
                            >
                                <a
                                    href={`/travel-mates/${p.id}`}
                                    onClick={(e) => { e.preventDefault(); go(`/travel-mates/${p.id}`); }}
                                    style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, color: MW.navy, textDecoration: 'none' }}
                                >
                                    <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: tone.bg, color: tone.fg }}>{closed ? '募集終了' : '募集中'}</span>
                                        {p.region && <span style={{ fontSize: 12, color: MW.mute }}>{p.region}</span>}
                                    </span>
                                    <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4, color: closed ? MW.mute : MW.navy }}>{p.title}</span>
                                    <span style={{ display: 'flex', gap: 16, fontSize: 12, color: MW.mute, flexWrap: 'wrap' }}>
                                        {(p.start || p.end) && <span>{dateRange(p.start, p.end)}{p.duration ? `（${p.duration}）` : ''}</span>}
                                        <span>コメント {p.comments}</span>
                                        <span>閲覧 {p.views}</span>
                                        {p.createdAt && <span>{formatRelativeTime(parseDbTime(p.createdAt))}</span>}
                                    </span>
                                </a>
                                <span style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {p.capacity > 0 && (
                                        <>
                                            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MW.mute }}>
                                                <span>参加者</span>
                                                <strong style={{ fontFamily: MW_FONT_EN, fontWeight: 600, color: MW.navy }}>{p.joined} / {p.capacity}名</strong>
                                            </span>
                                            <span style={{ height: 6, borderRadius: 999, background: HAIR, overflow: 'hidden' }}>
                                                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#27AB8F,#3FC2A4)', borderRadius: 999 }} />
                                            </span>
                                        </>
                                    )}
                                    <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button type="button" onClick={() => toggleStatus(p)} style={smallPill} {...ghostHover}>{closed ? '募集を再開' : '募集を締め切る'}</button>
                                        <button type="button" onClick={() => remove(p)} style={smallPill} {...ghostHover}>削除</button>
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <EmptyBox text={posts.length ? '該当する投稿はありません。' : '作成した投稿はまだありません。'} action={{ label: '＋ 新規投稿', onClick: write }} />
            )}
        </div>
    );
}

/* ---------- ウィッシュリスト / 最近見た商品 ---------- */

export interface TripCardData {
    key: string;
    productId: string;
    title: string;
    image?: string;
    duration?: string;
    category?: string;
    price: number;
}

function TripCard({ t, stat, fav, onFav, onRemove, go }: { t: TripCardData; stat?: ReviewStat; fav: boolean; onFav: () => void; onRemove?: () => void; go: Go }) {
    const stop = (fn: () => void) => (e: { preventDefault: () => void; stopPropagation: () => void }) => { e.preventDefault(); e.stopPropagation(); fn(); };
    const roundBtn: CSSProperties = { width: 34, height: 34, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
    return (
        <a
            href={`/products/${t.productId}`}
            onClick={(e) => { e.preventDefault(); go(`/products/${t.productId}`); }}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', border: `1px solid ${MW.line}`, borderRadius: 18, overflow: 'hidden', background: '#fff', color: MW.navy, textDecoration: 'none', transition: 'border-color .15s,transform .15s' }}
            {...hover({ borderColor: MW.mint, transform: 'translateY(-2px)' }, { borderColor: MW.line, transform: '' })}
        >
            <span style={{ position: 'relative', display: 'block', aspectRatio: '4/3', background: MW.chip }}>
                {isUsableImage(t.image) && <img src={t.image} alt={t.title} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                {t.duration && (
                    <span style={{ position: 'absolute', left: 12, top: 12, fontSize: 11, fontWeight: 700, color: MW.navy, background: 'rgba(255,255,255,0.92)', padding: '4px 9px', borderRadius: 999 }}>{t.duration}</span>
                )}
                <span style={{ position: 'absolute', right: 10, top: 10, display: 'flex', gap: 6 }}>
                    <button type="button" onClick={stop(onFav)} aria-label={fav ? 'お気に入りから削除' : 'お気に入りに追加'} aria-pressed={fav} style={roundBtn}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? MW.mint : 'none'} stroke={fav ? MW.mint : MW.navy} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d={ICON.wish} />
                        </svg>
                    </button>
                    {onRemove && (
                        <button type="button" onClick={stop(onRemove)} aria-label="ウィッシュリストから削除" style={{ ...roundBtn, fontSize: 15, color: MW.mute, fontFamily: 'inherit' }}>×</button>
                    )}
                </span>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.4 }}>{t.title}</span>
                {t.category && <span style={{ fontSize: 12, color: MW.mute, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.category}</span>}
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                    <span style={{ fontSize: 12, color: MW.mute }}>
                        {stat && stat.count > 0 && (
                            <><span style={{ color: MW.mintDeep }}>★</span> <strong style={{ color: MW.navy }}>{stat.avg.toFixed(1)}</strong> ({stat.count})</>
                        )}
                    </span>
                    {t.price > 0 && (
                        <span style={{ fontFamily: MW_FONT_EN, fontSize: 15, fontWeight: 600 }}>
                            {yen(t.price)}<span style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 500, color: MW.mute }}>〜</span>
                        </span>
                    )}
                </span>
            </span>
        </a>
    );
}

const productCard = (p: HomeProduct): TripCardData => ({
    key: p.id,
    productId: p.id,
    title: cleanTitle(p.name),
    image: p.mainImages[0],
    duration: p.duration,
    category: p.category,
    price: p.price,
});

const cardGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,240px),1fr))', gap: 16 };

export function WishlistSection({ items, stats, onRemove, onClearAll, go }: {
    items: HomeProduct[];
    stats: Record<string, ReviewStat>;
    onRemove: (p: HomeProduct) => void;
    onClearAll: () => void;
    go: Go;
}) {
    return (
        <div style={cardBox}>
            <PanelHead
                eyebrow="WISHLIST"
                title="ウィッシュリスト"
                count={items.length}
                sub="♡を押したツアーが保存されます。価格や日程をまとめて比較できます。"
                action={items.length > 0 ? <button type="button" onClick={onClearAll} style={ghostBtn} {...ghostHover}>すべて削除</button> : undefined}
            />
            {items.length > 0 ? (
                <div style={cardGrid}>
                    {items.map((p) => (
                        <TripCard key={p.id} t={productCard(p)} stat={stats[p.id]} fav onFav={() => onRemove(p)} onRemove={() => onRemove(p)} go={go} />
                    ))}
                </div>
            ) : (
                <EmptyBox text="ウィッシュリストはまだありません。ツアーの♡を押して保存しましょう。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
            )}
        </div>
    );
}

const WEEK = '日月火水木金土';
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function RecentSection({ items, now, productById, stats, isFav, onFav, loading, go }: {
    items: RecentItem[];
    now: number;
    productById: Map<string, HomeProduct>;
    stats: Record<string, ReviewStat>;
    isFav: (productId: string) => boolean;
    onFav: (item: TripCardData) => void;
    loading: boolean;
    go: Go;
}) {
    const today = new Date(now);
    const yesterday = new Date(now - 86_400_000);
    const label = (d: Date) =>
        dayKey(d) === dayKey(today) ? '今日' : dayKey(d) === dayKey(yesterday) ? '昨日' : `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;

    const groups: Array<{ label: string; cards: TripCardData[] }> = [];
    for (const it of items) {
        const d = parseDbTime(it.viewedAt);
        const g = Number.isNaN(d.getTime()) ? 'それ以前' : label(d);
        const p = productById.get(it.productId);
        const card: TripCardData = p
            ? productCard(p)
            : { key: it.productId, productId: it.productId, title: cleanTitle(it.title), image: it.image, category: it.category, price: it.price };
        const last = groups[groups.length - 1];
        if (last && last.label === g) last.cards.push(card);
        else groups.push({ label: g, cards: [card] });
    }

    return (
        <div style={{ ...cardBox, gap: 24 }}>
            <PanelHead eyebrow="RECENTLY VIEWED" title="最近見た商品" count={loading ? undefined : items.length} sub="最近閲覧したツアー（最大20件）が表示されます。" />
            {loading ? <Loading /> : groups.length > 0 ? (
                groups.map((g) => (
                    <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>{g.label}</span>
                            <span style={{ flex: 1, height: 1, background: HAIR }} />
                        </div>
                        <div style={cardGrid}>
                            {g.cards.map((c) => (
                                <TripCard key={c.key} t={c} stat={stats[c.productId]} fav={isFav(c.productId)} onFav={() => onFav(c)} go={go} />
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <EmptyBox text="最近見た商品はまだありません。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
            )}
        </div>
    );
}

/* ---------- マイレビュー ---------- */

export function ReviewsSection({ me, reviews, pending, productById, loading, go }: {
    me: MeUser;
    reviews: MyReview[];
    pending: MyReservation[];
    productById: Map<string, HomeProduct>;
    loading: boolean;
    go: Go;
}) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const remove = async (r: MyReview) => {
        if (!window.confirm('このレビューを削除しますか？')) return;
        try {
            await api.reviews.delete(r.id);
            queryClient.setQueryData<MyReview[]>(['myPage', 'reviews', me.id], (cur = []) => cur.filter((x) => x.id !== r.id));
        } catch (e) {
            console.error('Review delete failed:', e);
            showToast('error', 'レビューの削除に失敗しました。');
        }
    };

    return (
        <div style={cardBox}>
            <PanelHead eyebrow="MY REVIEWS" title="マイレビュー" sub="ご参加いただいたツアーの感想をお聞かせください。" />
            {loading ? <Loading /> : (
                <>
                    {pending.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <span style={{ fontSize: 14, fontWeight: 900 }}>書けるレビュー <span style={{ color: MW.mintDeep }}>{pending.length}</span></span>
                            {pending.map((r) => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 18, background: `linear-gradient(135deg,${MW.mintBg} 0%,#FFFFFF 80%)`, border: `1px solid ${MW.mintTint}`, flexWrap: 'wrap' }}>
                                    <Thumb src={productById.get(r.productId)?.mainImages[0]} size={64} />
                                    <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 15, fontWeight: 900 }}>{r.productName}</span>
                                        <span style={{ fontSize: 12, color: MW.mute }}>{dateRange(r.start, r.end)}</span>
                                    </span>
                                    <button type="button" onClick={() => go(`/reviews/write?reservationId=${encodeURIComponent(r.id)}`)} style={mintBtn} {...mintHover}>レビューを書く</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 900 }}>書いたレビュー <span style={{ color: MW.mintDeep }}>{reviews.length}</span></span>
                        {reviews.length === 0 && (
                            <EmptyBox text="まだレビューはありません。旅の思い出をシェアしてみませんか？" action={{ label: 'レビューを書く', onClick: () => go('/reviews/write') }} />
                        )}
                        {reviews.map((r) => (
                            <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                    <a
                                        href={`/reviews/${r.id}`}
                                        onClick={(e) => { e.preventDefault(); go(`/reviews/${r.id}`); }}
                                        style={{ fontSize: 15, fontWeight: 900, color: MW.navy, textDecoration: 'none' }}
                                        {...hover({ color: MW.mintDeep }, { color: MW.navy })}
                                    >
                                        {r.productName}
                                    </a>
                                    <button type="button" onClick={() => remove(r)} style={smallPill} {...ghostHover}>削除</button>
                                </div>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-label={`5点中${r.rating}点`}>
                                    <span style={{ fontSize: 15, letterSpacing: 2, color: MW.mint }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                                    <strong style={{ fontFamily: MW_FONT_EN, fontSize: 13, fontWeight: 600 }}>{r.rating.toFixed(1)}</strong>
                                </span>
                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: MW.ink3, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{r.content}</p>
                                {r.images.filter(isUsableImage).length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {r.images.filter(isUsableImage).slice(0, 4).map((src, i) => (
                                            <img key={i} src={src} alt={`レビュー写真 ${i + 1}`} loading="lazy" decoding="async" style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', background: MW.chip }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: MW.mute, paddingTop: 12, borderTop: `1px solid ${HAIR}` }}>
                                    <span>{r.createdAt ? `${r.createdAt.slice(0, 10).replace(/-/g, '/')} 投稿` : ''}</span>
                                    <span>役に立った <strong style={{ color: MW.mintDeep }}>{r.helpful}</strong>人</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------- お知らせ ---------- */

const NOTICE_TYPES: Record<string, { label: string; d: string }> = {
    reservation: { label: '予約', d: ICON.bookings },
    comment: { label: 'コメント', d: ICON.chat },
    event: { label: 'キャンペーン', d: ICON.megaphone },
    system: { label: 'お知らせ', d: ICON.notice },
};

export function NoticeSection({ go }: { go: Go }) {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotification();
    const [filter, setFilter] = useState('all');
    const types = Object.keys(NOTICE_TYPES).filter((t) => notifications.some((n) => (NOTICE_TYPES[n.type] ? n.type : 'system') === t));
    const typeOf = (n: Notification) => (NOTICE_TYPES[n.type] ? n.type : 'system');
    const items = notifications.filter((n) => filter === 'all' || (filter === 'unread' ? !n.is_read : typeOf(n) === filter));

    const open = async (n: Notification) => {
        if (!n.is_read) await markAsRead(n.id);
        if (n.link) go(n.link);
    };

    return (
        <div style={cardBox}>
            <PanelHead
                eyebrow="NOTIFICATIONS"
                title="お知らせ"
                sub="ご予約・お見積もりの更新やキャンペーン情報をお届けします。"
                action={unreadCount > 0 ? <button type="button" onClick={() => markAllAsRead()} style={ghostBtn} {...ghostHover}>すべて既読にする</button> : undefined}
            />
            {notifications.length > 0 && (
                <FilterPills<string>
                    items={[['all', 'すべて'], ['unread', `未読 ${unreadCount}`], ...types.map((t): [string, string] => [t, NOTICE_TYPES[t].label])]}
                    value={filter}
                    onChange={setFilter}
                />
            )}
            {loading ? <Loading /> : items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${HAIR}` }}>
                    {items.map((n) => {
                        const meta = NOTICE_TYPES[typeOf(n)];
                        const bg = n.is_read ? '#FFFFFF' : '#F7FCFA';
                        return (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => open(n)}
                                style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 8px', border: 0, borderBottom: `1px solid ${HAIR}`, background: bg, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', color: MW.navy }}
                                {...hover({ background: PAPER }, { background: bg })}
                            >
                                <span style={{ width: 40, height: 40, borderRadius: 12, background: MW.mintBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Ico d={meta.d} />
                                </span>
                                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: MW.mintDeep }}>{meta.label}</span>
                                        {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: MW.mint }} />}
                                    </span>
                                    <span style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 900, lineHeight: 1.5 }}>{n.title}</span>
                                    {n.message && <span style={{ fontSize: 13, color: MW.mute, lineHeight: 1.6 }}>{n.message}</span>}
                                </span>
                                <span style={{ fontSize: 12, color: MW.mute2, flexShrink: 0, whiteSpace: 'nowrap' }}>{formatRelativeTime(parseDbTime(n.created_at))}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <EmptyBox text={notifications.length ? '該当するお知らせはありません。' : '新しいお知らせはありません。'} />
            )}
        </div>
    );
}

/* ---------- サポート ---------- */

export function SupportCard({ go }: { go: Go }) {
    return (
        <div style={{ borderRadius: 20, padding: 28, background: `linear-gradient(135deg,${MW.mintBg} 0%,#FFFFFF 70%)`, border: `1px solid ${MW.mintTint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontFamily: MW_FONT_EN, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: MW.mintDeep }}>CUSTOMER SUPPORT</span>
                <span style={{ fontSize: 18, fontWeight: 900 }}>お困りのことはありませんか？</span>
                <span style={{ fontSize: 13, color: MW.mute }}>日本語スタッフが24時間以内にご返信。FAQも合わせてご確認ください。</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <a
                    href="/faq"
                    onClick={(e) => { e.preventDefault(); go('/faq'); }}
                    style={{ display: 'flex', alignItems: 'center', height: 48, padding: '0 22px', border: `1px solid ${MW.line}`, borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 700, color: MW.navy, textDecoration: 'none' }}
                    {...hover({ borderColor: MW.mint }, { borderColor: MW.line })}
                >
                    FAQを見る
                </a>
                <button type="button" onClick={() => window.openChannelTalk?.()} style={{ ...mintBtn, height: 48, padding: '0 22px', fontSize: 14, gap: 8 }} {...mintHover}>
                    <Ico d={ICON.chat} size={18} color={MW.navy} />
                    問い合わせ
                </button>
            </div>
        </div>
    );
}
