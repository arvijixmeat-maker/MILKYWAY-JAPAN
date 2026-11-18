import type { FuelPrices } from '../../src/lib/pricing';

/**
 * 연료 가격 (₮/L) — 슈흐라이(Шунхлай) 주유소 가격표 https://www.shunkhlai.mn/prices 에서 읽는다 (오너 지정 출처).
 * 주유소마다 한 줄씩 있는 표라서, 울란바타르(УБ) 주유소에서 가장 많이 쓰이는 값을 그 유종의 가격으로 본다.
 * 하루 두 번까지만 읽고 나머지는 보관한 값을 쓴다. 못 읽으면 전에 읽은 값을 「오래됨」 표시로 돌려준다.
 */
export const FUEL_SOURCE_URL = 'https://www.shunkhlai.mn/prices';
const TTL_MS = 12 * 60 * 60 * 1000;
// 표의 열 순서: № · ШТС · БАЙРШИЛ · А-80 · АИ-92 · Евро-5-92 · АИ-95 · АИ-98 · ДТ · Евро-ДТ · ДТ/хурд/
const COLS = ['a80', 'ai92', 'euro92', 'ai95', 'ai98', 'dt', 'eurodt'] as const;

/** 가격표 HTML → 유종별 가격 (울란바타르 주유소의 최빈값). 표를 못 찾으면 null */
export function parseShunkhlai(html: string): Omit<FuelPrices, 'fetchedAt' | 'source'> | null {
    const a = html.indexOf('id="shtsprices"');
    if (a < 0) return null;
    const end = html.indexOf('</table>', a);
    const table = html.slice(a, end > a ? end : a + 400_000);
    const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
        .map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()))
        .filter(r => r.length >= 10);
    if (!rows.length) return null;
    const ub = rows.filter(r => /^УБ/.test(r[2]));
    const use = ub.length >= 5 ? ub : rows;
    const out: Record<string, number> = {};
    COLS.forEach((name, k) => {
        const count = new Map<number, number>();
        for (const r of use) {
            const v = Number(r[3 + k]);
            if (v >= 1000 && v <= 20000) count.set(v, (count.get(v) || 0) + 1);
        }
        const best = [...count.entries()].sort((x, y) => y[1] - x[1])[0];
        out[name] = best ? best[0] : 0;
    });
    if (!out.ai92 && !out.dt && !out.eurodt) return null;
    return { ai92: out.ai92, euro92: out.euro92, ai95: out.ai95, ai98: out.ai98, dt: out.dt, eurodt: out.eurodt, stations: use.length };
}

export async function getFuelPrices(db: any, force = false): Promise<FuelPrices | null> {
    let saved: FuelPrices | null = null;
    try {
        const row: any = await db.prepare("SELECT value FROM pricing_settings WHERE key = 'fuel'").first();
        if (row?.value) saved = JSON.parse(row.value);
    } catch { /* 표가 없거나 값이 깨졌으면 새로 읽는다 */ }
    if (saved && !force && Date.now() - Date.parse(saved.fetchedAt) < TTL_MS) return saved;
    try {
        const res = await fetch(FUEL_SOURCE_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; price-check)' } });
        const parsed = res.ok ? parseShunkhlai(await res.text()) : null;
        if (!parsed) throw new Error('fuel table unavailable');
        const next: FuelPrices = { ...parsed, fetchedAt: new Date().toISOString(), source: 'shunkhlai.mn' };
        try {
            await db.prepare("INSERT INTO pricing_settings (key, value) VALUES ('fuel', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(next)).run();
        } catch { /* 보관 실패는 무시 */ }
        return next;
    } catch {
        return saved ? { ...saved, stale: true } : null;
    }
}
