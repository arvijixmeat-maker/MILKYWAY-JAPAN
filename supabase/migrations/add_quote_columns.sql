-- ================================================================
-- Quotes 테이블 컬럼 추가 스크립트
-- 견적 확정 시 필요한 날짜 및 확정 금액 컬럼을 추가합니다.
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ================================================================

DO $$
BEGIN
    -- 1. 여행 확정 시작일
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'confirmed_start_date') THEN
        ALTER TABLE quotes ADD COLUMN confirmed_start_date DATE;
    END IF;

    -- 2. 여행 확정 종료일
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'confirmed_end_date') THEN
        ALTER TABLE quotes ADD COLUMN confirmed_end_date DATE;
    END IF;

    -- 3. 확정 금액 (이미 존재할 수 있음)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'confirmed_price') THEN
        ALTER TABLE quotes ADD COLUMN confirmed_price NUMERIC;
    END IF;

    -- 4. 예약금 (이미 존재할 수 있음)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deposit') THEN
        ALTER TABLE quotes ADD COLUMN deposit NUMERIC;
    END IF;

    -- 5. 관리자 메모 (이미 존재할 수 있음)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'admin_note') THEN
        ALTER TABLE quotes ADD COLUMN admin_note TEXT;
    END IF;

    -- 6. 견적서 URL (이미 존재할 수 있음)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'estimate_url') THEN
        ALTER TABLE quotes ADD COLUMN estimate_url TEXT;
    END IF;

    -- 7. 예약금 입금 상태
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deposit_status') THEN
        ALTER TABLE quotes ADD COLUMN deposit_status TEXT DEFAULT 'unpaid';
    END IF;

    -- 8. 잔금 입금 상태
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'balance_status') THEN
        ALTER TABLE quotes ADD COLUMN balance_status TEXT DEFAULT 'unpaid';
    END IF;

END $$;
