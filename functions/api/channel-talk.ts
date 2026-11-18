import { Hono } from 'hono';
import { requireAdmin } from '../lib/adminAuth';
import { summarizeProducts } from '../lib/aiQuoteDraft';
import { channelApi, draftReply, getPrivate, handleChannelMessage, loadChannelKeys, safeEqual, setPrivate } from '../lib/channelTalk';

/**
 * 채널톡 연동 — 고객 메시지에 일본어 답장 초안을 내부대화로 남긴다.
 *  - POST /api/channel-talk/webhook?token=…  채널톡이 부른다 (공개, 토큰으로 확인)
 *  - GET  /api/channel-talk/status           연결 상태 (관리자)
 *  - POST /api/channel-talk/connect          키 저장 + 웹훅 자동 등록 (관리자)
 *  - POST /api/channel-talk/disconnect       저장한 키 삭제 + 웹훅 삭제 (관리자)
 */
const app = new Hono<{ Bindings: Env }>();
const WEBHOOK_NAME = 'mongolryokou-reply-draft';
const webhookUrl = (c: any) => `${new URL(c.req.url).origin}/api/channel-talk/webhook`;

app.post('/webhook', async (c) => {
    const keys = await loadChannelKeys(c.env);
    // 토큰이 없거나 다르면 받지 않는다 (아무나 이 주소로 AI 를 돌리지 못하게)
    if (!keys.webhookToken || !safeEqual(String(c.req.query('token') || ''), keys.webhookToken)) return c.json({ error: 'Unauthorized' }, 401);
    const body: any = await c.req.json().catch(() => null);
    if (body?.type !== 'Message' || !body?.entity) return c.json({ ok: true, skipped: 'not-message' });
    // 채널톡에는 바로 답하고, 초안 만들기는 뒤에서 한다
    const work = handleChannelMessage(c.env, body.entity, { summarize: summarizeProducts })
        .then(r => console.log('[channel-talk]', r))
        .catch(e => console.error('[channel-talk] failed', e?.message || e));
    try { c.executionCtx.waitUntil(work); } catch { await work; }
    return c.json({ ok: true });
});

// POST /api/channel-talk/draft — 답장 도우미 (관리자): 붙여 넣은 대화로 일본어 답장 초안을 만든다. 채널톡 유료 플랜(API) 없이 쓴다.
// body: { conversation, koDraft?: 한국어로 직접 쓴 답 → 일본어로, previousJa? + instruction?: 앞 초안을 한국어 지시로 고치기 }
app.post('/draft', requireAdmin, async (c) => {
    const apiKey = String(c.env.ANTHROPIC_API_KEY || '').replace(/\s+/g, '');
    if (!apiKey.startsWith('sk-ant-')) return c.json({ error: 'AI 키(ANTHROPIC_API_KEY)가 설정되지 않았습니다.' }, 503);
    const body: any = await c.req.json().catch(() => ({}));
    const conversation = String(body.conversation || '').trim().slice(0, 12000);
    const koDraft = String(body.koDraft || '').trim().slice(0, 4000);
    const instruction = String(body.instruction || '').trim().slice(0, 1500);
    const previousJa = String(body.previousJa || '').trim().slice(0, 6000);
    if (!conversation && !koDraft) return c.json({ error: '고객 메시지를 붙여 넣거나, 한국어로 답을 적어 주세요.' }, 400);
    try {
        let productsText = '';
        try {
            const rows = ((await c.env.DB.prepare("SELECT id, name, duration, price, itinerary_blocks FROM products WHERE (status IS NULL OR status = 'active') ORDER BY sort_order ASC, created_at DESC LIMIT 20").all()).results || []) as any[];
            productsText = summarizeProducts(rows).slice(0, 12000);
        } catch { productsText = ''; }
        const draft = await draftReply(apiKey, conversation || '（会話の貼り付けなし）', productsText, koDraft || undefined, !koDraft && instruction && previousJa ? { previousJa, instructionKo: instruction } : undefined);
        return c.json(draft);
    } catch (e: any) {
        const status = Number(e?.status) || 0;
        const msg = status === 401 ? 'AI 키가 올바르지 않습니다.' : status === 429 ? 'AI 요청이 잠시 많습니다. 1분 뒤 다시 시도해 주세요.'
            : status === 402 || e?.type === 'billing_error' ? 'AI 크레딧(결제)에 문제가 있습니다.' : `초안 만들기 실패: ${String(e?.message || e).slice(0, 200)}`;
        return c.json({ error: msg }, 500);
    }
});

app.get('/status', requireAdmin, async (c) => {
    const keys = await loadChannelKeys(c.env);
    return c.json({
        hasKeys: !!(keys.accessKey && keys.accessSecret),
        hasWebhook: !!keys.webhookToken,
        hasAiKey: String(c.env.ANTHROPIC_API_KEY || '').replace(/\s+/g, '').startsWith('sk-ant-'),
        webhookUrl: webhookUrl(c),
        connectedAt: await getPrivate(c.env.DB, 'channel_connected_at'),
        // 키 값은 내려보내지 않는다 — 어느 키인지 알아볼 수 있게 앞 4글자만
        keyHint: keys.accessKey ? `${keys.accessKey.slice(0, 4)}…` : '',
    });
});

app.post('/connect', requireAdmin, async (c) => {
    const body: any = await c.req.json().catch(() => ({}));
    const accessKey = String(body.accessKey || '').replace(/\s+/g, '');
    const accessSecret = String(body.accessSecret || '').replace(/\s+/g, '');
    if (!accessKey || !accessSecret) return c.json({ error: 'Access Key 와 Access Secret 을 모두 넣어 주세요.' }, 400);
    const keys = { accessKey, accessSecret };
    try {
        // 키가 맞는지 확인하면서, 우리 웹훅이 이미 있으면 그것을 쓴다
        const url = webhookUrl(c);
        const list = await channelApi(keys, 'GET', '/open/webhooks');
        let hook = (Array.isArray(list?.webhooks) ? list.webhooks : []).find((w: any) => w?.url === url || w?.name === WEBHOOK_NAME);
        if (hook && (hook.url !== url || !(hook.scopes || []).includes('messageCreatedUserChat'))) {
            await channelApi(keys, 'DELETE', `/open/webhooks/${encodeURIComponent(hook.id)}`);
            hook = null;
        }
        if (!hook) hook = (await channelApi(keys, 'POST', '/open/webhooks', { name: WEBHOOK_NAME, url, scopes: ['messageCreatedUserChat'], apiVersion: 'v5' }))?.webhook;
        if (!hook?.token) return c.json({ error: '웹훅을 만들었지만 확인용 토큰을 받지 못했습니다. 채널톡 설정 → 웹훅에서 확인해 주세요.' }, 502);
        await setPrivate(c.env.DB, 'channel_access_key', accessKey);
        await setPrivate(c.env.DB, 'channel_access_secret', accessSecret);
        await setPrivate(c.env.DB, 'channel_webhook_token', String(hook.token));
        await setPrivate(c.env.DB, 'channel_connected_at', new Date().toISOString());
        return c.json({ success: true, webhookUrl: url });
    } catch (e: any) {
        const status = Number(e?.status) || 0;
        const msg = status === 401 || status === 403 ? '채널톡 키가 올바르지 않습니다. Access Key 와 Access Secret 을 다시 확인해 주세요.' : `채널톡 연결 실패: ${String(e?.message || e).slice(0, 200)}`;
        return c.json({ error: msg }, 400);
    }
});

app.post('/disconnect', requireAdmin, async (c) => {
    const keys = await loadChannelKeys(c.env);
    try {
        if (keys.accessKey && keys.accessSecret) {
            const list = await channelApi(keys, 'GET', '/open/webhooks');
            for (const w of (Array.isArray(list?.webhooks) ? list.webhooks : [])) {
                if (w?.name === WEBHOOK_NAME) await channelApi(keys, 'DELETE', `/open/webhooks/${encodeURIComponent(w.id)}`);
            }
        }
    } catch { /* 웹훅 삭제 실패는 넘어간다 — 키를 지우면 토큰이 맞지 않아 어차피 받지 않는다 */ }
    for (const k of ['channel_access_key', 'channel_access_secret', 'channel_webhook_token', 'channel_connected_at']) {
        try { await c.env.DB.prepare('DELETE FROM private_settings WHERE key = ?').bind(k).run(); } catch { /* 표가 없으면 지울 것도 없다 */ }
    }
    return c.json({ success: true });
});

export default app;
