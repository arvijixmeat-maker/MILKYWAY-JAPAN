import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

const app = new Hono().basePath('/api');

app.get('/', (c) => {
    return c.json({ message: 'Milkyway Japan API' });
});

// Import route modules
import products from './products';
import reservations from './reservations';
import auth from './auth';
import emailNotifications from './notifications/email';
import notifications from './notifications/index';
import banners from './banners';
import settings from './settings';
import faqs from './faqs';
import reviews from './reviews';
import magazines from './magazines';
import accommodations from './accommodations';
import categories from './categories';
import guides from './guides';
import quotes from './quotes';
import upload from './upload';
import images from './images/[...path]';
import quickLinks from './quick-links';
import eventBanners from './event-banners';
import migrateDb from './migrate-db';
import wishlist from './wishlist';
import recentlyViewed from './recently-viewed';

// Register routes
app.route('/products', products);
app.route('/reservations', reservations);
app.route('/auth', auth);
app.route('/notifications/email', emailNotifications);
app.route('/notifications', notifications);
app.route('/banners', banners);
app.route('/settings', settings);
app.route('/faqs', faqs);
app.route('/reviews', reviews);
app.route('/magazines', magazines);
app.route('/accommodations', accommodations);
app.route('/categories', categories);
app.route('/guides', guides);
app.route('/quotes', quotes);
app.route('/upload', upload);
app.route('/images', images);
app.route('/quick-links', quickLinks);
app.route('/event-banners', eventBanners);
app.route('/migrate-db', migrateDb);
app.route('/wishlist', wishlist);
app.route('/recently-viewed', recentlyViewed);

export const onRequest = handle(app);
