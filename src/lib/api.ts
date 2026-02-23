const API_BASE = '/api';

async function request(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export const api = {
    auth: {
        me: async () => {
            const res = await fetch(`${API_BASE}/auth/me`);
            return res.json();
        },
        login: async (email: string, password: string) => {
            return request(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
        },
        logout: async () => {
            return request(`${API_BASE}/auth/logout`, { method: 'POST' });
        }
    },
    products: {
        list: async () => request(`${API_BASE}/products`),
        get: async (id: string) => request(`${API_BASE}/products/${id}`),
        create: async (data: any) => request(`${API_BASE}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/products/${id}`, { method: 'DELETE' }),
    },
    reservations: {
        list: async () => request(`${API_BASE}/reservations`),
        get: async (id: string) => request(`${API_BASE}/reservations/${id}`),
        create: async (data: any) => request(`${API_BASE}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/reservations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/reservations/${id}`, { method: 'DELETE' }),
    },
    quotes: {
        list: async () => request(`${API_BASE}/quotes`),
        get: async (id: string) => request(`${API_BASE}/quotes/${id}`),
        create: async (data: any) => request(`${API_BASE}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/quotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/quotes/${id}`, { method: 'DELETE' }),
    },
    banners: {
        get: async () => request(`${API_BASE}/banners`),
        save: async (data: any) => request(`${API_BASE}/banners`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    settings: {
        get: async (key?: string) => request(`${API_BASE}/settings${key ? `?key=${key}` : ''}`),
        save: async (key: string, value: any) => request(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        }),
    },
    faqs: {
        list: async () => request(`${API_BASE}/faqs`),
        create: async (data: any) => request(`${API_BASE}/faqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/faqs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/faqs/${id}`, { method: 'DELETE' }),
        bulkSave: async (faqs: any[]) => request(`${API_BASE}/faqs/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ faqs })
        }),
    },
    faqCategories: {
        list: async () => request(`${API_BASE}/faq-categories`),
        create: async (data: any) => request(`${API_BASE}/faq-categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/faq-categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/faq-categories/${id}`, { method: 'DELETE' }),
    },
    reviews: {
        list: async () => request(`${API_BASE}/reviews`),
        get: async (id: string) => request(`${API_BASE}/reviews/${id}`),
        create: async (data: any) => request(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/reviews/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/reviews/${id}`, { method: 'DELETE' }),
    },
    guides: {
        list: async () => request(`${API_BASE}/guides`),
        get: async (id: string) => request(`${API_BASE}/guides/${id}`),
        create: async (data: any) => request(`${API_BASE}/guides`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/guides/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/guides/${id}`, { method: 'DELETE' }),
        save: async (data: any[]) => request(`${API_BASE}/guides/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guides: data })
        }),
    },
    magazines: {
        list: async () => request(`${API_BASE}/magazines`),
        get: async (id: string) => request(`${API_BASE}/magazines/${id}`),
        create: async (data: any) => request(`${API_BASE}/magazines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/magazines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/magazines/${id}`, { method: 'DELETE' }),
    },
    accommodations: {
        list: async () => request(`${API_BASE}/accommodations`),
        get: async (id: string) => request(`${API_BASE}/accommodations/${id}`),
        create: async (data: any) => request(`${API_BASE}/accommodations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/accommodations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/accommodations/${id}`, { method: 'DELETE' }),
        save: async (data: any[]) => request(`${API_BASE}/accommodations/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accommodations: data })
        }),
    },
    categories: {
        list: async (type?: string) => request(`${API_BASE}/categories${type ? `?type=${type}` : ''}`),
        create: async (data: any) => request(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/categories/${id}`, { method: 'DELETE' }),
        bulkSave: async (categories: any[]) => request(`${API_BASE}/categories/bulk`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories })
        }),
    },
    notifications: {
        sendEmail: async (to: string, type: string, data: any) => {
            return request('/api/notifications/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, type, data })
            });
        },
        list: async () => request(`${API_BASE}/notifications`),
        update: async (id: string, data: any) => request(`${API_BASE}/notifications/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    travelMates: {
        list: async () => request(`${API_BASE}/travel-mates`),
        get: async (id: string) => request(`${API_BASE}/travel-mates/${id}`),
        create: async (data: any) => request(`${API_BASE}/travel-mates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        update: async (id: string, data: any) => request(`${API_BASE}/travel-mates/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        delete: async (id: string) => request(`${API_BASE}/travel-mates/${id}`, { method: 'DELETE' }),
    },
    chats: {
        list: async () => request(`${API_BASE}/chats`),
        get: async (id: string) => request(`${API_BASE}/chats/${id}`),
        create: async (data: any) => request(`${API_BASE}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    messages: {
        list: async (roomId: string) => request(`${API_BASE}/messages?room_id=${roomId}`),
        create: async (data: any) => request(`${API_BASE}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    quickLinks: {
        list: async () => request(`${API_BASE}/quick-links`),
    },
    eventBanners: {
        list: async () => request(`${API_BASE}/event-banners`),
    },
    recentlyViewed: {
        list: async () => request(`${API_BASE}/recently-viewed`),
        upsert: async (data: any) => request(`${API_BASE}/recently-viewed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    wishlist: {
        list: async () => request(`${API_BASE}/wishlist`),
        add: async (data: any) => request(`${API_BASE}/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
        remove: async (id: string) => request(`${API_BASE}/wishlist/${id}`, { method: 'DELETE' }),
    },
    storage: {
        upload: async (file: File, bucket: string = 'milkyway-assets', folder: string = 'uploads') => {
            // TODO: Implement R2 upload
            console.log('Upload not implemented yet');
            return 'https://placehold.co/600x400';
        }
    },
};
