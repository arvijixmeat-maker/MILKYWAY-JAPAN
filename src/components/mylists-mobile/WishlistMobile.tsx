import { MobileShell } from '../mobile/MobileShell';
import { BarButton, MEmpty, MLoading, SubPageBar } from '../mobile/mobileUi';
import { productCard, useGo, useTripCatalog } from './myListsData';
import { ScreenBody, TripCardM, TripGrid } from './myListsUi';

/** Mobile ウィッシュリスト (Claude Design: "M Wishlist"). Saved tours resolved against the published list, as on PC. */
export function WishlistMobile() {
    const go = useGo();
    const { stats, wishlist, wishItems, wishLoading } = useTripCatalog();

    const clearAll = async () => {
        if (!window.confirm('ウィッシュリストをすべて削除しますか？')) return;
        for (const p of wishItems) await wishlist.toggle(p);
    };

    return (
        <MobileShell>
            <SubPageBar
                title="ウィッシュリスト"
                count={wishLoading ? undefined : wishItems.length}
                onBack={() => go('/mypage')}
                right={!wishLoading && wishItems.length > 0 ? <BarButton onClick={clearAll}>すべて削除</BarButton> : undefined}
            />
            <ScreenBody eyebrow="WISHLIST" lead="♡を押したツアーが保存されます。価格や日程をまとめて比較できます。" label="ウィッシュリスト">
                {wishLoading ? <MLoading /> : wishItems.length > 0 ? (
                    <TripGrid>
                        {wishItems.map((p) => (
                            <TripCardM
                                key={p.id}
                                t={productCard(p)}
                                stat={stats[p.id]}
                                fav
                                onFav={() => wishlist.toggle(p)}
                                onRemove={() => wishlist.toggle(p)}
                                removeLabel="ウィッシュリストから削除"
                                go={go}
                            />
                        ))}
                    </TripGrid>
                ) : (
                    <MEmpty text="ウィッシュリストはまだありません。ツアーの♡を押して保存しましょう。" action={{ label: 'ツアーを探す', onClick: () => go('/products') }} />
                )}
            </ScreenBody>
        </MobileShell>
    );
}
