import { useMemo, useState } from 'react';
import type {
    TourProduct,
    TourPricingOption,
    AccommodationOption,
    VehicleOption,
} from '../../types/product';
import { MatIcon } from '../desktop-primitives/MatIcon';
import { Card, CardHeader, addDaysDate, fmtMD, formatPrice, stepCircle } from './primitives';
import { ReservationShell } from './ReservationShell';
import { CalendarBig } from './CalendarBig';
import { PriceTableModal } from './PriceTableModal';
import { BookingSummary } from './BookingSummary';

interface ReservationDesktopProps {
    product: TourProduct;
    parsedDuration: { nights: number; days: number };
    selectedStartDate: Date | null;
    setSelectedStartDate: (d: Date) => void;
    totalPeople: number;
    setTotalPeople: (n: number) => void;
    selectedAccomId: string;
    setSelectedAccomId: (id: string) => void;
    selectedVehicleId: string;
    setSelectedVehicleId: (id: string) => void;
    baseOption: TourPricingOption | null;
    priceBreakdown: { total: number; deposit: number; local: number };
    onNext: () => void;
}

/**
 * Step 0 — date + people + accommodation + vehicle.
 * All state lives in the parent (src/pages/Reservation.tsx) so mobile + desktop
 * share the exact same data flow; this component is purely presentational.
 */
export function ReservationDesktop({
    product,
    parsedDuration,
    selectedStartDate,
    setSelectedStartDate,
    totalPeople,
    setTotalPeople,
    selectedAccomId,
    setSelectedAccomId,
    selectedVehicleId,
    setSelectedVehicleId,
    baseOption,
    priceBreakdown,
    onNext,
}: ReservationDesktopProps) {
    const [showPriceTable, setShowPriceTable] = useState(false);

    const sortedPricing = useMemo<TourPricingOption[]>(
        () => (product.pricingOptions ?? []).slice().sort((a, b) => a.people - b.people),
        [product.pricingOptions]
    );
    const minPeople = sortedPricing[0]?.people ?? 1;
    const maxPeople = sortedPricing[sortedPricing.length - 1]?.people ?? 10;

    const accommodations = product.accommodationOptions ?? [];
    const vehicles = product.vehicleOptions ?? [];

    const endDate = selectedStartDate
        ? addDaysDate(selectedStartDate, Math.max(0, parsedDuration.nights))
        : null;

    const selectedAccom = accommodations.find((a) => a.id === selectedAccomId);
    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

    return (
        <ReservationShell step={0} productName={product.name}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 380px',
                    gap: 28,
                    alignItems: 'flex-start',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Selected tour card */}
                    <Card>
                        <CardHeader title="選択したツアー" />
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '180px 1fr',
                                gap: 20,
                                padding: '0 28px 24px',
                            }}
                        >
                            <div
                                style={{
                                    aspectRatio: '4/3',
                                    borderRadius: 12,
                                    backgroundImage: product.mainImages?.[0]
                                        ? `url(${product.mainImages[0]})`
                                        : 'linear-gradient(135deg, #134e4a, #0f766e)',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            />
                            <div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: 'var(--fg-5)',
                                        letterSpacing: '0.04em',
                                        fontWeight: 600,
                                        marginBottom: 4,
                                    }}
                                >
                                    SELECTED TOUR
                                </div>
                                <div
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color: 'var(--fg-1)',
                                        marginBottom: 10,
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {product.name}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 14,
                                        fontSize: 12,
                                        color: 'var(--fg-4)',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {product.duration && (
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <MatIcon
                                                name="calendar_month"
                                                size={14}
                                                color="var(--fg-5)"
                                            />{' '}
                                            {product.duration}
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <MatIcon
                                            name="translate"
                                            size={14}
                                            color="var(--fg-5)"
                                        />{' '}
                                        日本語ガイド
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Date picker */}
                    <Card>
                        <CardHeader
                            title="旅行開始日を選択"
                            subtitle={
                                parsedDuration.nights > 0
                                    ? `${parsedDuration.nights}泊${parsedDuration.days}日の旅行開始日を選択してください`
                                    : '出発日を選択してください'
                            }
                        />
                        <div style={{ padding: '0 28px 28px' }}>
                            <CalendarBig
                                value={selectedStartDate}
                                onChange={setSelectedStartDate}
                                nights={Math.max(0, parsedDuration.nights)}
                            />
                            {selectedStartDate && endDate && (
                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: '14px 18px',
                                        background: 'var(--primary-tint, rgba(15,118,110,0.08))',
                                        borderRadius: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14,
                                    }}
                                >
                                    <MatIcon
                                        name="event_available"
                                        size={20}
                                        filled
                                        color="var(--primary-dark, #115e59)"
                                    />
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: 'var(--primary-dark, #115e59)',
                                                opacity: 0.75,
                                                fontWeight: 600,
                                            }}
                                        >
                                            選択された旅行期間
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 15,
                                                fontWeight: 700,
                                                color: 'var(--primary-dark, #115e59)',
                                                marginTop: 2,
                                            }}
                                        >
                                            {fmtMD(selectedStartDate)} 〜 {fmtMD(endDate)}{' '}
                                            <span
                                                style={{
                                                    fontWeight: 500,
                                                    opacity: 0.85,
                                                    marginLeft: 4,
                                                }}
                                            >
                                                ({parsedDuration.nights}泊
                                                {parsedDuration.days}日)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* People */}
                    <Card>
                        <CardHeader title="人数の選択" />
                        <div style={{ padding: '0 28px 24px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px 0',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: 'var(--fg-1)',
                                        }}
                                    >
                                        合計人数
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: 'var(--fg-5)',
                                            marginTop: 4,
                                        }}
                                    >
                                        {sortedPricing.length > 0
                                            ? `${minPeople} 名 〜 ${maxPeople} 名`
                                            : '人数を選択してください'}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '6px 10px',
                                        background: 'var(--bg-muted)',
                                        borderRadius: 999,
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (sortedPricing.length === 0) return;
                                            const idx = sortedPricing.findIndex(
                                                (p) => p.people === totalPeople
                                            );
                                            if (idx > 0) setTotalPeople(sortedPricing[idx - 1].people);
                                        }}
                                        disabled={
                                            sortedPricing.length === 0 || totalPeople <= minPeople
                                        }
                                        style={{
                                            ...stepCircle,
                                            opacity:
                                                sortedPricing.length === 0 ||
                                                    totalPeople <= minPeople
                                                    ? 0.3
                                                    : 1,
                                            cursor:
                                                sortedPricing.length === 0 ||
                                                    totalPeople <= minPeople
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                        }}
                                    >
                                        <MatIcon
                                            name="remove"
                                            size={18}
                                            color="var(--fg-2)"
                                        />
                                    </button>
                                    <span
                                        style={{
                                            fontSize: 15,
                                            fontWeight: 700,
                                            color: 'var(--fg-1)',
                                            minWidth: 44,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {totalPeople} 名
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (sortedPricing.length === 0) return;
                                            const idx = sortedPricing.findIndex(
                                                (p) => p.people === totalPeople
                                            );
                                            if (idx < sortedPricing.length - 1)
                                                setTotalPeople(sortedPricing[idx + 1].people);
                                        }}
                                        disabled={
                                            sortedPricing.length === 0 || totalPeople >= maxPeople
                                        }
                                        style={{
                                            ...stepCircle,
                                            opacity:
                                                sortedPricing.length === 0 ||
                                                    totalPeople >= maxPeople
                                                    ? 0.3
                                                    : 1,
                                            cursor:
                                                sortedPricing.length === 0 ||
                                                    totalPeople >= maxPeople
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                        }}
                                    >
                                        <MatIcon name="add" size={18} color="#0f766e" />
                                    </button>
                                </div>
                            </div>
                            <div
                                style={{
                                    marginTop: 4,
                                    padding: '14px 18px',
                                    background: 'var(--bg-muted)',
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <MatIcon name="info" size={18} color="var(--fg-4)" />
                                    <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
                                        現在の人数の基準 お1人様{' '}
                                        <strong
                                            style={{ color: '#0f766e', fontWeight: 700 }}
                                        >
                                            ¥{formatPrice(baseOption?.pricePerPerson ?? 0)}
                                        </strong>
                                    </span>
                                </div>
                                {sortedPricing.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPriceTable(true)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '8px 14px',
                                            background: '#fff',
                                            border: '1px solid var(--border)',
                                            borderRadius: 999,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: 'var(--fg-2)',
                                        }}
                                    >
                                        人数別価格を見る{' '}
                                        <MatIcon
                                            name="expand_more"
                                            size={16}
                                            color="var(--fg-3)"
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Accommodation options */}
                    <Card>
                        <CardHeader title="宿泊オプション" />
                        <div style={{ padding: '0 28px 24px' }}>
                            {accommodations.length === 0 ? (
                                <EmptyHint label="選択可能な宿泊オプションがありません。(基本含む)" />
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                    }}
                                >
                                    {accommodations.map((o) => (
                                        <OptionCard
                                            key={o.id}
                                            label={o.name}
                                            description={o.description}
                                            priceModifier={o.priceModifier}
                                            icon={o.imageUrl ? undefined : 'bed'}
                                            imageUrl={o.imageUrl}
                                            isDefault={o.isDefault}
                                            on={selectedAccomId === o.id}
                                            onClick={() => setSelectedAccomId(o.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Vehicle options */}
                    <Card>
                        <CardHeader
                            title="車両オプション"
                            subtitle="参加人数によって、最適な車両を自動で手配します"
                        />
                        <div style={{ padding: '0 28px 24px' }}>
                            {vehicles.length === 0 ? (
                                <EmptyHint label="選択可能な車両オプションがありません。(基本含む)" />
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                    }}
                                >
                                    {vehicles.map((v) => (
                                        <OptionCard
                                            key={v.id}
                                            label={v.name}
                                            description={v.description}
                                            priceModifier={v.priceModifier}
                                            icon="directions_car"
                                            isDefault={v.isDefault}
                                            on={selectedVehicleId === v.id}
                                            onClick={() => setSelectedVehicleId(v.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right summary */}
                <BookingSummary
                    product={product}
                    selectedStartDate={selectedStartDate}
                    endDate={endDate}
                    nights={parsedDuration.nights}
                    days={parsedDuration.days}
                    people={totalPeople}
                    baseOption={baseOption}
                    total={priceBreakdown.total}
                    deposit={priceBreakdown.deposit}
                    local={priceBreakdown.local}
                    accommodationLabel={selectedAccom?.name}
                    accommodationSub={accomSub(selectedAccom)}
                    vehicleLabel={selectedVehicle?.name}
                    vehicleSub={vehicleSub(selectedVehicle)}
                    ctaLabel="次のステップへ"
                    onCta={onNext}
                    canProceed={!!selectedStartDate}
                    canProceedHint={!selectedStartDate ? '旅行開始日を選択してください' : null}
                />
            </div>

            {showPriceTable && sortedPricing.length > 0 && (
                <PriceTableModal
                    options={sortedPricing}
                    current={totalPeople}
                    onChange={(n) => {
                        setTotalPeople(n);
                        setShowPriceTable(false);
                    }}
                    onClose={() => setShowPriceTable(false)}
                />
            )}
        </ReservationShell>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Local helpers
// ──────────────────────────────────────────────────────────────────────────────

function accomSub(o: AccommodationOption | undefined): string | undefined {
    if (!o) return undefined;
    if (o.priceModifier === 0) return o.isDefault ? '基本含む' : '追加料金なし';
    return o.priceModifier > 0
        ? `+ ¥${formatPrice(o.priceModifier)}`
        : `${formatPrice(o.priceModifier)} 円`;
}

function vehicleSub(o: VehicleOption | undefined): string | undefined {
    if (!o) return undefined;
    if (o.priceModifier === 0) return o.isDefault ? '基本含む' : '追加料金なし';
    return o.priceModifier > 0
        ? `+ ¥${formatPrice(o.priceModifier)}`
        : `${formatPrice(o.priceModifier)} 円`;
}

function EmptyHint({ label }: { label: string }) {
    return (
        <div
            style={{
                padding: '14px 18px',
                background: 'var(--bg-muted)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--fg-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
            }}
        >
            <MatIcon name="info" size={18} color="var(--fg-5)" />
            {label}
        </div>
    );
}

interface OptionCardProps {
    label: string;
    description?: string;
    priceModifier: number;
    icon?: string;
    imageUrl?: string;
    isDefault?: boolean;
    on: boolean;
    onClick: () => void;
}

function OptionCard({
    label,
    description,
    priceModifier,
    icon,
    imageUrl,
    isDefault,
    on,
    onClick,
}: OptionCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                textAlign: 'left',
                padding: '18px 20px',
                borderRadius: 14,
                background: on ? 'var(--primary-tint, rgba(15,118,110,0.08))' : '#fff',
                border: on ? '2px solid #0f766e' : '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                position: 'relative',
            }}
        >
            {isDefault && (
                <span
                    style={{
                        position: 'absolute',
                        top: -8,
                        left: 16,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        background: '#0f766e',
                        color: '#fff',
                        borderRadius: 4,
                        letterSpacing: '0.06em',
                    }}
                >
                    おすすめ
                </span>
            )}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt=""
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            objectFit: 'cover',
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    icon && (
                        <MatIcon
                            name={icon}
                            size={20}
                            color={on ? '#0f766e' : 'var(--fg-3)'}
                        />
                    )
                )}
                <span
                    style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                    }}
                >
                    {label}
                </span>
            </div>
            {description && (
                <div
                    style={{
                        fontSize: 12,
                        color: 'var(--fg-4)',
                        marginBottom: 10,
                        lineHeight: 1.55,
                    }}
                >
                    {description}
                </div>
            )}
            <div
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: on ? 'var(--primary-dark, #115e59)' : 'var(--fg-2)',
                }}
            >
                {priceModifier === 0
                    ? '追加料金なし'
                    : priceModifier > 0
                        ? `+ ¥${formatPrice(priceModifier)}`
                        : `${formatPrice(priceModifier)} 円`}
            </div>
        </button>
    );
}
