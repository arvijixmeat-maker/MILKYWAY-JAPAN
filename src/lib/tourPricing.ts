import type { TourPricingOption } from '../types/product';

export interface TourPriceBreakdown {
    total: number;
    deposit: number;
    local: number;
}

export interface PricingValidationIssue {
    level: 'error' | 'warning';
    index: number;
    message: string;
}

/**
 * PayPal로 먼저 결제하는 예약금은 인원별 단가가 아니라 예약 1건당 고정 금액이다.
 * 상품별 총액이 이보다 작을 때만 총액을 상한으로 사용한다.
 */
export const RESERVATION_DEPOSIT_JPY = 20_000;

export const getReservationDeposit = (total: number) =>
    Math.min(Math.max(0, Math.round(Number(total) || 0)), RESERVATION_DEPOSIT_JPY);

const money = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

/**
 * 인원별 가격은 총액과 예약금을 기준값으로 사용한다.
 * 현지 결제액은 두 값을 다시 입력받지 않고 항상 차액으로 계산한다.
 */
export const normalizePricingOption = (option: TourPricingOption): TourPricingOption => {
    const pricePerPerson = money(option.pricePerPerson);

    return {
        people: Math.max(1, Math.round(Number(option.people) || 1)),
        pricePerPerson,
        // 기존 상품 JSON과의 호환을 위해 필드는 유지하되 실제 예약금은 예약 단위로 계산한다.
        depositPerPerson: 0,
        localPaymentPerPerson: pricePerPerson,
    };
};

export const normalizePricingOptions = (options: TourPricingOption[] = []) =>
    options.map(normalizePricingOption).sort((a, b) => a.people - b.people);

export const getPricingValidationIssues = (options: TourPricingOption[] = []): PricingValidationIssue[] => {
    const issues: PricingValidationIssue[] = [];
    const peopleSeen = new Set<number>();

    options.forEach((option, index) => {
        const people = Number(option.people);
        const price = Number(option.pricePerPerson);
        const deposit = Number(option.depositPerPerson);
        const local = Number(option.localPaymentPerPerson);

        if (!Number.isInteger(people) || people < 1) {
            issues.push({ level: 'error', index, message: '인원은 1명 이상의 정수로 입력해 주세요.' });
        } else if (peopleSeen.has(people)) {
            issues.push({ level: 'error', index, message: `${people}명 가격이 중복되어 있습니다.` });
        } else {
            peopleSeen.add(people);
        }

        if (!Number.isFinite(price) || price <= 0) {
            issues.push({ level: 'error', index, message: '1인 총가격은 0보다 커야 합니다.' });
        }
        if (!Number.isFinite(deposit) || deposit < 0) {
            issues.push({ level: 'error', index, message: '예약금은 0 이상이어야 합니다.' });
        } else if (Number.isFinite(price) && deposit > price) {
            issues.push({ level: 'error', index, message: '예약금은 1인 총가격보다 클 수 없습니다.' });
        }
        if (
            Number.isFinite(price) &&
            Number.isFinite(deposit) &&
            Number.isFinite(local) &&
            Math.round(price) !== Math.round(deposit + local)
        ) {
            issues.push({
                level: 'warning',
                index,
                message: '현지 결제액이 총가격과 맞지 않아 저장 시 자동으로 다시 계산됩니다.',
            });
        }
    });

    const ordered = options
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => Number.isFinite(option.people) && Number.isFinite(option.pricePerPerson))
        .sort((a, b) => a.option.people - b.option.people);

    for (let i = 1; i < ordered.length; i += 1) {
        const previous = ordered[i - 1].option;
        const current = ordered[i].option;
        if (current.pricePerPerson > previous.pricePerPerson) {
            issues.push({
                level: 'warning',
                index: ordered[i].index,
                message: `${current.people}명 1인 가격이 ${previous.people}명보다 높습니다. 의도한 가격인지 확인해 주세요.`,
            });
        }
    }

    return issues;
};

export const resolvePricingOption = (
    options: TourPricingOption[] | undefined,
    people: number,
): TourPricingOption | null => {
    const sorted = normalizePricingOptions(options ?? []);
    if (sorted.length === 0) return null;

    const exact = sorted.find((option) => option.people === people);
    if (exact) return exact;
    if (people < sorted[0].people) return sorted[0];
    if (people > sorted[sorted.length - 1].people) return sorted[sorted.length - 1];
    return sorted.filter((option) => option.people <= people).pop() ?? sorted[0];
};

/** 추가 옵션 금액은 현지 결제액에 포함하고, 예약금은 예약 1건당 ¥20,000으로 고정한다. */
export const calculateTourPrice = (
    option: TourPricingOption | null,
    people: number,
    optionModifiers = 0,
): TourPriceBreakdown => {
    if (!option || people < 1) return { total: 0, deposit: 0, local: 0 };

    const normalized = normalizePricingOption(option);
    const parsedModifier = Number(optionModifiers);
    const modifier = Number.isFinite(parsedModifier) ? Math.round(parsedModifier) : 0;
    const total = Math.max(0, normalized.pricePerPerson * people + modifier);
    const deposit = getReservationDeposit(total);

    return {
        total,
        deposit,
        local: Math.max(0, total - deposit),
    };
};
