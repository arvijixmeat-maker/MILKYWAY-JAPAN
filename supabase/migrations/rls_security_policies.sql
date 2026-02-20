-- ================================================================
-- Supabase RLS (Row Level Security) 정책 강화 스크립트
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ================================================================

-- ================================================================
-- 1. 기존 과도하게 허용된 정책 삭제
-- ================================================================

-- banners
DROP POLICY IF EXISTS "Authenticated write access" ON banners;
DROP POLICY IF EXISTS "Public read access" ON banners;
DROP POLICY IF EXISTS "Enable all for banners" ON banners;
DROP POLICY IF EXISTS "RLS Policy Always True" ON banners;

-- categories
DROP POLICY IF EXISTS "Enable all for categories" ON categories;
DROP POLICY IF EXISTS "Public read access" ON categories;
DROP POLICY IF EXISTS "RLS Policy Always True" ON categories;

-- magazines
DROP POLICY IF EXISTS "Enable all for magazines" ON magazines;
DROP POLICY IF EXISTS "Public read access" ON magazines;
DROP POLICY IF EXISTS "RLS Policy Always True" ON magazines;

-- guides
DROP POLICY IF EXISTS "Public write" ON guides;
DROP POLICY IF EXISTS "Public read access" ON guides;
DROP POLICY IF EXISTS "RLS Policy Always True" ON guides;

-- faqs
DROP POLICY IF EXISTS "Admin Write" ON faqs;
DROP POLICY IF EXISTS "Public read access" ON faqs;
DROP POLICY IF EXISTS "RLS Policy Always True" ON faqs;

-- faq_categories
DROP POLICY IF EXISTS "Admin Write Cat" ON faq_categories;
DROP POLICY IF EXISTS "Public read access" ON faq_categories;
DROP POLICY IF EXISTS "RLS Policy Always True" ON faq_categories;

-- quick_links
DROP POLICY IF EXISTS "Enable all for quick_links" ON quick_links;
DROP POLICY IF EXISTS "RLS Policy Always True" ON quick_links;

-- products
DROP POLICY IF EXISTS "Enable all for products" ON products;
DROP POLICY IF EXISTS "Public read access" ON products;
DROP POLICY IF EXISTS "RLS Policy Always True" ON products;

-- quotes
DROP POLICY IF EXISTS "Enable all for quotes" ON quotes;
DROP POLICY IF EXISTS "RLS Policy Always True" ON quotes;

-- reservations
DROP POLICY IF EXISTS "Enable all for reservations" ON reservations;
DROP POLICY IF EXISTS "RLS Policy Always True" ON reservations;

-- reviews
DROP POLICY IF EXISTS "Enable all for reviews" ON reviews;
DROP POLICY IF EXISTS "RLS Policy Always True" ON reviews;

-- event_banners
DROP POLICY IF EXISTS "Enable all for event_banners" ON event_banners;
DROP POLICY IF EXISTS "RLS Policy Always True" ON event_banners;

-- accommodations
DROP POLICY IF EXISTS "Enable all for accommodations" ON accommodations;
DROP POLICY IF EXISTS "RLS Policy Always True" ON accommodations;

-- ================================================================
-- 2. 새로운 보안 정책 생성
-- ================================================================

-- ==================== BANNERS ====================
CREATE POLICY "Anyone can read banners"
ON banners FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify banners"
ON banners FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update banners"
ON banners FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete banners"
ON banners FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== CATEGORIES ====================
CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify categories"
ON categories FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update categories"
ON categories FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete categories"
ON categories FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== MAGAZINES ====================
CREATE POLICY "Anyone can read magazines"
ON magazines FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify magazines"
ON magazines FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update magazines"
ON magazines FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete magazines"
ON magazines FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== GUIDES ====================
CREATE POLICY "Anyone can read guides"
ON guides FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify guides"
ON guides FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update guides"
ON guides FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete guides"
ON guides FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== FAQS ====================
CREATE POLICY "Anyone can read faqs"
ON faqs FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify faqs"
ON faqs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update faqs"
ON faqs FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete faqs"
ON faqs FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== FAQ_CATEGORIES ====================
CREATE POLICY "Anyone can read faq_categories"
ON faq_categories FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify faq_categories"
ON faq_categories FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update faq_categories"
ON faq_categories FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete faq_categories"
ON faq_categories FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== QUICK_LINKS ====================
CREATE POLICY "Anyone can read quick_links"
ON quick_links FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify quick_links"
ON quick_links FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update quick_links"
ON quick_links FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete quick_links"
ON quick_links FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== PRODUCTS ====================
CREATE POLICY "Anyone can read products"
ON products FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify products"
ON products FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update products"
ON products FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete products"
ON products FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== EVENT_BANNERS ====================
CREATE POLICY "Anyone can read event_banners"
ON event_banners FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify event_banners"
ON event_banners FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update event_banners"
ON event_banners FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete event_banners"
ON event_banners FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== ACCOMMODATIONS ====================
CREATE POLICY "Anyone can read accommodations"
ON accommodations FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify accommodations"
ON accommodations FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update accommodations"
ON accommodations FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete accommodations"
ON accommodations FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== QUOTES ====================
-- 모든 사용자가 견적 요청 가능 (비로그인 포함)
CREATE POLICY "Anyone can read quotes"
ON quotes FOR SELECT
USING (true);

CREATE POLICY "Anyone can create quotes"
ON quotes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can update quotes"
ON quotes FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete quotes"
ON quotes FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== RESERVATIONS ====================
-- 모든 사용자가 예약 가능
CREATE POLICY "Anyone can read reservations"
ON reservations FOR SELECT
USING (true);

CREATE POLICY "Anyone can create reservations"
ON reservations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can update reservations"
ON reservations FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete reservations"
ON reservations FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== REVIEWS ====================
CREATE POLICY "Anyone can read reviews"
ON reviews FOR SELECT
USING (true);

CREATE POLICY "Anyone can create reviews"
ON reviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can update reviews"
ON reviews FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete reviews"
ON reviews FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ==================== SETTINGS ====================
CREATE POLICY "Anyone can read settings"
ON settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify settings"
ON settings FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update settings"
ON settings FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete settings"
ON settings FOR DELETE
USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================================
-- 완료!
-- ================================================================
