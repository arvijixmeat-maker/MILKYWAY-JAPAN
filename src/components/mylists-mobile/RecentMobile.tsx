import { useMemo, useState } from 'react';
import { MW } from '../desktop-primitives/mwTokens';
import type { TripCardData } from '../mypage-desktop/MyPageSections';
import { useMe, useMyPageData } from '../mypage-desktop/useMyPageData';
import { MobileShell } from '../mobile/MobileShell';
import { MEmpty, MLoading, SubPageBar } from '../mobile/mobileUi';
import { cardAsWishProduct, groupRecentByDay, useGo, useTripCatalog } from './myListsData';
import { ScreenBody, TripCardM, TripGrid } from './myListsUi';

/**
 * Mobile 最近見た商品 (Claude Design: "M Recently Viewed"). Same list as the PC tab: the last
 * 20 viewed tours grouped by day. The history API has no delete, so the design's × and
 * すべて削除 controls are not shown.
 */
export function RecentMobile() {
    const go = useGo();
    const { data: me } = useMe();
    const { recent } = useMyPageData(me);
    const { productById, stats, wishlist } = useTripCatalog();
    // Captured once so render stays pure.
    const [now] = useState(() => Date.now());

    const groups = useMemo(() => groupRecentByDay(recent.data ?? [], now, productById), [recent.data, now, productById]);
    const loading = recent.isPending;
    const toggleFav = (t: TripCardData) => wishlist.toggle(productById.get(t.productId) ?? cardAsWishProduct(t));

    return (
        <MobileShell>
            <SubPageBar title="最近見た商品" count={loading ? undefined : recent.data?.length ?? 0} onBack={() => go('/mypage')} />
            <ScreenBody eyebrow="RECENTLY VIEWED" lead="最近閲覧したツアー（最大20件）が表示されます。" label="最近見た商品">
                {loading ? <MLoading /> : groups.length > 0 ? (
                    groups.map((g) => (
                        <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>{g.label}</span>
                                <span style={{ flex: 1, height: 1, background: MW.line }} />
                            </div>
                            <TripGrid>
                                {g.cards.map((c) => (
                                    <TripCardM key={c.key} t={c} stat={stats[c.productId]} fav={wishlist.has(c.productId)} onFav={() => toggleFav(c)} go={go} />
                                ))}
                            </TripGrid>
                        </div>
                    ))
                ) : (
                    <MEmpty text="最近見た商品はまだありません。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
                )}
            </ScreenBody>
        </MobileShell>
    );
}
