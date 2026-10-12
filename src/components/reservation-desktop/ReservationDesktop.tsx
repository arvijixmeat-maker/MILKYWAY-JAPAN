import { useCallback, useMemo, useState } from 'react';
import { BookingDateCard, BookingOptionCard, BookingPeopleCard } from '../reservation-shared/BookingStepOne';
import { BookingSummaryCard } from '../reservation-shared/BookingSummaryCard';
import { PriceTableDialog } from '../reservation-shared/PriceTableDialog';
import {
    BK_HINT_DEPOSIT, BK_HINT_PICK_DATE, BK_STICKY_TOP_PC, addDays, findOption, sortTiers,
    type ReservationStepProps,
} from '../reservation-shared/bookingShared';
import { ReservationShell } from './ReservationShell';

/**
 * STEP 1 on PC — date, head count, accommodation and vehicle, with the sticky summary card.
 * All state lives in src/pages/Reservation.tsx so PC and mobile share one data flow;
 * this component only lays the cards out.
 */
export function ReservationDesktop({
    product, parsedDuration, selectedStartDate, setSelectedStartDate, totalPeople, setTotalPeople,
    selectedAccomId, setSelectedAccomId, selectedVehicleId, setSelectedVehicleId, baseOption, priceBreakdown, onNext,
}: ReservationStepProps) {
    const [showPriceTable, setShowPriceTable] = useState(false);
    const closePriceTable = useCallback(() => setShowPriceTable(false), []);

    const tiers = useMemo(() => sortTiers(product.pricingOptions), [product.pricingOptions]);
    const accommodations = product.accommodationOptions ?? [];
    const vehicles = product.vehicleOptions ?? [];
    const nights = Math.max(0, parsedDuration.nights);
    const endDate = selectedStartDate ? addDays(selectedStartDate, nights) : null;
    const ready = !!selectedStartDate;

    return (
        <ReservationShell step={1} productName={product.name}>
            <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <BookingDateCard pc parsedDuration={parsedDuration} value={selectedStartDate} onChange={setSelectedStartDate} />
                <BookingPeopleCard pc tiers={tiers} totalPeople={totalPeople} setTotalPeople={setTotalPeople} baseOption={baseOption} onShowPrices={() => setShowPriceTable(true)} />
                {accommodations.length > 0 && (
                    <BookingOptionCard pc title="宿泊オプション" sub="ご希望の宿泊タイプをお選びください" options={accommodations} selectedId={selectedAccomId} onSelect={setSelectedAccomId} />
                )}
                {vehicles.length > 0 && (
                    <BookingOptionCard pc title="車両オプション" sub="参加人数に合わせて最適な車両を自動で手配します" options={vehicles} selectedId={selectedVehicleId} onSelect={setSelectedVehicleId} />
                )}
            </div>

            <BookingSummaryCard
                pc
                product={product}
                start={selectedStartDate}
                end={endDate}
                nights={parsedDuration.nights}
                days={parsedDuration.days}
                people={totalPeople}
                baseOption={baseOption}
                priceBreakdown={priceBreakdown}
                accom={findOption(accommodations, selectedAccomId)}
                vehicle={findOption(vehicles, selectedVehicleId)}
                stickyTop={BK_STICKY_TOP_PC}
                cta={{ label: '次のステップへ', onClick: onNext, disabled: !ready, hint: ready ? BK_HINT_DEPOSIT : BK_HINT_PICK_DATE, hintError: !ready }}
            />

            {showPriceTable && tiers.length > 0 && (
                <PriceTableDialog
                    pc
                    options={tiers}
                    current={totalPeople}
                    onChange={(n) => {
                        setTotalPeople(n);
                        setShowPriceTable(false);
                    }}
                    onClose={closePriceTable}
                />
            )}
        </ReservationShell>
    );
}
