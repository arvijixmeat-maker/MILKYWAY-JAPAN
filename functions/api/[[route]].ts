import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

const app = new Hono().basePath('/api');

app.get('/', (c) => {
    return c.json({ message: 'Hello from Hono on Cloudflare Pages!' });
});

// TODO: Add other routes

import products from './products';
import reservations from './reservations';
import auth from './auth';
import emailNotifications from './notifications/email';
import notifications from './notifications/index';

app.route('/api/products', products);
app.route('/api/reservations', reservations);
app.route('/api/auth', auth);
app.route('/api/notifications/email', emailNotifications);
app.route('/api/notifications', notifications);

export const onRequest = handle(app);
