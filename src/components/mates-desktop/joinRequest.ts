import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MateJoinRequests } from '../../lib/api';

/**
 * 参加リクエスト on a travel-mate post, shared by the PC and mobile detail screens.
 * A request only notifies the host: it never changes the post's member count or status.
 */

export const JOIN_CANCEL_CONFIRM = '参加リクエストを取り消しますか？';

/** The line under the request button: what a request does, for each state of the visitor. */
export const joinNote = (s: { host: boolean; closed: boolean; mine: boolean }) =>
    s.host
        ? 'あなたが投稿した募集です。参加リクエストは参加人数には自動で反映されません。コメントでご相談のうえ、メンバーが決まりましたらマイページから募集を締め切ってください。'
        : s.closed
            ? 'この募集は参加リクエストの受付を終了しました。ご質問はページ下部のコメントからホストに伝えられます。'
            : s.mine
                ? 'リクエストはホストに通知されました。参加の確定はホストとのやり取りで決まります。'
                : 'リクエストはホストに通知されます。参加の確定はホストとのやり取りで決まります。ご質問はページ下部のコメントからどうぞ。';

export interface JoinRequester {
    id: string;
    name: string;
    at?: string;
}

const NONE: MateJoinRequests = { count: 0, mine: false };
/** Server messages meant for the visitor are Japanese; anything else gets a generic line. */
const HAS_JA = /[぀-ヿ一-鿿]/;

const normalize = (raw: unknown): MateJoinRequests => {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<MateJoinRequests>;
    return {
        count: Math.max(0, Number(r.count) || 0),
        mine: !!r.mine,
        requesters: Array.isArray(r.requesters) ? r.requesters : undefined,
    };
};

/**
 * @param userId signed-in user (null when logged out) — part of the cache key so `mine` follows the session.
 * @param ready  false while the session is still being resolved.
 */
export function useJoinRequest(postId: string | undefined, userId: string | null, ready = true) {
    const queryClient = useQueryClient();
    const key = ['travelMate', postId, 'requests', userId];
    const { data = NONE } = useQuery<MateJoinRequests>({
        queryKey: key,
        enabled: !!postId && ready,
        staleTime: 0,
        queryFn: () => api.travelMates.requests(postId as string).then(normalize).catch(() => NONE),
    });
    const [busy, setBusy] = useState(false);

    // Optimistic: the button flips at once and is rolled back when the server refuses.
    const change = async (want: boolean) => {
        if (!postId || !userId || busy) return;
        const prev = queryClient.getQueryData<MateJoinRequests>(key) ?? NONE;
        if (prev.mine === want) return;
        setBusy(true);
        await queryClient.cancelQueries({ queryKey: key });
        queryClient.setQueryData<MateJoinRequests>(key, { ...prev, mine: want, count: Math.max(0, prev.count + (want ? 1 : -1)) });
        try {
            const res = want ? await api.travelMates.requestJoin(postId) : await api.travelMates.cancelJoin(postId);
            queryClient.setQueryData<MateJoinRequests>(key, (cur = NONE) => ({ ...cur, mine: want, count: typeof res?.count === 'number' ? res.count : cur.count }));
            // An admin sees the requester list too; reload it after their own change.
            if (prev.requesters) queryClient.invalidateQueries({ queryKey: key });
        } catch (e) {
            queryClient.setQueryData<MateJoinRequests>(key, prev);
            // The post may have been closed meanwhile (mobile keeps it in this query).
            queryClient.invalidateQueries({ queryKey: ['travelMate', postId], exact: true });
            const message = e instanceof Error ? e.message : '';
            alert(HAS_JA.test(message)
                ? message
                : want
                    ? '参加リクエストを送信できませんでした。時間をおいて再度お試しください。'
                    : '参加リクエストを取り消せませんでした。時間をおいて再度お試しください。');
        } finally {
            setBusy(false);
        }
    };

    const requesters: JoinRequester[] | undefined = data.requesters?.map((r) => ({
        id: r.user_id,
        name: (r.user_name || '').trim() || '匿名',
        at: r.created_at,
    }));

    return {
        count: data.count,
        mine: data.mine,
        /** Only defined for the post's host or an admin. */
        requesters,
        busy,
        ask: () => change(true),
        withdraw: () => change(false),
    };
}

export type JoinRequestState = ReturnType<typeof useJoinRequest>;
