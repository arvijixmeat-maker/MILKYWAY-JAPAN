import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRelativeTime } from '../../utils/formatDate';
import { useToast } from '../ui/Toast';
import { MW, MW_FONT_EN } from '../desktop-primitives/mwTokens';
import { parseDbTime, useMe, useMyPageData, type MyMatePost } from '../mypage-desktop/useMyPageData';
import { MobileShell } from '../mobile/MobileShell';
import { M_HAIR } from '../mobile/mobileTheme';
import { MEmpty, MLoading, MPills, SubPageBar } from '../mobile/mobileUi';
import { dateRange, useGo } from './myListsData';
import { CardPill, ScreenBody } from './myListsUi';

type MateFilter = 'all' | 'open' | 'closed';

const FILTERS: Array<[MateFilter, string]> = [['all', 'すべて'], ['open', '募集中'], ['closed', '募集終了']];

/** Mobile 同行者投稿 (Claude Design: "M My Mate Posts"). Same posts, filters and owner actions as the PC tab. */
export function MyMatesMobile() {
    const go = useGo();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { data: me } = useMe();
    const { mates } = useMyPageData(me);
    const [filter, setFilter] = useState<MateFilter>('all');

    const posts = mates.data ?? [];
    const loading = mates.isPending;
    const key = ['myPage', 'mates', me?.id];
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
        <MobileShell>
            <SubPageBar
                title="同行者投稿"
                count={loading ? undefined : posts.length}
                onBack={() => go('/mypage')}
                right={(
                    <button type="button" onClick={write} style={{ height: 34, padding: '0 12px', border: 0, borderRadius: 999, background: MW.mint, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: MW.navy, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ＋ 新規投稿
                    </button>
                )}
            />
            <ScreenBody eyebrow="TRAVEL MATES" lead="一緒に旅する仲間を募集して、車両・ガイド費用を分担できます。" label="同行者投稿">
                <MPills<MateFilter> items={FILTERS} value={filter} onChange={setFilter} style={{ margin: '0 -16px', padding: '0 16px' }} />
                {loading ? <MLoading /> : items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {items.map((p) => {
                            const closed = p.status === 'closed';
                            const pct = p.capacity > 0 ? Math.min(100, Math.round((p.joined / p.capacity) * 100)) : 0;
                            return (
                                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, border: `1px solid ${MW.line}`, borderRadius: 18, background: '#fff', color: MW.navy }}>
                                    <a
                                        href={`/travel-mates/${p.id}`}
                                        onClick={(e) => { e.preventDefault(); go(`/travel-mates/${p.id}`); }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: 10, color: MW.navy, textDecoration: 'none', minWidth: 0 }}
                                    >
                                        <span style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
                                            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: closed ? MW.chip : MW.mintTint, color: closed ? MW.mute : MW.mintDeep, whiteSpace: 'nowrap' }}>
                                                {closed ? '募集終了' : '募集中'}
                                            </span>
                                            {p.region && <span style={{ fontSize: 12, color: MW.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.region}</span>}
                                        </span>
                                        <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.45, color: closed ? MW.mute : MW.navy }}>{p.title}</span>
                                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 11, color: MW.mute }}>
                                            {(p.start || p.end) && <span>{dateRange(p.start, p.end)}{p.duration ? `（${p.duration}）` : ''}</span>}
                                            <span>コメント {p.comments}</span>
                                            <span>閲覧 {p.views}</span>
                                            {p.createdAt && <span>{formatRelativeTime(parseDbTime(p.createdAt))}</span>}
                                        </span>
                                    </a>
                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, borderTop: `1px solid ${M_HAIR}` }}>
                                        {p.capacity > 0 && (
                                            <>
                                                <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MW.mute }}>
                                                    <span>参加者</span>
                                                    <strong style={{ fontFamily: MW_FONT_EN, fontWeight: 600, color: MW.navy }}>{p.joined} / {p.capacity}名</strong>
                                                </span>
                                                <span style={{ height: 6, borderRadius: 999, background: M_HAIR, overflow: 'hidden' }}>
                                                    <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#27AB8F,#3FC2A4)', borderRadius: 999 }} />
                                                </span>
                                            </>
                                        )}
                                        <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: p.capacity > 0 ? 4 : 0 }}>
                                            <CardPill onClick={() => toggleStatus(p)}>{closed ? '募集を再開' : '募集を締め切る'}</CardPill>
                                            <CardPill onClick={() => remove(p)}>削除</CardPill>
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <MEmpty text={posts.length ? '該当する投稿はありません。' : '作成した投稿はまだありません。'} action={{ label: '＋ 新規投稿', onClick: write }} />
                )}
            </ScreenBody>
        </MobileShell>
    );
}
