import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertQuoteTransition,
    assertReservationTransition,
    calculateAuthoritativeProductPrice,
    normalizeIdempotencyKey,
    normalizeQuoteStatus,
    normalizeReservationStatus,
    OperationsValidationError,
    validateManualPrice,
} from '../functions/lib/operations.ts';

const product = {
    pricing_options: JSON.stringify([
        { people: 2, pricePerPerson: 120_000, depositPerPerson: 20_000, localPaymentPerPerson: 100_000 },
        { people: 4, pricePerPerson: 100_000, depositPerPerson: 20_000, localPaymentPerPerson: 80_000 },
    ]),
    accommodation_options: JSON.stringify([
        { id: 'ger', priceModifier: 0, isDefault: true },
        { id: 'hotel', priceModifier: 30_000 },
    ]),
    vehicle_options: [
        { id: 'van', priceModifier: 0, isDefault: true },
        { id: 'suv', priceModifier: 20_000 },
    ],
};

test('status catalogs reject unknown values and preserve legacy quote rows', () => {
    assert.equal(normalizeReservationStatus('confirmed'), 'confirmed');
    assert.equal(normalizeQuoteStatus('pending'), 'new');
    assert.equal(normalizeQuoteStatus('completed'), 'answered');
    assert.throws(() => normalizeReservationStatus('unknown'), OperationsValidationError);
    assert.throws(() => normalizeQuoteStatus('unknown'), OperationsValidationError);
});

test('reservation and quote transitions allow workflow progress but reject invalid jumps', () => {
    assert.equal(assertReservationTransition('pending_payment', 'confirmed'), 'confirmed');
    assert.equal(assertReservationTransition('confirmed', 'completed'), 'completed');
    assert.throws(() => assertReservationTransition('cancelled', 'completed'), OperationsValidationError);

    assert.equal(assertQuoteTransition('new', 'processing'), 'processing');
    assert.equal(assertQuoteTransition('answered', 'reservation_requested'), 'reservation_requested');
    assert.throws(() => assertQuoteTransition('converted', 'new'), OperationsValidationError);
});

test('server pricing uses the selected tier and adds selected options to the balance', () => {
    assert.deepEqual(calculateAuthoritativeProductPrice(product, {
        people: 4,
        accommodationId: 'hotel',
        vehicleId: 'suv',
    }), {
        total: 450_000,
        deposit: 80_000,
        local: 370_000,
        pricePerPerson: 100_000,
        pricingTierPeople: 4,
        accommodationId: 'hotel',
        vehicleId: 'suv',
    });
});

test('server pricing mirrors the client fallback tier and rejects forged options', () => {
    const price = calculateAuthoritativeProductPrice(product, { people: 3 });
    assert.equal(price.pricingTierPeople, 2);
    assert.equal(price.total, 360_000);
    assert.equal(price.deposit, 60_000);
    assert.throws(
        () => calculateAuthoritativeProductPrice(product, { people: 2, vehicleId: 'not-real' }),
        OperationsValidationError,
    );
});

test('manual pricing and idempotency keys are validated', () => {
    assert.deepEqual(validateManualPrice({ total: 500_000, deposit: 100_000, local: 1 }), {
        total: 500_000,
        deposit: 100_000,
        local: 400_000,
    });
    assert.equal(normalizeIdempotencyKey('quote-conversion:abc_123'), 'quote-conversion:abc_123');
    assert.throws(() => validateManualPrice({ total: 100, deposit: 101 }), OperationsValidationError);
    assert.throws(() => normalizeIdempotencyKey('contains spaces'), OperationsValidationError);
});
