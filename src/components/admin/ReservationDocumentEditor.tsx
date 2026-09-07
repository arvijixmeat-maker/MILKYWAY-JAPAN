import React, { useEffect, useMemo, useState } from 'react';
import {
    TemplatePreview,
    mergeDocumentSettings,
    defaultDocumentSettings,
    parseDayActivitiesText,
    type DocumentSettings,
    type TemplateDay,
    type ActivityType,
} from '../../pages/AdminTemplateManage';
import { api } from '../../lib/api';
import { uploadImage } from '../../utils/upload';
import type { DayInfoContent, DetailContentBlock, TimelineContent, TourProduct } from '../../types/product';
import { TouristSpotPickerModal } from './TouristSpotPickerModal';
import { HotelPickerModal } from './HotelPickerModal';
import type { TouristSpot } from '../../types/touristSpot';
import type { Hotel } from '../../types/hotel';

export interface ReservationDocContent {
    name: string;
    description: string;
    days: TemplateDay[];
    documentSettings: DocumentSettings;
}

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    documentType?: 'itinerary' | 'contract';
    /** 템플릿(프리셋) 편집 모드 — 고객 없이 샘플 표시, 전체 문서 페이지 탭 노출 */
    templateMode?: boolean;
    /** 실제 고객 데이터 — TemplatePreview 상단/금액에 자동 표시 (템플릿 모드에선 생략) */
    customer?: {
        tripNumber?: string;
        period?: string;
        tripLength?: string;
        headcount?: string;
        name?: string;
        tripType?: string;
        totalAmount?: number;
        deposit?: number;
        localAmount?: number;
        peopleCount?: number;
    };
    /** 저장돼 있던 문서 내용(없으면 템플릿/기본값) */
    initialContent: ReservationDocContent | null;
    onSave: (content: ReservationDocContent, tourDates?: { startDate: string; endDate: string }) => Promise<void>;
    /** 고객 확정 일정의 기준 여행일. 전달된 경우 편집기에서 수정·저장할 수 있다. */
    tourStartDate?: string;
    tourEndDate?: string;
    /** 가이드·숙소 배정 (상세내역의 picker 재사용) */
    assignedGuide?: { name?: string; phone?: string; image?: string } | null;
    dailyAccommodations?: Array<{ day: number; accommodation: { name?: string } }>;
    onAssignGuide?: () => void;
    onAssignAccommodation?: (day: number) => void;
    /** 확정 숙소 배정 해제 — 해당 일차의 dailyAccommodations 항목을 제거 */
    onUnassignAccommodation?: (day: number) => void;
}

type EditorMode = 'edit' | 'preview';

const documentSnapshot = (
    name: string,
    description: string,
    days: TemplateDay[],
    documentSettings: DocumentSettings,
    startDate: string,
    endDate: string,
) => JSON.stringify({ name, description, days, documentSettings, startDate, endDate });

const getExpectedDayCount = (startDate: string, endDate: string, tripLength?: string) => {
    if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        const count = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
        if (Number.isFinite(count) && count > 0) return count;
    }
    const dayMatch = (tripLength || '').match(/(\d+)\s*日/);
    if (dayMatch) return Number(dayMatch[1]);
    const nightMatch = (tripLength || '').match(/(\d+)\s*泊/);
    return nightMatch ? Number(nightMatch[1]) + 1 : null;
};

export const ReservationDocumentEditor: React.FC<Props> = ({ open, onClose, title, documentType = 'itinerary', templateMode = false, customer, initialContent, onSave, tourStartDate, tourEndDate, assignedGuide, dailyAccommodations, onAssignGuide, onAssignAccommodation, onUnassignAccommodation }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<TemplateDay[]>([]);
    const [docSettings, setDocSettings] = useState<DocumentSettings>(defaultDocumentSettings());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [draggedDayIndex, setDraggedDayIndex] = useState<number | null>(null);
    const [products, setProducts] = useState<TourProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    // 예약 상품 일정을 자동으로 불러왔을 때 안내 배너에 표시할 상품명
    const [autoLoadedName, setAutoLoadedName] = useState<string | null>(null);
    const [editorMode, setEditorMode] = useState<EditorMode>('edit');
    const [savedSnapshot, setSavedSnapshot] = useState('');
    const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
    const [bulkScheduleText, setBulkScheduleText] = useState('');
    // 마스터 픽커 — 관광지(항목 채움) / 호텔(일차 숙박정보 채움)
    const [spotTarget, setSpotTarget] = useState<{ d: number; a: number } | null>(null);
    const [hotelDayIdx, setHotelDayIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!open) return;
        const nextName = initialContent?.name || customer?.tripType || '';
        const nextDescription = initialContent?.description || '';
        const nextDays = Array.isArray(initialContent?.days) ? initialContent!.days : [];
        const nextSettings = mergeDocumentSettings(initialContent?.documentSettings);
        const nextStartDate = tourStartDate || '';
        const nextEndDate = tourEndDate || '';
        setName(nextName);
        setDescription(nextDescription);
        setDays(nextDays);
        setDocSettings(nextSettings);
        setStartDate(nextStartDate);
        setEndDate(nextEndDate);
        setSelectedDayIndex(0);
        setAutoLoadedName(null);
        setEditorMode('edit');
        setBulkScheduleOpen(false);
        setBulkScheduleText('');
        setSavedSnapshot(documentSnapshot(nextName, nextDescription, nextDays, nextSettings, nextStartDate, nextEndDate));
    }, [open, initialContent, tourStartDate, tourEndDate]);

    useEffect(() => {
        if (!open || products.length > 0) return;
        setLoadingProducts(true);
        api.products.list()
            .then((data: any) => {
                if (!Array.isArray(data)) return;
                const parse = (value: any, fallback: any = []) => {
                    if (typeof value === 'string') {
                        try { return JSON.parse(value); } catch { return fallback; }
                    }
                    return value || fallback;
                };
                const mapped = data.map((item: any) => ({
                    ...item,
                    mainImages: parse(item.mainImages || item.main_images),
                    galleryImages: parse(item.galleryImages || item.gallery_images),
                    detailImages: parse(item.detailImages || item.detail_images),
                    itineraryImages: parse(item.itineraryImages || item.itinerary_images),
                    itineraryBlocks: parse(item.itineraryBlocks || item.itinerary_blocks),
                    highlights: parse(item.highlights),
                    included: parse(item.included),
                    excluded: parse(item.excluded),
                    pricingOptions: parse(item.pricingOptions || item.pricing_options),
                    accommodationOptions: parse(item.accommodationOptions || item.accommodation_options),
                    vehicleOptions: parse(item.vehicleOptions || item.vehicle_options),
                })) as TourProduct[];
                setProducts(mapped);
                const target = (customer?.tripType || '').replace(/\s+/g, '').toLowerCase();
                // 예약 기간(일수) — "3泊4日"→4. 동명/유사명 상품이 여러 개일 때 예약과 같은 일정의 상품을 고르기 위해 사용
                const targetDays = (() => {
                    const tl = customer?.tripLength || '';
                    const md = tl.match(/(\d+)\s*日/);
                    if (md) return parseInt(md[1], 10);
                    const mn = tl.match(/(\d+)\s*泊/);
                    return mn ? parseInt(mn[1], 10) + 1 : null;
                })();
                const matched = mapped.filter(product => {
                    const productName = (product.name || '').replace(/\s+/g, '').toLowerCase();
                    return productName === target || productName.includes(target) || target.includes(productName);
                }).sort((a, b) => {
                    const an = (a.name || '').replace(/\s+/g, '').toLowerCase();
                    const bn = (b.name || '').replace(/\s+/g, '').toLowerCase();
                    // 1) 예약 상품명과 정확히 일치하는 상품 우선
                    const aExact = an === target ? 1 : 0;
                    const bExact = bn === target ? 1 : 0;
                    if (aExact !== bExact) return bExact - aExact;
                    // 2) 예약 기간(일수)과 같은 상품 우선 (4일 예약에 5일 상품이 잡히는 문제 방지)
                    if (targetDays != null) {
                        const aDay = getProductScheduleStats(a).days === targetDays ? 1 : 0;
                        const bDay = getProductScheduleStats(b).days === targetDays ? 1 : 0;
                        if (aDay !== bDay) return bDay - aDay;
                    }
                    // 3) 그 외에는 일정이 풍부한 상품 우선
                    const aStats = getProductScheduleStats(a);
                    const bStats = getProductScheduleStats(b);
                    return (bStats.days * 1000 + bStats.activities) - (aStats.days * 1000 + aStats.activities);
                })[0];
                if (matched) {
                    setSelectedProductId(matched.id);
                    // 예약 일정표를 처음 여는 경우(저장된 문서 없음) 예약 상품 일정을 자동으로 불러옴
                    const freshDoc = !initialContent || !Array.isArray(initialContent.days) || initialContent.days.length === 0;
                    if (!templateMode && documentType === 'itinerary' && freshDoc && getProductScheduleStats(matched).days > 0) {
                        applyProduct(matched, { auto: true });
                    }
                }
            })
            .finally(() => setLoadingProducts(false));
    }, [open, documentType, customer?.tripType, products.length]);

    const textFromProductItem = (item: any) => {
        if (typeof item === 'string') return item;
        return item?.label || item?.title || item?.name || item?.description || '';
    };

    const parseBlockContent = <T,>(content: T | string): T => {
        if (typeof content !== 'string') return content as T;
        try { return JSON.parse(content) as T; } catch { return content as T; }
    };

    const getProductScheduleStats = (product: TourProduct) => {
        const blocks = product.itineraryBlocks || [];
        return {
            days: blocks.filter(block => block.type === 'dayInfo').length,
            activities: blocks.filter(block => block.type === 'timeline').length,
        };
    };

    const productBlocksToDays = (blocks: DetailContentBlock[] = []): TemplateDay[] => {
        const converted: TemplateDay[] = [];
        let current: TemplateDay | null = null;
        for (const block of blocks) {
            if (block.type === 'dayInfo') {
                const info = parseBlockContent<DayInfoContent>(block.content as DayInfoContent | string);
                current = {
                    day: converted.length + 1,
                    date: info.dayDate || '',
                    title: info.title || '',
                    region: '',
                    summary: info.description || '',
                    activities: [],
                    meals: info.meals || {},
                    accommodation: info.accommodation ? {
                        id: info.accommodationHotelId,
                        name: info.accommodation,
                        location: info.accommodationAddress,
                        images: info.accommodationImages || [],
                        description: info.accommodationDescription,
                    } : null,
                };
                converted.push(current);
                continue;
            }
            if (block.type === 'timeline') {
                if (!current) {
                    current = { day: 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null };
                    converted.push(current);
                }
                const timeline = parseBlockContent<TimelineContent>(block.content as TimelineContent | string);
                current.activities.push({
                    time: '',
                    type: 'sightseeing',
                    title: timeline.title || '',
                    description: timeline.description || '',
                    images: timeline.images || [],
                });
            }
        }
        return converted;
    };

    // 상품의 일정·포함/불포함·가격을 편집기에 적용. auto=true 면 빈 일정일 때만 조용히 적용(경고·확인창 없음)
    const applyProduct = (product: TourProduct, opts?: { auto?: boolean }) => {
        const importedDays = productBlocksToDays(product.itineraryBlocks || []);
        const isEmpty = importedDays.length === 0 || importedDays.every(day => !day.title && !day.summary && day.activities.length === 0);
        if (isEmpty) {
            if (!opts?.auto) window.alert('이 상품은 예전 이미지형 일정만 등록되어 있어 DAY 일정으로 불러올 수 없습니다. 목록에서 DAY 개수가 표시된 동일 이름 상품을 선택해 주세요.');
            return;
        }
        if (!opts?.auto && days.length > 0 && !window.confirm('현재 작성 중인 일정과 문서 설정을 상품 정보로 교체할까요?')) return;
        const included = (product.included || []).map(textFromProductItem).filter(Boolean);
        const excluded = (product.excluded || []).map(textFromProductItem).filter(Boolean);
        const defaultPricing = product.pricingOptions?.find(option => option.people === customer?.peopleCount)
            || product.pricingOptions?.[0];

        setName(product.name || customer?.tripType || '');
        setDescription(product.description || '');
        setDays(importedDays);
        setSelectedDayIndex(0);
        setDocSettings(current => ({
            ...current,
            overview: {
                ...current.overview,
                heroTagline: product.description || current.overview.heroTagline,
                pricePerPerson: String(defaultPricing?.pricePerPerson || product.price || current.overview.pricePerPerson),
                includedText: included.join('\n'),
                excludedText: excluded.join('\n'),
                included: included.slice(0, 8).map((label, index) => ({
                    icon: current.overview.included[index]?.icon || 'check_circle',
                    label,
                })),
            },
            guide: {
                ...current.guide,
                paymentInfo: defaultPricing
                    ? `예약금: 1인 ${defaultPricing.depositPerPerson.toLocaleString()}원\n현지 잔금: 1인 ${defaultPricing.localPaymentPerPerson.toLocaleString()}원`
                    : current.guide.paymentInfo,
            },
        }));
        if (opts?.auto) setAutoLoadedName(product.name || customer?.tripType || '예약 상품');
    };

    const importSelectedProduct = () => {
        const product = products.find(item => item.id === selectedProductId);
        if (!product) return;
        setAutoLoadedName(null);
        applyProduct(product, { auto: false });
    };

    const selectProduct = (productId: string) => {
        setSelectedProductId(productId);
        if (!productId) return;
        const product = products.find(item => item.id === productId);
        const isScheduleEmpty = days.length === 0 || days.every(day => !day.title && !(day.activities?.length));
        if (product && isScheduleEmpty && getProductScheduleStats(product).days > 0) {
            setAutoLoadedName(null);
            applyProduct(product, { auto: true });
        }
    };

    // ── Day / activity 핸들러 ──
    const updateDay = (idx: number, field: keyof TemplateDay, value: any) =>
        setDays(d => d.map((x, i) => i === idx ? { ...x, [field]: value } : x));
    const addDay = () => setDays(d => {
        setSelectedDayIndex(d.length);
        return [...d, { day: d.length + 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null }];
    });
    const removeDay = (idx: number) => setDays(d => {
        const next = d.filter((_, i) => i !== idx).map((x, i) => ({ ...x, day: i + 1 }));
        setSelectedDayIndex(current => Math.max(0, Math.min(current > idx ? current - 1 : current, next.length - 1)));
        return next;
    });
    const duplicateDay = (idx: number) => setDays(current => {
        const source = current[idx];
        if (!source) return current;
        const duplicate: TemplateDay = {
            ...source,
            day: idx + 2,
            title: source.title ? `${source.title} 복사본` : '',
            activities: source.activities.map(activity => ({ ...activity, images: [...(activity.images || [])] })),
            meals: { ...(source.meals || {}) },
            accommodation: source.accommodation ? { ...source.accommodation, images: [...(source.accommodation.images || [])] } : null,
        };
        const next = [...current];
        next.splice(idx + 1, 0, duplicate);
        setSelectedDayIndex(idx + 1);
        return next.map((day, dayIndex) => ({ ...day, day: dayIndex + 1 }));
    });
    const fillDatesFromStart = () => {
        if (!startDate) {
            window.alert('먼저 상단에서 투어 시작일을 입력해 주세요.');
            return;
        }
        const start = new Date(`${startDate}T00:00:00`);
        setDays(current => current.map((day, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return { ...day, date: `${date.getMonth() + 1}月${date.getDate()}日` };
        }));
    };
    const prepareItinerary = () => {
        const selectedProduct = products.find(item => item.id === selectedProductId);
        const isScheduleEmpty = days.length === 0 || days.every(day => !day.title && day.activities.length === 0);
        if (selectedProduct && isScheduleEmpty && getProductScheduleStats(selectedProduct).days > 0) {
            applyProduct(selectedProduct, { auto: true });
        }
        setDays(current => {
            const next = [...current];
            const targetDayCount = Math.max(expectedDayCount || 1, next.length || 1);
            while (next.length < targetDayCount) {
                next.push({ day: next.length + 1, title: '', region: '', summary: '', activities: [], meals: {}, accommodation: null });
            }
            if (!startDate) return next.map((day, index) => ({ ...day, day: index + 1 }));
            const start = new Date(`${startDate}T00:00:00`);
            return next.map((day, index) => {
                const date = new Date(start);
                date.setDate(start.getDate() + index);
                return { ...day, day: index + 1, date: `${date.getMonth() + 1}月${date.getDate()}日` };
            });
        });
        setSelectedDayIndex(0);
    };
    // 일차 순서 변경(드래그앤드랍) — 이동 후 DAY 번호를 1..N으로 재정렬
    const moveDay = (from: number, to: number) => setDays(d => {
        if (from === to || to < 0 || to >= d.length) return d;
        const arr = [...d];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return arr.map((x, i) => ({ ...x, day: i + 1 }));
    });
    const handleDayDragStart = (index: number) => setDraggedDayIndex(index);
    const handleDayDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedDayIndex === null || draggedDayIndex === index) return;
        const from = draggedDayIndex;
        moveDay(from, index);
        // 선택된 일차가 이동에 따라 유지되도록 인덱스 보정
        setSelectedDayIndex(sel =>
            sel === from ? index
                : from < sel && index >= sel ? sel - 1
                    : from > sel && index <= sel ? sel + 1
                        : sel
        );
        setDraggedDayIndex(index);
    };
    const handleDayDragEnd = () => setDraggedDayIndex(null);
    const addActivity = (dayIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: [...x.activities, { time: '', type: 'sightseeing' as ActivityType, title: '', description: '' }] } : x));
    const removeActivity = (dayIdx: number, actIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.filter((_, j) => j !== actIdx) } : x));
    const updateActivity = (dayIdx: number, actIdx: number, field: 'time' | 'title' | 'description', value: string) =>
        setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.map((a, j) => j === actIdx ? { ...a, [field]: value } : a) } : x));
    const updateMeal = (dayIdx: number, field: 'breakfast' | 'lunch' | 'dinner', value: string) =>
        setDays(current => current.map((day, index) => index === dayIdx ? { ...day, meals: { ...(day.meals || {}), [field]: value } } : day));
    const applyBulkSchedule = () => {
        if (!selectedDay) return;
        const activities = parseDayActivitiesText(bulkScheduleText);
        if (activities.length === 0) {
            window.alert('붙여넣은 일정이 없습니다. 한 줄에 일정 하나씩 입력해 주세요.');
            return;
        }
        if (selectedDay.activities.length > 0 && !window.confirm(`현재 DAY ${selectedDay.day}의 일정 ${selectedDay.activities.length}개를 붙여넣은 일정으로 교체할까요?`)) return;
        setDays(current => current.map((day, index) => index === selectedDayIndex ? { ...day, activities } : day));
        setBulkScheduleText('');
        setBulkScheduleOpen(false);
    };
    // 일정 항목 순서 변경(드래그앤드랍) — moveDay와 같은 방식, 같은 일차 내에서만 이동
    const moveActivityTo = (dayIdx: number, from: number, to: number) => setDays(d => d.map((x, i) => {
        if (i !== dayIdx || from === to || to < 0 || to >= x.activities.length) return x;
        const acts = [...x.activities];
        const [moved] = acts.splice(from, 1);
        acts.splice(to, 0, moved);
        return { ...x, activities: acts };
    }));
    // 일정 항목 사진 업로드 — AdminTemplateManage의 uploadActivityImages와 동일 패턴(WebP 압축 → R2)
    const uploadActivityImages = async (dayIdx: number, actIdx: number, files: FileList | null) => {
        if (!files?.length) return;
        try {
            const urls = await Promise.all(Array.from(files).map(file => uploadImage(file, 'reservation-docs')));
            setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.map((a, j) => j === actIdx ? { ...a, images: [...(a.images || []), ...urls] } : a) } : x));
        } catch {
            alert('일정 사진 업로드에 실패했습니다.');
        }
    };
    const removeActivityImage = (dayIdx: number, actIdx: number, imgIdx: number) =>
        setDays(d => d.map((x, i) => i === dayIdx ? { ...x, activities: x.activities.map((a, j) => j === actIdx ? { ...a, images: (a.images || []).filter((_, k) => k !== imgIdx) } : a) } : x));

    // 관광지 마스터 → 해당 항목의 제목(비었을 때만)·설명·사진 채움
    const fillItemFromSpot = (d: number, a: number, spot: TouristSpot) => setDays(prev => prev.map((day, i) => {
        if (i !== d) return day;
        const acts = day.activities.map((act, j) => {
            if (j !== a) return act;
            const keepTitle = (act.title || '').trim().length > 0;
            const desc = [spot.description, spot.address].filter(Boolean).join('\n' + '\n');
            return { ...act, title: keepTitle ? act.title : spot.name_kr, description: desc || act.description, images: (spot.images && spot.images.length > 0) ? [...spot.images] : act.images };
        });
        return { ...day, activities: acts };
    }));
    // 호텔 마스터 → 해당 일차의 宿泊情報 채움
    const fillDayFromHotel = (d: number, hotel: Hotel) => setDays(prev => prev.map((day, i) => i === d ? { ...day, accommodation: { id: hotel.id, name: hotel.name_kr, location: hotel.address || '', images: hotel.images || [], description: hotel.description || '' } } : day));

    // ── documentSettings 핸들러 ──
    const updateDocSection = <K extends keyof DocumentSettings>(section: K, patch: Partial<DocumentSettings[K]>) =>
        setDocSettings(s => ({ ...s, [section]: { ...s[section], ...patch } }));
    const updateIncluded = (idx: number, field: 'icon' | 'label', value: string) =>
        setDocSettings(s => ({ ...s, overview: { ...s.overview, included: s.overview.included.map((it, i) => i === idx ? { ...it, [field]: value } : it) } }));
    const updateCancellation = (idx: number, field: 'period' | 'fee', value: string) =>
        setDocSettings(s => ({ ...s, contract: { ...s.contract, cancellationRows: s.contract.cancellationRows.map((r, i) => i === idx ? { ...r, [field]: value } : r) } }));
    const updateGuideNotice = (idx: number, field: 'title' | 'body', value: string) =>
        setDocSettings(s => ({ ...s, guide: { ...s.guide, notices: s.guide.notices.map((n, i) => i === idx ? { ...n, [field]: value } : n) } }));

    const expectedDayCount = getExpectedDayCount(startDate, endDate, customer?.tripLength);
    const currentSnapshot = useMemo(
        () => documentSnapshot(name, description, days, docSettings, startDate, endDate),
        [name, description, days, docSettings, startDate, endDate],
    );
    const hasUnsavedChanges = Boolean(savedSnapshot) && savedSnapshot !== currentSnapshot;
    const incompleteDays = days
        .map((day, index) => ({
            day: day.day,
            index,
            missing: [
                !day.title?.trim() ? '제목' : '',
                day.activities.length === 0 ? '주요 일정' : '',
            ].filter(Boolean),
        }))
        .filter(item => item.missing.length > 0);
    const nightsNeedingAccommodation = days.slice(0, Math.max(0, days.length - 1));
    const unassignedAccommodationDays = nightsNeedingAccommodation.filter(day => {
        const assigned = dailyAccommodations?.find(item => item.day === day.day)?.accommodation?.name;
        return !assigned && !day.accommodation?.name;
    });
    const completedDayCount = days.length - incompleteDays.length;
    const readinessPercent = days.length === 0 ? 0 : Math.round((completedDayCount / days.length) * 100);

    const handleSave = async () => {
        // 빈 일정 저장 방지 — 이대로 저장되면 고객 화면에 「日程は現在準備中です」만 떠서
        // "저장했는데 일정표가 안 나온다"로 이어진다.
        if (!templateMode && documentType === 'itinerary' && days.length === 0) {
            const ok = window.confirm('일정(DAY)이 하나도 없습니다.\n이대로 저장하면 고객 화면에는 「日程は現在準備中です」로 표시됩니다.\n\n계속 저장할까요?\n(취소 후 좌측 「선택 상품 적용」을 누르면 상품 일정이 채워집니다)');
            if (!ok) return;
        }
        if (!templateMode && documentType === 'itinerary' && expectedDayCount && expectedDayCount !== days.length) {
            const ok = window.confirm(`여행기간은 ${expectedDayCount}일이지만 작성된 일정은 ${days.length}일입니다.\n누락된 DAY가 없는지 확인해 주세요.\n\n그래도 저장할까요?`);
            if (!ok) return;
        }
        if (!templateMode && (tourStartDate !== undefined || tourEndDate !== undefined)) {
            if ((startDate && !endDate) || (!startDate && endDate)) {
                alert('여행 시작일과 종료일을 모두 입력해 주세요.');
                return;
            }
            if (startDate && endDate && endDate < startDate) {
                alert('여행 종료일은 시작일보다 빠를 수 없습니다.');
                return;
            }
        }
        setSaving(true);
        try {
            await onSave(
                { name, description, days, documentSettings: docSettings },
                (tourStartDate !== undefined || tourEndDate !== undefined) ? { startDate, endDate } : undefined,
            );
            setSavedSnapshot(currentSnapshot);
            onClose();
        } catch (e: any) {
            alert('저장 실패: ' + (e?.message || e));
        } finally {
            setSaving(false);
        }
    };

    const requestClose = () => {
        if (hasUnsavedChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 편집 화면을 닫을까요?')) return;
        onClose();
    };

    if (!open) return null;

    const totalAmount = customer?.totalAmount || 0;
    const includedCount = docSettings.overview.included.filter(item => item.label?.trim()).length;
    const excludedCount = docSettings.overview.excludedText.split(/\r?\n/).filter(Boolean).length;
    const selectedDay = days[selectedDayIndex];
    const datesEditable = !templateMode && (tourStartDate !== undefined || tourEndDate !== undefined);
    const editableDuration = (() => {
        if (!startDate || !endDate) return undefined;
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
        return Number.isFinite(nights) && nights >= 0 ? `${nights}泊${nights + 1}日` : undefined;
    })();
    const editablePeriod = startDate && endDate ? `${startDate} ~ ${endDate}` : (startDate || customer?.period || '');
    const previewCustomer = customer ? {
        ...customer,
        period: datesEditable ? editablePeriod : customer.period,
        tripLength: datesEditable ? (editableDuration || customer.tripLength) : customer.tripLength,
    } : customer;

    return (
        <div className="fixed inset-0 z-[210] bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6">
            <div className="bg-[#F5F7FA] dark:bg-slate-900 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl">
                <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={requestClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="편집기 닫기">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{templateMode ? '일정 프리셋 편집' : '고객 문서 편집'}</p>
                            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{title}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`mr-2 hidden items-center gap-1.5 text-xs font-bold sm:inline-flex ${hasUnsavedChanges ? 'text-amber-600' : 'text-slate-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${hasUnsavedChanges ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            {hasUnsavedChanges ? '저장하지 않은 변경사항' : '모든 변경사항 저장됨'}
                        </span>
                        <button onClick={requestClose} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">취소</button>
                        <button onClick={handleSave} disabled={saving || !hasUnsavedChanges} className="px-5 py-2 text-sm font-bold bg-[#3182F6] hover:bg-[#1B64DA] text-white rounded-lg inline-flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">check</span>{saving ? '저장 중' : '저장'}
                        </button>
                    </div>
                </div>
                {(customer || (documentType === 'contract' && (onAssignGuide || onAssignAccommodation))) && <div className="flex flex-shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
                    <div className={`grid gap-2 sm:grid-cols-3 ${datesEditable ? 'lg:min-w-[760px] lg:grid-cols-5' : 'lg:min-w-[520px]'}`}>
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#1B64DA]">고객</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{customer?.name || '고객명 없음'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">예약번호</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{customer?.tripNumber || '-'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">여행기간</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{editableDuration || customer?.tripLength || '-'}</p>
                        </div>
                        {datesEditable && <>
                            <label className="rounded-2xl border border-blue-200 bg-white px-4 py-2 dark:border-blue-800 dark:bg-slate-800">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-[#1B64DA]">투어 시작일</span>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-black text-slate-900 outline-none dark:text-white" />
                            </label>
                            <label className="rounded-2xl border border-blue-200 bg-white px-4 py-2 dark:border-blue-800 dark:bg-slate-800">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-[#1B64DA]">투어 종료일</span>
                                <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-black text-slate-900 outline-none dark:text-white" />
                            </label>
                        </>}
                    </div>
                    {documentType === 'contract' && (onAssignGuide || onAssignAccommodation) && (
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {onAssignGuide && (
                            <button onClick={onAssignGuide} className="inline-flex h-12 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-black text-[#1B64DA] shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-900/30">
                                <span className="material-symbols-outlined text-[20px]">{assignedGuide?.name ? 'badge' : 'person_add'}</span>
                                <span>{assignedGuide?.name || '가이드 배정'}</span>
                            </button>
                        )}
                        {onAssignAccommodation && (
                            <div className="flex flex-wrap items-center gap-2">
                                {Array.from({ length: Math.max(days.length, dailyAccommodations?.length || 0, 1) }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const a = dailyAccommodations?.find(d => d.day === dayNum);
                                    return (
                                        <button key={i} onClick={() => onAssignAccommodation(dayNum)} className={`inline-flex h-12 items-center gap-1.5 rounded-xl border px-3 text-xs font-black shadow-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 ${a ? 'border-blue-200 bg-white text-[#1B64DA] dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300' : 'border-dashed border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800'}`}>
                                            <span className="material-symbols-outlined text-[18px]">hotel</span>
                                            <span>{dayNum}日: {a?.accommodation?.name || '숙소 선택'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        </div>
                    )}
                </div>}
                {documentType === 'contract' && <div className="flex flex-shrink-0 items-center gap-2 border-b border-blue-200 bg-blue-50 px-6 py-2 text-xs font-bold text-[#3182F6] dark:border-blue-800 dark:bg-blue-900/20">
                    <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
                    <span>문서를 클릭해서 수정하고, 상단에서 담당 가이드와 일자별 숙소를 배정하면 일정표·계약서에 함께 반영됩니다.</span>
                </div>}
                {autoLoadedName && (
                    <div className="flex flex-shrink-0 items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-6 py-2 text-xs font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                        <span>예약 상품 「{autoLoadedName}」의 일정을 자동으로 불러왔습니다 — <b>항공편 시간 등만 조정</b>하고 저장하세요.</span>
                        <button onClick={() => setAutoLoadedName(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                )}
                {!templateMode && documentType === 'itinerary' && (
                    <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setEditorMode('edit')}
                                className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${editorMode === 'edit' ? 'bg-white text-[#3182F6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">edit_note</span>빠른 편집
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('preview')}
                                className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors ${editorMode === 'preview' ? 'bg-white text-[#3182F6] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>PDF 미리보기
                            </button>
                        </div>
                        <div className="hidden items-center gap-4 text-xs font-semibold text-slate-500 md:flex">
                            <span>완성 DAY <b className="text-slate-900">{completedDayCount}/{days.length}</b></span>
                            <span className="h-4 w-px bg-slate-200" />
                            <span>전체 완성도 <b className="text-[#3182F6]">{readinessPercent}%</b></span>
                        </div>
                    </div>
                )}
                <div className="flex-1 overflow-hidden bg-[#F5F7FA] dark:bg-slate-900">
                    {!templateMode && documentType === 'itinerary' && editorMode === 'edit' ? (
                    <div className="grid h-full grid-cols-[260px_minmax(620px,1fr)_300px] overflow-hidden max-xl:grid-cols-[240px_minmax(560px,1fr)] max-lg:block max-lg:overflow-y-auto">
                        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4 max-lg:border-b max-lg:border-r-0">
                            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                                <div className="flex items-start gap-2.5">
                                    <span className="material-symbols-outlined mt-0.5 text-[19px] text-[#3182F6]">inventory_2</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">상품 일정 가져오기</p>
                                        <p className="mt-0.5 text-xs leading-5 text-slate-500">기존 일정을 빠르게 시작할 수 있습니다.</p>
                                    </div>
                                </div>
                                <select
                                    value={selectedProductId}
                                    onChange={event => selectProduct(event.target.value)}
                                    className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10"
                                    disabled={loadingProducts}
                                >
                                    <option value="">{loadingProducts ? '상품 불러오는 중...' : '상품을 선택하세요'}</option>
                                    {products.map(product => {
                                        const stats = getProductScheduleStats(product);
                                        return <option key={product.id} value={product.id}>{product.name} ({stats.days}일 · {stats.activities}개 일정)</option>;
                                    })}
                                </select>
                                <button
                                    type="button"
                                    onClick={importSelectedProduct}
                                    disabled={!selectedProductId}
                                    className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#3182F6] text-xs font-bold text-white hover:bg-[#1B64DA] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[17px]">download</span>선택 상품 적용
                                </button>
                            </div>

                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">일정 구성</p>
                                    <h2 className="mt-0.5 text-base font-bold text-slate-900">{days.length}일 일정</h2>
                                </div>
                                <button onClick={addDay} className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#3182F6] px-3 text-xs font-bold text-white hover:bg-[#1B64DA]">
                                    <span className="material-symbols-outlined text-[17px]">add</span>DAY
                                </button>
                            </div>
                            <div className="space-y-2">
                                {days.map((day, index) => {
                                    const missing = incompleteDays.find(item => item.index === index)?.missing || [];
                                    return (
                                        <div
                                            key={`${day.day}-${index}`}
                                            onClick={() => setSelectedDayIndex(index)}
                                            onDragOver={(event) => handleDayDragOver(event, index)}
                                            onDrop={handleDayDragEnd}
                                            className={`cursor-pointer rounded-xl border p-3 transition-colors ${selectedDayIndex === index ? 'border-[#3182F6] bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'} ${draggedDayIndex === index ? 'opacity-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    draggable
                                                    onDragStart={() => handleDayDragStart(index)}
                                                    onDragEnd={handleDayDragEnd}
                                                    onClick={event => event.stopPropagation()}
                                                    title="드래그하여 일차 순서 변경"
                                                    className="flex cursor-grab items-center text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                                                </span>
                                                <span className="text-xs font-bold text-[#3182F6]">DAY {day.day}</span>
                                                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${missing.length ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                    {missing.length ? '확인 필요' : '완료'}
                                                </span>
                                            </div>
                                            <p className={`mt-2 truncate text-sm font-bold ${day.title ? 'text-slate-900' : 'text-slate-400'}`}>{day.title || '일차 제목 미입력'}</p>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                                <span>{day.date || '날짜 미정'}</span><span>·</span><span>{day.activities.length}개 일정</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={addDay} className="flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-blue-300 text-xs font-bold text-[#3182F6] hover:bg-blue-50">
                                    <span className="material-symbols-outlined text-[17px]">add</span>{days.length === 0 ? '첫 번째 DAY 추가' : 'DAY 추가'}
                                </button>
                            </div>
                        </aside>

                        <main className="overflow-y-auto p-6 max-lg:min-h-[720px] max-sm:p-4">
                            <div className="mx-auto max-w-4xl space-y-5">
                                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <span className="material-symbols-outlined grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#3182F6] text-[21px] text-white">auto_awesome</span>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">전체 일정 자동 준비</h2>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">예약 상품의 일정과 여행기간을 기준으로 DAY·날짜를 한 번에 구성합니다. 이후에는 누락된 내용만 확인하세요.</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" onClick={prepareItinerary} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#3182F6] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1B64DA]">
                                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>자동 준비 실행
                                            </button>
                                            <button type="button" onClick={() => setBulkScheduleOpen(open => !open)} disabled={!selectedDay} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-[#1B64DA] transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">
                                                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>여러 줄 일정 붙여넣기
                                            </button>
                                        </div>
                                    </div>
                                </section>
                                    {bulkScheduleOpen && selectedDay && (
                                        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">DAY {selectedDay.day} 일정 일괄 입력</p>
                                                    <p className="mt-1 text-xs text-slate-500">한 줄에 하나씩 붙여넣으면 시간과 제목을 자동으로 나눕니다.</p>
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">예: 09:00 호텔 출발</span>
                                            </div>
                                            <textarea value={bulkScheduleText} onChange={event => setBulkScheduleText(event.target.value)} rows={6} placeholder={'09:00 호텔 출발\n10:30 테를지 국립공원 관광\n12:30 현지식 점심\n15:00 승마 체험'} className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10" />
                                            <div className="mt-3 flex justify-end gap-2">
                                                <button type="button" onClick={() => { setBulkScheduleOpen(false); setBulkScheduleText(''); }} className="h-10 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-100">취소</button>
                                                <button type="button" onClick={applyBulkSchedule} className="h-10 rounded-lg bg-[#3182F6] px-4 text-xs font-bold text-white hover:bg-[#1B64DA]">DAY {selectedDay.day}에 적용</button>
                                            </div>
                                        </div>
                                    )}
                            {selectedDay ? (
                                <div className="space-y-5">
                                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <span className="text-xs font-bold text-[#3182F6]">DAY {selectedDay.day}</span>
                                                <h2 className="mt-1 text-xl font-bold text-slate-900">선택한 일차 편집</h2>
                                                <p className="mt-1 text-sm text-slate-500">입력한 내용은 오른쪽 점검과 PDF 미리보기에 바로 반영됩니다.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => duplicateDay(selectedDayIndex)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                    <span className="material-symbols-outlined text-[17px]">content_copy</span>DAY 복제
                                                </button>
                                                <button type="button" onClick={() => { if (window.confirm(`DAY ${selectedDay.day}을(를) 삭제할까요?`)) removeDay(selectedDayIndex); }} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-bold text-red-600 hover:bg-red-50">
                                                    <span className="material-symbols-outlined text-[17px]">delete</span>삭제
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                                            <label className="block">
                                                <span className="mb-2 block text-xs font-bold text-slate-600">일차 제목 <b className="text-red-500">*</b></span>
                                                <input value={selectedDay.title || ''} onChange={event => updateDay(selectedDayIndex, 'title', event.target.value)} placeholder="예: 울란바토르 도착 및 시내 관광" className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-2 block text-xs font-bold text-slate-600">지역</span>
                                                <input value={selectedDay.region || ''} onChange={event => updateDay(selectedDayIndex, 'region', event.target.value)} placeholder="예: 울란바토르" className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10" />
                                            </label>
                                            <label className="block">
                                                <span className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                                                    표시 날짜
                                                    {startDate && <button type="button" onClick={fillDatesFromStart} className="font-bold text-[#3182F6] hover:underline">전체 날짜 자동 입력</button>}
                                                </span>
                                                <input value={selectedDay.date || ''} onChange={event => updateDay(selectedDayIndex, 'date', event.target.value)} placeholder={startDate ? '자동 입력 가능' : '예: 9月20日'} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10" />
                                            </label>
                                            <div className="block">
                                                <span className="mb-2 block text-xs font-bold text-slate-600">현재 상태</span>
                                                <div className={`flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold ${incompleteDays.some(item => item.index === selectedDayIndex) ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                                                    <span className="material-symbols-outlined text-[18px]">{incompleteDays.some(item => item.index === selectedDayIndex) ? 'warning' : 'check_circle'}</span>
                                                    {incompleteDays.find(item => item.index === selectedDayIndex)?.missing.join(', ') || '필수 내용 입력 완료'}
                                                </div>
                                            </div>
                                        </div>
                                        <label className="mt-4 block">
                                            <span className="mb-2 block text-xs font-bold text-slate-600">일차 소개</span>
                                            <textarea value={selectedDay.summary || ''} onChange={event => updateDay(selectedDayIndex, 'summary', event.target.value)} rows={3} placeholder="고객에게 보여줄 오늘 일정의 간단한 설명을 입력하세요." className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-[#3182F6] focus:ring-4 focus:ring-blue-500/10" />
                                        </label>
                                    </section>

                                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-base font-bold text-slate-900">주요 일정</h3>
                                                <p className="mt-1 text-xs text-slate-500">위아래 버튼으로 순서를 바꾸고 관광지·사진 정보를 연결하세요.</p>
                                            </div>
                                            <button type="button" onClick={() => addActivity(selectedDayIndex)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#3182F6] px-3.5 text-xs font-bold text-white hover:bg-[#1B64DA]">
                                                <span className="material-symbols-outlined text-[17px]">add</span>일정 추가
                                            </button>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            {selectedDay.activities.map((activity, activityIndex) => (
                                                <div key={activityIndex} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <input value={activity.time || ''} onChange={event => updateActivity(selectedDayIndex, activityIndex, 'time', event.target.value)} placeholder="시간" className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#3182F6]" />
                                                        <input value={activity.title || ''} onChange={event => updateActivity(selectedDayIndex, activityIndex, 'title', event.target.value)} placeholder="일정 제목을 입력하세요" className="h-10 min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-[#3182F6]" />
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => setSpotTarget({ d: selectedDayIndex, a: activityIndex })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-[#3182F6]">
                                                                <span className="material-symbols-outlined text-[16px]">location_on</span>관광지
                                                            </button>
                                                            <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-[#3182F6]">
                                                                <span className="material-symbols-outlined text-[16px]">photo</span>사진
                                                                <input type="file" accept="image/*" multiple className="hidden" onChange={event => uploadActivityImages(selectedDayIndex, activityIndex, event.target.files)} />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <textarea value={activity.description || ''} onChange={event => updateActivity(selectedDayIndex, activityIndex, 'description', event.target.value)} rows={3} placeholder="고객에게 보여줄 상세 설명" className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#3182F6]" />
                                                    {(activity.images || []).length > 0 && (
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {(activity.images || []).map((image, imageIndex) => (
                                                                <div key={`${image}-${imageIndex}`} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                    <img src={image} alt="일정" className="h-full w-full object-cover" />
                                                                    <button type="button" onClick={() => removeActivityImage(selectedDayIndex, activityIndex, imageIndex)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-900/75 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="사진 삭제">
                                                                        <span className="material-symbols-outlined text-[15px]">close</span>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => moveActivityTo(selectedDayIndex, activityIndex, activityIndex - 1)} disabled={activityIndex === 0} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30" aria-label="위로 이동"><span className="material-symbols-outlined text-[17px]">arrow_upward</span></button>
                                                            <button type="button" onClick={() => moveActivityTo(selectedDayIndex, activityIndex, activityIndex + 1)} disabled={activityIndex === selectedDay.activities.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30" aria-label="아래로 이동"><span className="material-symbols-outlined text-[17px]">arrow_downward</span></button>
                                                        </div>
                                                        <button type="button" onClick={() => { if (window.confirm('이 일정을 삭제할까요?')) removeActivity(selectedDayIndex, activityIndex); }} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-red-500 hover:bg-red-50"><span className="material-symbols-outlined text-[16px]">delete</span>일정 삭제</button>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedDay.activities.length === 0 && (
                                                <button type="button" onClick={() => addActivity(selectedDayIndex)} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-[#3182F6]">
                                                    <span className="material-symbols-outlined text-[26px]">add_circle</span>첫 번째 주요 일정 추가
                                                </button>
                                            )}
                                        </div>
                                    </section>

                                    <section className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-[#3182F6]">restaurant</span><h3 className="text-base font-bold text-slate-900">식사</h3></div>
                                            <div className="mt-4 space-y-3">
                                                {([['breakfast', '조식'], ['lunch', '중식'], ['dinner', '석식']] as const).map(([key, label]) => (
                                                    <label key={key} className="grid grid-cols-[44px_1fr] items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-500">{label}</span>
                                                        <input value={selectedDay.meals?.[key] || ''} onChange={event => updateMeal(selectedDayIndex, key, event.target.value)} placeholder="미정" className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#3182F6]" />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-[#3182F6]">hotel</span><h3 className="text-base font-bold text-slate-900">숙소</h3></div>
                                            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                                                <p className="text-sm font-bold text-slate-900">{dailyAccommodations?.find(item => item.day === selectedDay.day)?.accommodation?.name || selectedDay.accommodation?.name || '숙소가 배정되지 않았습니다'}</p>
                                                <p className="mt-1 text-xs text-slate-500">DAY {selectedDay.day} 숙박 정보</p>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                {onAssignAccommodation && <button type="button" onClick={() => onAssignAccommodation(selectedDay.day)} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 text-xs font-bold text-[#3182F6] hover:bg-blue-50"><span className="material-symbols-outlined text-[17px]">hotel</span>숙소 선택</button>}
                                                {(selectedDay.accommodation || dailyAccommodations?.some(item => item.day === selectedDay.day)) && <button type="button" onClick={() => { setDays(current => current.map((day, index) => index === selectedDayIndex ? { ...day, accommodation: null } : day)); onUnassignAccommodation?.(selectedDay.day); }} className="h-10 rounded-lg px-3 text-xs font-bold text-red-500 hover:bg-red-50">배정 해제</button>}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <button type="button" onClick={addDay} className="mx-auto flex min-h-64 w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-300 hover:text-[#3182F6]">
                                    <span className="material-symbols-outlined text-[36px]">calendar_add_on</span><span className="font-bold">첫 번째 DAY를 추가하세요</span>
                                </button>
                            )}
                            </div>
                        </main>

                        <aside className="overflow-y-auto border-l border-slate-200 bg-white p-5 max-xl:hidden">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">저장 전 점검</p>
                                    <h3 className="mt-0.5 text-base font-bold text-slate-900">일정 완성도</h3>
                                </div>
                                <span className="text-2xl font-bold text-[#3182F6]">{readinessPercent}%</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#3182F6] transition-all" style={{ width: `${readinessPercent}%` }} /></div>

                            <div className="mt-5 space-y-2">
                                {expectedDayCount && expectedDayCount !== days.length && (
                                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                                        <div className="flex gap-2"><span className="material-symbols-outlined text-[19px]">error</span><div><b className="block">DAY 수가 맞지 않습니다</b><span className="mt-1 block text-xs leading-5">여행기간 {expectedDayCount}일 · 작성 일정 {days.length}일</span></div></div>
                                    </div>
                                )}
                                {incompleteDays.map(item => (
                                    <button key={item.day} type="button" onClick={() => setSelectedDayIndex(item.index)} className="flex w-full items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-left text-sm text-amber-800 hover:border-amber-300">
                                        <span className="material-symbols-outlined text-[19px]">warning</span><span><b className="block">DAY {item.day} 확인 필요</b><span className="mt-1 block text-xs">{item.missing.join(', ')}을 입력해 주세요.</span></span>
                                    </button>
                                ))}
                                {unassignedAccommodationDays.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                        <div className="flex gap-2"><span className="material-symbols-outlined text-[19px] text-slate-500">hotel</span><div><b className="block">숙소 미배정 {unassignedAccommodationDays.length}일</b><span className="mt-1 block text-xs leading-5 text-slate-500">{unassignedAccommodationDays.map(day => `DAY ${day.day}`).join(', ')}</span></div></div>
                                    </div>
                                )}
                                {(!expectedDayCount || expectedDayCount === days.length) && incompleteDays.length === 0 && (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                                        <div className="flex gap-2"><span className="material-symbols-outlined text-[19px]">check_circle</span><div><b className="block">필수 일정 입력 완료</b><span className="mt-1 block text-xs">PDF 미리보기에서 최종 내용을 확인하세요.</span></div></div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 border-t border-slate-200 pt-5">
                                <h4 className="text-sm font-bold text-slate-900">빠른 작업</h4>
                                <div className="mt-3 space-y-2">
                                    <button type="button" onClick={prepareItinerary} className="flex h-10 w-full items-center gap-2 rounded-lg bg-[#3182F6] px-3 text-left text-xs font-bold text-white hover:bg-[#1B64DA]"><span className="material-symbols-outlined text-[17px]">auto_awesome</span>여행기간 기준 자동 준비</button>
                                    {startDate && <button type="button" onClick={fillDatesFromStart} className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-[#3182F6]"><span className="material-symbols-outlined text-[17px]">calendar_month</span>전체 DAY 날짜 자동 입력</button>}
                                    {onAssignGuide && <button type="button" onClick={onAssignGuide} className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-[#3182F6]"><span className="material-symbols-outlined text-[17px]">badge</span>{assignedGuide?.name || '담당 가이드 배정'}</button>}
                                    <button type="button" onClick={() => setEditorMode('preview')} className="flex h-10 w-full items-center gap-2 rounded-lg border border-blue-200 px-3 text-left text-xs font-bold text-[#3182F6] hover:bg-blue-50"><span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>PDF 미리보기 열기</button>
                                </div>
                            </div>
                        </aside>
                    </div>
                    ) : (
                    <div className={`grid h-full overflow-hidden ${!templateMode && documentType === 'itinerary' && editorMode === 'preview' ? 'grid-cols-1' : 'grid-cols-[240px_minmax(560px,1fr)_280px] max-xl:grid-cols-[210px_minmax(520px,1fr)] max-lg:block max-lg:overflow-y-auto'}`}>
                        <aside className={`${!templateMode && documentType === 'itinerary' && editorMode === 'preview' ? 'hidden' : ''} overflow-y-auto border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-lg:border-b max-lg:border-r-0`}>
                            <div className="mb-4 rounded-xl border border-blue-200 bg-[#F5F7FA] p-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#3182F6]">inventory_2</span>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">상품 정보 불러오기</p>
                                        <p className="text-[9px] font-semibold text-slate-400">일정·가격·포함사항을 재사용합니다.</p>
                                    </div>
                                </div>
                                <select
                                    value={selectedProductId}
                                    onChange={event => selectProduct(event.target.value)}
                                    className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-[#3182F6]"
                                    disabled={loadingProducts}
                                >
                                    <option value="">{loadingProducts ? '상품 불러오는 중...' : '상품 선택'}</option>
                                    {products.map(product => {
                                        const stats = getProductScheduleStats(product);
                                        return <option key={product.id} value={product.id}>{product.name} ({stats.days}일 · 일정 {stats.activities}개)</option>;
                                    })}
                                </select>
                                <button
                                    type="button"
                                    onClick={importSelectedProduct}
                                    disabled={!selectedProductId}
                                    className="mt-2 flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-[#3182F6] text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[15px]">download</span>
                                    선택 상품 적용
                                </button>
                            </div>
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">일정 구성</p>
                                    <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">{days.length}일 일정</h2>
                                </div>
                                <button onClick={addDay} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3182F6] text-white" title="DAY 추가">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {days.map((day, index) => (
                                    <div
                                        key={`${day.day}-${index}`}
                                        onClick={() => setSelectedDayIndex(index)}
                                        onDragOver={(e) => handleDayDragOver(e, index)}
                                        onDrop={handleDayDragEnd}
                                        className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-colors ${selectedDayIndex === index ? 'border-[#3182F6] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'} ${draggedDayIndex === index ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1">
                                                <span
                                                    draggable
                                                    onDragStart={() => handleDayDragStart(index)}
                                                    onDragEnd={handleDayDragEnd}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="드래그하여 일차 순서 변경"
                                                    className="-ml-1 flex cursor-grab items-center text-slate-300 hover:text-slate-500 active:cursor-grabbing"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                                                </span>
                                                <span className="text-[10px] font-black text-[#3182F6]">DAY {day.day}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-bold text-slate-400">{day.activities.length}개 일정</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`DAY ${day.day}을(를) 삭제할까요?`)) removeDay(index); }}
                                                    title="DAY 삭제"
                                                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            value={day.title || ''}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateDay(index, 'title', e.target.value)}
                                            placeholder="일차 제목을 입력하세요"
                                            className="mt-1 w-full truncate border-none bg-transparent p-0 text-xs font-black text-slate-800 outline-none placeholder:font-semibold placeholder:text-slate-300 focus:ring-0"
                                        />
                                        <input
                                            value={day.region || ''}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateDay(index, 'region', e.target.value)}
                                            placeholder="지역 미정"
                                            className="mt-0.5 w-full truncate border-none bg-transparent p-0 text-[10px] font-semibold text-slate-400 outline-none placeholder:text-slate-300 focus:ring-0"
                                        />
                                        <input
                                            value={day.date || ''}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => updateDay(index, 'date', e.target.value)}
                                            placeholder={startDate ? '기준일로 자동 계산' : '날짜 직접 입력 (예: 9月20日)'}
                                            className="mt-0.5 w-full truncate border-none bg-transparent p-0 text-[10px] font-semibold text-[#3182F6] outline-none placeholder:text-slate-300 focus:ring-0"
                                        />
                                    </div>
                                ))}
                                <button onClick={addDay} className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-200 px-3 py-3 text-xs font-black text-[#3182F6] hover:bg-blue-50">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    {days.length === 0 ? '첫 번째 DAY 추가' : 'DAY 추가'}
                                </button>
                            </div>
                        </aside>

                        <main className={`min-w-0 overflow-hidden ${!templateMode && documentType === 'itinerary' && editorMode === 'preview' ? 'p-6' : 'p-4 max-lg:h-[760px]'}`}>
                            <TemplatePreview
                        name={name}
                        description={description}
                        days={days}
                        documentSettings={docSettings}
                        customer={previewCustomer}
                        assignedGuide={assignedGuide}
                        dailyAccommodations={dailyAccommodations}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onDocSection={updateDocSection}
                        onIncluded={updateIncluded}
                        onCancellation={updateCancellation}
                        onGuideNotice={updateGuideNotice}
                        onDayChange={updateDay}
                        onActivityChange={updateActivity}
                        onAddDay={addDay}
                        onAddActivity={addActivity}
                        onRemoveDay={removeDay}
                        onRemoveActivity={removeActivity}
                        onDayActivitiesText={(d, text) => setDays(ds => ds.map((x, i) => i === d ? { ...x, activities: parseDayActivitiesText(text) } : x))}
                                onMoveActivity={moveActivityTo}
                                onUploadActivityImages={uploadActivityImages}
                                onRemoveActivityImage={removeActivityImage}
                                onPickSpot={(d, a) => setSpotTarget({ d, a })}
                                onPickHotel={(dayIdx) => { if (!templateMode && onAssignAccommodation) { onAssignAccommodation(dayIdx + 1); } else { setHotelDayIdx(dayIdx); } }}
                                onClearHotel={(dayIdx) => {
                                    // 문서 내용의 숙소 + (예약 모드) 확정 배정을 함께 해제
                                    setDays(prev => prev.map((d, i) => i === dayIdx ? { ...d, accommodation: null } : d));
                                    if (!templateMode && onUnassignAccommodation) onUnassignAccommodation(dayIdx + 1);
                                }}
                                defaultPage={documentType === 'contract' ? 'contract' : 'overview'}
                                focusDayIndex={selectedDayIndex}
                                showPageTabs={true}
                            />
                        </main>

                        <aside className={`${!templateMode && documentType === 'itinerary' && editorMode === 'preview' ? 'hidden' : ''} overflow-y-auto border-l border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 max-xl:hidden`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">여행 요약</p>
                            <div className="mt-3 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#3182F6]">calendar_month</span>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400">여행 기간</p>
                                        <p className="text-xs font-black text-slate-800">{editablePeriod || editableDuration || customer?.period || customer?.tripLength || '-'}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-[9px] font-bold text-slate-400">인원</p>
                                        <p className="mt-1 text-xs font-black text-slate-800">{customer?.headcount || '-'}</p>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-2">
                                        <p className="text-[9px] font-bold text-slate-400">총 금액</p>
                                        <p className="mt-1 text-xs font-black text-[#3182F6]">{totalAmount ? `¥${totalAmount.toLocaleString()}` : "-"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black text-slate-800">현재 DAY</p>
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-[#3182F6]">DAY {selectedDay?.day || 0}</span>
                                </div>
                                <dl className="mt-3 space-y-2 text-[11px]">
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">지역</dt><dd className="truncate font-black text-slate-700">{selectedDay?.region || '미정'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">날짜</dt><dd className="truncate font-black text-slate-700">{selectedDay?.date || (startDate ? '기준일 자동 계산' : '미정')}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">주요 일정</dt><dd className="font-black text-slate-700">{selectedDay?.activities.length || 0}개</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">숙소</dt><dd className="truncate font-black text-slate-700">{dailyAccommodations?.find(item => item.day === selectedDay?.day)?.accommodation?.name || selectedDay?.accommodation?.name || '미정'}</dd></div>
                                </dl>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200 p-3">
                                <p className="text-xs font-black text-slate-800">포함·불포함</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg bg-emerald-50 p-2 text-center">
                                        <p className="text-[9px] font-bold text-emerald-600">포함 사항</p>
                                        <p className="mt-1 text-lg font-black text-emerald-700">{includedCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-rose-50 p-2 text-center">
                                        <p className="text-[9px] font-bold text-rose-500">불포함 사항</p>
                                        <p className="mt-1 text-lg font-black text-rose-600">{excludedCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {onAssignGuide && <button onClick={onAssignGuide} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-black text-slate-700 hover:border-[#3182F6]">
                                    <span className="material-symbols-outlined text-[18px] text-[#3182F6]">badge</span>{assignedGuide?.name || '담당 가이드 배정'}
                                </button>}
                                {onAssignAccommodation && selectedDay && <button onClick={() => onAssignAccommodation(selectedDay.day)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-black text-slate-700 hover:border-[#3182F6]">
                                    <span className="material-symbols-outlined text-[18px] text-[#3182F6]">hotel</span>DAY {selectedDay.day} 숙소 배정
                                </button>}
                            </div>
                        </aside>
                    </div>
                    )}
                </div>
            </div>

            {/* 마스터 픽커 — 편집기(z-210) 위에 표시 */}
            <TouristSpotPickerModal open={spotTarget !== null} onClose={() => setSpotTarget(null)} onPick={(spot) => { if (spotTarget) fillItemFromSpot(spotTarget.d, spotTarget.a, spot); setSpotTarget(null); }} />
            <HotelPickerModal open={hotelDayIdx !== null} onClose={() => setHotelDayIdx(null)} onPick={(hotel) => { if (hotelDayIdx !== null) fillDayFromHotel(hotelDayIdx, hotel); setHotelDayIdx(null); }} />
        </div>
    );
};
