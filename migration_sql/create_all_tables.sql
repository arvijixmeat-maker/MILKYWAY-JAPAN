-- =============================================
-- Milkyway Japan - Complete D1 Schema
-- =============================================

-- Users & Sessions (already created)
-- CREATE TABLE IF NOT EXISTS users (...)
-- CREATE TABLE IF NOT EXISTS sessions (...)

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price REAL DEFAULT 0,
    images TEXT DEFAULT '[]',
    thumbnail TEXT,
    status TEXT DEFAULT 'active',
    featured INTEGER DEFAULT 0,
    popular INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    reservation_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'tour',
    product_name TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    travelers INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'pending',
    total_price REAL DEFAULT 0,
    deposit_amount REAL DEFAULT 0,
    balance_amount REAL DEFAULT 0,
    payment_method TEXT,
    daily_accommodations TEXT DEFAULT '[]',
    notes TEXT,
    history TEXT DEFAULT '[]',
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    travel_type TEXT,
    destination TEXT,
    travelers INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    budget TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    confirmed_price REAL DEFAULT 0,
    confirmed_deposit REAL DEFAULT 0,
    confirmed_balance REAL DEFAULT 0,
    user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    image TEXT,
    tag TEXT,
    title TEXT,
    subtitle TEXT,
    link TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Quick Links
CREATE TABLE IF NOT EXISTS quick_links (
    id TEXT PRIMARY KEY,
    icon TEXT,
    image TEXT,
    label TEXT,
    path TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Event Banners
CREATE TABLE IF NOT EXISTS event_banners (
    id TEXT PRIMARY KEY,
    image TEXT,
    background_color TEXT DEFAULT '#0F766E',
    tag TEXT,
    title TEXT,
    icon TEXT,
    link TEXT,
    location TEXT DEFAULT 'all',
    sort_order INTEGER DEFAULT 0
);

-- Category Tabs
CREATE TABLE IF NOT EXISTS category_tabs (
    id TEXT PRIMARY KEY,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    banner_image TEXT,
    sort_order INTEGER DEFAULT 0
);

-- FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    product_id TEXT,
    product_name TEXT,
    rating INTEGER DEFAULT 5,
    title TEXT,
    content TEXT,
    images TEXT DEFAULT '[]',
    is_approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Travel Guides
CREATE TABLE IF NOT EXISTS travel_guides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    content TEXT,
    thumbnail TEXT,
    category TEXT,
    tags TEXT DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Travel Mates
CREATE TABLE IF NOT EXISTS travel_mates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    title TEXT NOT NULL,
    content TEXT,
    destination TEXT,
    travel_date TEXT,
    max_members INTEGER DEFAULT 4,
    current_members INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    image TEXT,
    start_date TEXT,
    end_date TEXT,
    duration TEXT,
    recruit_count INTEGER DEFAULT 1,
    gender TEXT DEFAULT 'any',
    age_groups TEXT DEFAULT '[]',
    region TEXT,
    styles TEXT DEFAULT '[]',
    author_info TEXT,
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    author_name TEXT,
    author_image TEXT,
    description TEXT
);

-- Magazines
CREATE TABLE IF NOT EXISTS magazines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    content TEXT,
    thumbnail TEXT,
    category TEXT,
    author TEXT,
    is_published INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Accommodations
CREATE TABLE IF NOT EXISTS accommodations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    price_per_night REAL DEFAULT 0,
    images TEXT DEFAULT '[]',
    thumbnail TEXT,
    amenities TEXT DEFAULT '[]',
    rating REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Categories (Product Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- Settings (Key-Value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    title TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    user1_id TEXT,
    user2_id TEXT,
    last_message TEXT,
    last_message_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES chat_rooms(id),
    sender_id TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
