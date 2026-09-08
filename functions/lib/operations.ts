export const RESERVATION_STATUSES = [
    'pending_payment',
    'paid',
    'confirmed',
    'completed',
    'cancelled',
] as const;

export const QUOTE_STATUSES = [
    'new',
    'processing',
    'answered',
    'reservation_requested',
    'converted',
    'cancelled',
] as const;

export type ReservationStatus = typeof RESERVATION_STATUSES[number];
export type QuoteStatus = typeof QUOTE_STATUSES[number];

const reservationTransitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
    pending_payment: ['paid', 'confirmed', 'cancelled'],
    paid: ['pending_payment', 'confirmed', 'completed', 'cancelled'],
    confirmed: ['pending_payment', 'paid', 'completed', 'cancelled'],
    completed: ['confirmed', 'paid'],
    cancelled: ['pending_payment'],
};

const quoteTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
    new: ['processing', 'answered', 'converted', 'cancelled'],
    processing: ['new', 'answered', 'converted', 'cancelled'],
    answered: ['processing', 'reservation_requested', 'converted', 'cancelled'],
    reservation_requested: ['answered', 'converted', 'cancelled'],
    converted: ['reservation_requested'],
    cancelled: ['new'],
};

export class OperationsValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OperationsValidationError';
    }
}

export function normalizeReservationStatus(value: unknown): ReservationStatus {
    const status = String(value || 'pending_payment');
    if ((RESERVATION_STATUSES as readonly string[]).includes(status)) {
        return status as ReservationStatus;
    }
    throw new OperationsValidationError(`Invalid reservation status: ${status}`);
}

export function normalizeQuoteStatus(value: unknown): QuoteStatus {
    const status = String(value || 'new');
    // Older rows used `pending`; keep them readable while all new writes use `new`.
    if (status === 'pending') return 'new';
    if (status === 'completed') return 'answered';
    if (status === 'pending_payment') return 'reservation_requested';
    if (status === 'paid' || status === 'confirmed') return 'converted';
    if ((QUOTE_STATUSES as readonly string[]).includes(status)) {
        return status as QuoteStatus;
    }
    throw new OperationsValidationError(`Invalid quote status: ${status}`);
}

export function assertReservationTransition(fromValue: unknown, toValue: unknown): ReservationStatus {
    const from = normalizeReservationStatus(fromValue);
    const to = normalizeReservationStatus(toValue);
    if (from === to) return to;
    if (!reservationTransitions[from].includes(to)) {
        throw new OperationsValidationError(`Reservation status cannot move from ${from} to ${to}`);
    }
    return to;
}

export function assertQuoteTransition(fromValue: unknown, toValue: unknown): QuoteStatus {
    const from = normalizeQuoteStatus(fromValue);
    const to = normalizeQuoteStatus(toValue);
    if (from === to) return to;
    if (!quoteTransitions[from].includes(to)) {
        throw new OperationsValidationError(`Quote status cannot move from ${from} to ${to}`);
    }
    return to;
}

type PricingTier = {
    people?: number;
    pricePerPerson?: number;
    depositPerPerson?: number;
    localPaymentPerPerson?: number;
};

type SelectableOption = {
    id?: string;
    priceModifier?: number;
    isDefault?: boolean;
};

export type ProductPricingRecord = {
    price?: number;
    pricing_options?: unknown;
    pricingOptions?: unknown;
    accommodation_options?: unknown;
    accommodationOptions?: unknown;
    vehicle_options?: unknown;
    vehicleOptions?: unknown;
};

export type ProductPriceSelection = {
    people: number;
    accommodationId?: string | null;
    vehicleId?: string | null;
};

export type AuthoritativePrice = {
    total: number;
    deposit: number;
    local: number;
    pricePerPerson: number;
    pricingTierPeople: number;
    accommodationId: string | null;
    vehicleId: string | null;
};

function parseArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
        return [];
    }
}

function money(value: unknown, label: string): number {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
        throw new OperationsValidationError(`${label} must be a non-negative number`);
    }
    return Math.round(amount);
}

function selectTier(tiers: PricingTier[], people: number): Required<PricingTier> {
    const valid = tiers
        .map((tier) => ({
            people: Number(tier.people),
            pricePerPerson: Number(tier.pricePerPerson),
            depositPerPerson: Number(tier.depositPerPerson || 0),
            localPaymentPerPerson: Number(tier.localPaymentPerPerson || 0),
        }))
        .filter((tier) => Number.isInteger(tier.people) && tier.people > 0 && Number.isFinite(tier.pricePerPerson) && tier.pricePerPerson > 0)
        .sort((a, b) => a.people - b.people);

    if (!valid.length) {
        throw new OperationsValidationError('Product pricing tiers are not configured');
    }

    return valid.find((tier) => tier.people === people)
        || (people < valid[0].people ? valid[0] : undefined)
        || (people > valid[valid.length - 1].people ? valid[valid.length - 1] : undefined)
        || valid.filter((tier) => tier.people <= people).pop()
        || valid[0];
}

function selectOption(options: SelectableOption[], requestedId: string | null | undefined, label: string): SelectableOption | null {
    if (!options.length) return null;
    if (requestedId) {
        const selected = options.find((option) => String(option.id) === requestedId);
        if (!selected) throw new OperationsValidationError(`Invalid ${label} option`);
        return selected;
    }
    return options.find((option) => option.isDefault) || options[0] || null;
}

export function calculateAuthoritativeProductPrice(
    product: ProductPricingRecord,
    selection: ProductPriceSelection,
): AuthoritativePrice {
    const people = Number(selection.people);
    if (!Number.isInteger(people) || people < 1 || people > 50) {
        throw new OperationsValidationError('Traveler count must be an integer between 1 and 50');
    }

    const tiers = parseArray<PricingTier>(product.pricing_options ?? product.pricingOptions);
    const tier = selectTier(tiers, people);
    const accommodation = selectOption(
        parseArray<SelectableOption>(product.accommodation_options ?? product.accommodationOptions),
        selection.accommodationId,
        'accommodation',
    );
    const vehicle = selectOption(
        parseArray<SelectableOption>(product.vehicle_options ?? product.vehicleOptions),
        selection.vehicleId,
        'vehicle',
    );

    const baseTotal = money(tier.pricePerPerson, 'Price per person') * people;
    const optionTotal = money(accommodation?.priceModifier || 0, 'Accommodation modifier')
        + money(vehicle?.priceModifier || 0, 'Vehicle modifier');
    const total = baseTotal + optionTotal;
    const deposit = money(tier.depositPerPerson, 'Deposit per person') * people;

    if (total <= 0 || deposit > total) {
        throw new OperationsValidationError('Product price configuration is inconsistent');
    }

    return {
        total,
        deposit,
        local: total - deposit,
        pricePerPerson: money(tier.pricePerPerson, 'Price per person'),
        pricingTierPeople: tier.people,
        accommodationId: accommodation?.id ? String(accommodation.id) : null,
        vehicleId: vehicle?.id ? String(vehicle.id) : null,
    };
}

export function validateManualPrice(value: unknown): { total: number; deposit: number; local: number } {
    const input = (value && typeof value === 'object') ? value as Record<string, unknown> : {};
    const total = money(input.total, 'Total');
    const deposit = money(input.deposit || 0, 'Deposit');
    if (total <= 0 || deposit > total) {
        throw new OperationsValidationError('Manual price must have a positive total and a deposit not exceeding it');
    }
    return { total, deposit, local: total - deposit };
}

export function normalizeIdempotencyKey(value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    const key = String(value).trim();
    if (!key || key.length > 128 || !/^[A-Za-z0-9:_-]+$/.test(key)) {
        throw new OperationsValidationError('Invalid idempotency key');
    }
    return key;
}
