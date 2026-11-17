import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { TouristSpot } from '../../types/touristSpot';
import type { Hotel } from '../../types/hotel';
import type { TripDoc, DesignSpotLite } from './tripDocModel';
import { toImages } from './tripDocModel';
import { loadDesignSpots } from '../product/designTemplates/designSpots';
import nightImg from '../../assets/about/about-night.webp';
import teamPhoto from '../../assets/team/team-photo.webp';
import team2Img from '../../assets/about/about-team-2.webp';

/**
 * 견적서·확정일정표 사진은 따로 등록하지 않고 기존 자료를 그대로 재사용한다.
 *
 * - 일자별 여행지 · 볼거리      ← 문서 편집기에서 관광지 마스터로 고른 일정 사진
 * - 숙소 섹션(고급·일반 게르)   ← 호텔 마스터의 게르 숙소 (이름에 高級/プレミアム · 一般/スタンダード)
 * - 차량 섹션                  ← 관광지 마스터 「차량(vehicle)」 분류 (이름 = 차종, 사진 = 차량 사진)
 * - 식사 · 특별 요리            ← 관광지 마스터 「음식(food)」 분류
 * - 표지 · 팀 사진              ← 회사소개 페이지 사진(src/assets/about)
 * - 사진이 없는 곳(관광지명 매칭) ← 관광지 마스터 → 여행지 사진 순으로 이름 매칭
 */

export interface QuoteSpecial { id: string; name: string; sub: string; desc: string; image: string }
export interface LocalFood { img: string; t: string; s: string; en: string }
export interface Vehicle { name: string; img: string }
export interface TripImages {
    slots: Record<string, string>;
    /** 숙소 섹션 — 고급 게르 / 일반 게르 사진 (각 최대 4장) */
    stayPremium: string[];
    stayStandard: string[];
    /** 차량 섹션 (관광지 마스터 「차량」) */
    vehicles: Vehicle[];
    /** 식사 섹션 맨 위 사진 띠 */
    foodStrip: string[];
    /** 이번 문서에 포함된 特別料理 */
    specials: QuoteSpecial[];
    /** おすすめ現地料理 카드 */
    localFoods: LocalFood[];
}
export interface TripSources { spots: TouristSpot[]; hotels: Hotel[]; designSpots: DesignSpotLite[] }

const EMPTY_SOURCES: TripSources = { spots: [], hotels: [], designSpots: [] };

const unwrap = (v: unknown): any[] => (Array.isArray(v) ? v : Array.isArray((v as any)?.data) ? (v as any).data : []);

/** 관광지 마스터 · 호텔 마스터 · 여행지 사진을 한 번만 읽어 캐시 (모두 공개 GET) */
let cache: Promise<TripSources> | null = null;
export function loadTripSources(force = false): Promise<TripSources> {
    if (!cache || force) {
        cache = Promise.all([
            api.touristSpots.list().then(unwrap).catch(() => []),
            api.hotels.list().then(unwrap).catch(() => []),
            loadDesignSpots().catch(() => []),
        ]).then(([spots, hotels, designSpots]) => ({
            spots: (spots as TouristSpot[]).filter(s => s.is_active !== false).map(s => ({ ...s, images: toImages(s.images) })),
            hotels: (hotels as Hotel[]).filter(h => h.is_active !== false).map(h => ({ ...h, images: toImages(h.images) })),
            designSpots: (designSpots as DesignSpotLite[]).filter(d => d.image),
        }));
    }
    return cache;
}

export function useTripSources(): { sources: TripSources; loaded: boolean } {
    const [state, setState] = useState<{ sources: TripSources; loaded: boolean }>({ sources: EMPTY_SOURCES, loaded: false });
    useEffect(() => {
        let alive = true;
        loadTripSources().then(sources => { if (alive) setState({ sources, loaded: true }); });
        return () => { alive = false; };
    }, []);
    return state;
}

/** 관광지 이름 정리 — 「ホルホグ（Khorkhog）🍖」 → 「ホルホグ」 / en 「Khorkhog」 */
export const cleanSpotName = (name = '') => name.replace(/[（(].*?[）)]/g, '').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').replace(/️/g, '').trim();
const spotEn = (name = '') => (name.match(/[（(]([A-Za-z][^）)]*)[）)]/)?.[1] || '').trim();
const firstPara = (t = '') => String(t).split(/\n\s*\n/)[0].trim();

/** 관광지 마스터 「음식」 분류 = 특별 요리 후보 */
export const foodSpots = (spots: TouristSpot[]) => spots.filter(s => s.region === 'food' && (s.images?.length || 0) > 0);

export const spotToSpecial = (s: TouristSpot): QuoteSpecial => ({
    id: s.id,
    name: cleanSpotName(s.name_kr),
    sub: s.name_local || '',
    desc: firstPara(s.description),
    image: s.images?.[0] || '',
});

/** 사진 없는 일정 항목·경로를 채울 이름 매칭 후보 (관광지 마스터 → 여행지 사진) */
export const fallbackSpots = (src: TripSources): DesignSpotLite[] => [
    ...src.spots.filter(s => s.region !== 'vehicle' && s.images?.length).map(s => ({ name: cleanSpotName(s.name_kr), image: s.images![0] })),
    ...src.designSpots,
];

const GER = /ゲル|ger|게르|キャンプ|camp|캠프/i;
const PREMIUM = /モダン|高級|プレミアム|新型|チムチョク|luxury|premium|modern|고급/i;
const STANDARD = /一般|スタンダード|standard|일반/i;

export function resolveTripImages(doc: TripDoc | null, src: TripSources): TripImages {
    const uniq = (list: string[]) => Array.from(new Set(list.filter(Boolean)));
    const docStayImgs = doc ? doc.days.flatMap(d => d.stayImages) : [];
    const gerHotels = src.hotels.filter(h => GER.test(`${h.name_kr} ${h.name_local || ''}`) && h.images?.length);
    const premium = gerHotels.find(h => PREMIUM.test(`${h.name_kr} ${h.name_local || ''}`));
    const standard = gerHotels.find(h => STANDARD.test(`${h.name_kr} ${h.name_local || ''}`));
    const stayPool = uniq([...docStayImgs, ...(premium?.images || []), ...gerHotels.flatMap(h => h.images || [])]);
    const nomad = src.spots.find(s => /遊牧民|nomad|유목민/i.test(s.name_kr) && s.images?.length);
    const star = src.spots.find(s => /星空|天の川|milky|별/i.test(s.name_kr) && s.images?.length);
    const foods = foodSpots(src.spots);

    // 特別料理 — 문서에서 고른 관광지(음식). 고르지 않았으면 음식 분류 앞 4개, 'none' 이면 숨김
    // (고른 관광지가 모두 삭제됐거나 옛 형식 값이면 자동으로 돌아간다)
    const picked = doc?.q.specials || [];
    const chosen = picked.map(id => foods.find(f => f.id === id)).filter((f): f is TouristSpot => !!f);
    const specials = picked.includes('none') ? [] : (chosen.length ? chosen : foods.slice(0, 4)).map(spotToSpecial);

    const foodImg = (i: number) => foods[i % Math.max(1, foods.length)]?.images?.[0] || '';
    const slots: Record<string, string> = {
        'quote-hero': nightImg,
        'quote-team': teamPhoto,
        'quote-meet-3': team2Img,
        'quote-stay-lux': premium?.images?.[0] || stayPool[0] || '',
        'quote-stay-ger': standard?.images?.[0] || stayPool[1] || '',
        'quote-stay-nomad': nomad?.images?.[0] || '',
        'quote-stay-tent': nomad?.images?.[1] || nomad?.images?.[0] || '',
        'stay-cmp-theirs': nomad?.images?.[0] || '',
        'stay-cmp-ours': premium?.images?.[1] || premium?.images?.[0] || stayPool[0] || '',
        'stay-hero-ger': premium?.images?.[0] || stayPool[0] || '',
        'stay-hero-2': premium?.images?.[1] || stayPool[1] || '',
        'stay-hero-3': star?.images?.[0] || stayPool[2] || '',
        'quote-meal-1': stayPool.find((_, i) => i >= 3) || foodImg(0),
        'quote-meal-2': foodImg(1),
        'quote-meal-3': specials[0]?.image || foodImg(2),
    };
    ['stay-tile-1', 'stay-tile-2', 'stay-tile-3', 'stay-tile-8', 'stay-tile-4', 'stay-tile-5', 'stay-tile-6', 'stay-tile-7']
        .forEach((k, i) => { slots[k] = stayPool[i] || stayPool[i % Math.max(1, stayPool.length)] || ''; });
    for (const k of Object.keys(slots)) if (!slots[k]) delete slots[k];

    const localFoods: LocalFood[] = foods.slice(0, 6).map(f => ({ img: f.images?.[0] || '', t: cleanSpotName(f.name_kr), s: f.name_local || '', en: spotEn(f.name_kr).toUpperCase() }));

    // 고급 게르 = 이름에 高級/プレミアム 등이 붙은 게르 숙소, 일반 게르 = 一般/スタンダード
    const premiumImgs = uniq(gerHotels.filter(h => PREMIUM.test(`${h.name_kr} ${h.name_local || ''}`)).flatMap(h => h.images || []));
    const standardImgs = uniq(gerHotels.filter(h => STANDARD.test(`${h.name_kr} ${h.name_local || ''}`)).flatMap(h => h.images || []));
    const stayPremium = (premiumImgs.length ? premiumImgs : stayPool).slice(0, 4);
    const stayStandard = standardImgs.slice(0, 4);
    const vehicles: Vehicle[] = src.spots
        .filter(s => s.region === 'vehicle' && s.images?.length)
        .map(s => ({ name: cleanSpotName(s.name_kr), img: s.images![0] }));
    // 음식 사진 띠 — 음식 분류 사진을 고루 섞어 최대 6장
    const foodStrip = uniq([...foods.map(f => f.images?.[0] || ''), ...foods.flatMap(f => (f.images || []).slice(1))]).slice(0, 6);
    return { slots, specials, localFoods, stayPremium, stayStandard, vehicles, foodStrip };
}
