const API_BASE = '/api';

export const api = {
    auth: {
        me: async () => {
            const res = await fetch(`${API_BASE}/auth/me`);
            return res.json();
        },
        logout: async () => {
            const res = await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
            return res.json();
        }
    },
    products: {
        list: async () => {
            const res = await fetch(`${API_BASE}/products`);
            if (!res.ok) throw new Error('Failed to fetch products');
            return res.json();
        },
        get: async (id: string) => {
            const res = await fetch(`${API_BASE}/products/${id}`);
            if (!res.ok) throw new Error('Failed to fetch product');
            return res.json();
        }
    },
    reservations: {
        list: async () => {
            const res = await fetch(`${API_BASE}/reservations`);
            if (!res.ok) throw new Error('Failed to fetch reservations');
            return res.json();
        },
        get: async (id: string) => {
            const res = await fetch(`${API_BASE}/reservations/${id}`);
            if (!res.ok) throw new Error('Failed to fetch reservation');
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${API_BASE}/reservations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create reservation');
            }
            return res.json();
        }
    },
    // Storage
    storage: {
        upload: async (file: File, bucket: string = 'milkyway-assets', folder: string = 'uploads') => {
            // TODO: Implement R2 upload via API or Signed URL
            console.log('Upload not implemented yet');
            return 'https://placehold.co/600x400';
        }
    },
    // Notifications
    notifications: {
        sendEmail: async (to: string, type: string, data: any) => {
            const response = await fetch('/api/notifications/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, type, data })
            });
            if (!response.ok) throw new Error('Failed to send email');
            return response.json();
        }
    },
    // Quotes
    quotes: {
        list: async () => {
            const response = await fetch(`${API_BASE}/quotes`);
            if (!response.ok) throw new Error('Failed to fetch quotes');
            return response.json();
        },
        update: async (id: string, data: any) => {
            const response = await fetch(`${API_BASE}/quotes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update quote');
            return response.json();
        },
        delete: async (id: string) => {
            const response = await fetch(`${API_BASE}/quotes/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete quote');
            return response.json();
        }
    },
    // Guides
    guides: {
        list: async () => {
            // Placeholder: Returning empty array until backend endpoint is ready
            // const response = await fetch(`${API_BASE}/guides`);
            // if (!response.ok) throw new Error('Failed to fetch guides');
            // return response.json();
            return [];
        },
        get: async (id: string) => {
            const response = await fetch(`${API_BASE}/guides/${id}`);
            if (!response.ok) throw new Error('Failed to fetch guide');
            return response.json();
        },
        create: async (data: any) => {
            const response = await fetch(`${API_BASE}/guides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create guide');
            return response.json();
        },
        update: async (id: string, data: any) => {
            const response = await fetch(`${API_BASE}/guides/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to update guide');
            return response.json();
        },
        delete: async (id: string) => {
            const response = await fetch(`${API_BASE}/guides/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete guide');
            return response.json();
        }
    },
};
