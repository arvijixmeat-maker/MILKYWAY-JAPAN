import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { ACCOMMODATIONS, WEEK, type QuoteFormValues } from '../estimate-desktop/quoteForm';

/**
 * Mobile quote form (Claude Design: "Milkyway Japan Mobile" — M Quote Form).
 * Options, validation and the submit payload come from estimate-desktop/quoteForm.ts;
 * this file only holds the form state and the mobile-specific formatting.
 */

export type CalKind = 'start' | 'end';
export type StepState = 'done' | 'current' | 'todo';
export type QuoteListKey = 'destinations' | 'themes' | 'accommodations';

/** 2026-10-03 → 10月3日（土）: the short form that fits the half-width date fields. */
export const jpDateShort = (v: string) => {
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return `${m}月${d}日（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
};

/** The first unfinished step is the "current" one on the rail. */
export const stepStates = (steps: boolean[]): StepState[] => {
    const current = steps.indexOf(false);
    return steps.map((done, i) => (done ? 'done' : i === current ? 'current' : 'todo'));
};

export interface QuoteSummaryRow {
    k: string;
    v: string;
    accent?: boolean;
}

/** Summary rows for the "request sent" screen, read back from the submitted payload. */
export const quoteSummaryRows = (estimate: Record<string, unknown>): QuoteSummaryRow[] => {
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const period = str(estimate.period).split(' ~ ').map((p) => (/^\d{4}-\d{2}-\d{2}$/.test(p) ? jpDateShort(p) : p));
    return [
        { k: '行き先', v: str(estimate.destination).split(', ').filter(Boolean).join('・') || '未選択' },
        { k: '旅行日程', v: period.length === 2 ? period.join(' 〜 ') : '未選択' },
        { k: '旅行人数', v: str(estimate.headcount).replace(', ', ' / ') || '未選択' },
        { k: '予想回答時間', v: '平均3時間以内', accent: true },
    ];
};

export function useQuoteForm() {
    // Trip-type cards on the tour list link here with ?stay=4つ星ホテル,デラックスゲル
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState<QuoteFormValues>(() => ({
        destinations: [],
        startDate: '',
        endDate: '',
        adultCount: 2,
        childCount: 0,
        themes: [],
        accommodations: (searchParams.get('stay') || '').split(',').filter((v) => ACCOMMODATIONS.includes(v)),
        vehicle: '',
        priceRange: 50,
        additionalRequest: '',
        name: '',
        phone: '',
        email: '',
    }));

    // Prefill from logged-in user (never over something already typed)
    useEffect(() => {
        api.auth.me().then((me: { name?: string; phone?: string; email?: string } | null) => {
            if (me) setForm((f) => ({ ...f, name: f.name || me.name || '', phone: f.phone || me.phone || '', email: f.email || me.email || '' }));
        }).catch(() => {});
    }, []);

    const set = (patch: Partial<QuoteFormValues>) => setForm((f) => ({ ...f, ...patch }));
    const toggle = (key: QuoteListKey, v: string) =>
        setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

    return { form, set, toggle };
}
