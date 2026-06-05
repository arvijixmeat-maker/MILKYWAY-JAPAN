import { Hono } from 'hono';

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

const DOC_SETTINGS_MARKER = '\n\n__MILKYWAY_DOCUMENT_SETTINGS__=';

const decodeTemplateDescription = (raw = '') => {
    const [description, encoded] = String(raw || '').split(DOC_SETTINGS_MARKER);
    if (!encoded) return { description: raw || '', documentSettings: null };
    try {
        return { description, documentSettings: JSON.parse(encoded) };
    } catch {
        return { description, documentSettings: null };
    }
};

// GET /api/documents/itinerary/:reservationId
// Public endpoint — no auth. Returns everything the itinerary page needs.
app.get('/itinerary/:reservationId', async (c) => {
    const reservationId = c.req.param('reservationId');
    const db = c.env.DB;

    const reservation = await db.prepare(
        'SELECT * FROM reservations WHERE id = ? OR reservation_number = ?'
    ).bind(reservationId, reservationId).first();

    if (!reservation) {
        return c.json({ error: 'Reservation not found' }, 404);
    }

    // Parse JSON fields
    let dailyAccommodations: any[] = [];
    try {
        dailyAccommodations = reservation.daily_accommodations ? JSON.parse(reservation.daily_accommodations) : [];
    } catch { dailyAccommodations = []; }

    let assignedGuide: any = null;
    try {
        assignedGuide = reservation.assigned_guide ? JSON.parse(reservation.assigned_guide) : null;
    } catch { assignedGuide = null; }

    // Fetch itinerary template (if selected)
    let template: any = null;
    if (reservation.itinerary_template_id) {
        const t: any = await db.prepare(
            'SELECT * FROM itinerary_templates WHERE id = ?'
        ).bind(reservation.itinerary_template_id).first();
        if (t) {
            let days: any[] = [];
            try { days = t.days ? JSON.parse(t.days) : []; } catch { days = []; }
            const decoded = decodeTemplateDescription(t.description || '');
            template = {
                id: t.id,
                name: t.name,
                description: decoded.description,
                documentSettings: decoded.documentSettings,
                days,
            };
        }
    }

    // Compute day-by-day merged view
    const mergedDays = (template?.days || []).map((tday: any, idx: number) => {
        const dayNumber = tday.day || idx + 1;
        const accommodation = dailyAccommodations.find((d: any) => d.day === dayNumber)?.accommodation || null;
        return {
            day: dayNumber,
            title: tday.title || '',
            region: tday.region || '',
            activities: Array.isArray(tday.activities) ? tday.activities : [],
            accommodation,
        };
    });

    // If template has fewer days than accommodations, pad with accommodation-only rows
    if (dailyAccommodations.length > mergedDays.length) {
        for (let d = mergedDays.length + 1; d <= dailyAccommodations.length; d++) {
            const accommodation = dailyAccommodations.find((x: any) => x.day === d)?.accommodation || null;
            if (accommodation) mergedDays.push({ day: d, title: '', activities: [], accommodation });
        }
    }

    return c.json({
        reservation: {
            id: reservation.id,
            reservationNumber: reservation.reservation_number,
            productName: reservation.product_name,
            customerName: reservation.customer_name,
            customerEmail: reservation.customer_email,
            travelers: reservation.travelers,
            startDate: reservation.start_date,
            endDate: reservation.end_date,
            status: reservation.status,
        },
        template,
        guide: assignedGuide,
        days: mergedDays,
    });
});

// GET /api/documents/contract/:reservationId — public
app.get('/contract/:reservationId', async (c) => {
    const reservationId = c.req.param('reservationId');
    const db = c.env.DB;

    const reservation = await db.prepare(
        'SELECT * FROM reservations WHERE id = ? OR reservation_number = ?'
    ).bind(reservationId, reservationId).first();

    if (!reservation) {
        return c.json({ error: 'Reservation not found' }, 404);
    }

    let contractData: any = {};
    try { contractData = reservation.contract_data ? JSON.parse(reservation.contract_data) : {}; } catch { contractData = {}; }

    let dailyAccommodations: any[] = [];
    try { dailyAccommodations = reservation.daily_accommodations ? JSON.parse(reservation.daily_accommodations) : []; } catch { dailyAccommodations = []; }

    let assignedGuide: any = null;
    try { assignedGuide = reservation.assigned_guide ? JSON.parse(reservation.assigned_guide) : null; } catch { assignedGuide = null; }

    let template: any = null;
    if (reservation.itinerary_template_id) {
        const t: any = await db.prepare(
            'SELECT * FROM itinerary_templates WHERE id = ?'
        ).bind(reservation.itinerary_template_id).first();
        if (t) {
            const decoded = decodeTemplateDescription(t.description || '');
            template = {
                id: t.id,
                name: t.name,
                description: decoded.description,
                documentSettings: decoded.documentSettings,
            };
        }
    }

    return c.json({
        reservation: {
            id: reservation.id,
            reservationNumber: reservation.reservation_number,
            productName: reservation.product_name,
            customerName: reservation.customer_name,
            customerEmail: reservation.customer_email,
            customerPhone: reservation.customer_phone,
            travelers: reservation.travelers,
            startDate: reservation.start_date,
            endDate: reservation.end_date,
            status: reservation.status,
            totalPrice: reservation.total_price,
            depositAmount: reservation.deposit_amount,
            balanceAmount: reservation.balance_amount,
            createdAt: reservation.created_at,
        },
        contract: contractData,
        template,
        accommodations: dailyAccommodations,
        guide: assignedGuide,
    });
});

// POST /api/documents/contract/:reservationId/customer — public (link-based)
// 고객이 계약서에서 직접 입력한 여권정보 + 온라인 동의를 저장
app.post('/contract/:reservationId/customer', async (c) => {
    const reservationId = c.req.param('reservationId');
    const db = c.env.DB;

    const reservation: any = await db.prepare(
        'SELECT * FROM reservations WHERE id = ? OR reservation_number = ?'
    ).bind(reservationId, reservationId).first();

    if (!reservation) {
        return c.json({ error: 'Reservation not found' }, 404);
    }

    let body: any = {};
    try { body = await c.req.json(); } catch { body = {}; }

    let contractData: any = {};
    try { contractData = reservation.contract_data ? JSON.parse(reservation.contract_data) : {}; } catch { contractData = {}; }

    // 여행자 여권정보(고객 입력)와 동의 정보만 병합 — 관리자가 입력한 일정/항공편 등은 유지
    if (Array.isArray(body.travelers)) {
        contractData.travelers = body.travelers.map((t: any) => ({
            name: t.name || '',
            passportName: t.passportName || '',
            birthdate: t.birthdate || '',
            gender: t.gender || '',
            phone: t.phone || '',
        }));
    }
    if (body.agreement && body.agreement.agreed) {
        contractData.agreement = {
            agreed: true,
            name: body.agreement.name || '',
            agreedAt: body.agreement.agreedAt || new Date().toISOString(),
        };
    }
    contractData.customerSubmittedAt = new Date().toISOString();

    await db.prepare(
        'UPDATE reservations SET contract_data = ? WHERE id = ?'
    ).bind(JSON.stringify(contractData), reservation.id).run();

    return c.json({ success: true, contract: contractData });
});

export default app;
