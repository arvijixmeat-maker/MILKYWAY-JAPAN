-- ================================================================
-- Reservations 테이블 컬럼 보강 스크립트
-- Payment.tsx에서 사용하는 컬럼들이 누락되었을 경우를 대비합니다.
-- Supabase 대시보드 > SQL Editor에서 실행하세요.
-- ================================================================

-- 1. JSONB 컬럼 추가 (고객정보, 가격정보, 계좌정보)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'customer_info') THEN
        ALTER TABLE reservations ADD COLUMN customer_info JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'price_breakdown') THEN
        ALTER TABLE reservations ADD COLUMN price_breakdown JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'bank_account') THEN
        ALTER TABLE reservations ADD COLUMN bank_account JSONB;
    END IF;
END $$;

-- 2. 일반 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'product_id') THEN
        ALTER TABLE reservations ADD COLUMN product_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'user_id') THEN
        ALTER TABLE reservations ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'total_people') THEN
        ALTER TABLE reservations ADD COLUMN total_people INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'duration') THEN
        ALTER TABLE reservations ADD COLUMN duration TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'product_name') THEN
        ALTER TABLE reservations ADD COLUMN product_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'type') THEN
        ALTER TABLE reservations ADD COLUMN type TEXT DEFAULT 'tour';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'status') THEN
        ALTER TABLE reservations ADD COLUMN status TEXT DEFAULT 'pending_payment';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'start_date') THEN
        ALTER TABLE reservations ADD COLUMN start_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'end_date') THEN
        ALTER TABLE reservations ADD COLUMN end_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'created_at') THEN
        ALTER TABLE reservations ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'updated_at') THEN
        ALTER TABLE reservations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Admin Update Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'deposit_status') THEN
        ALTER TABLE reservations ADD COLUMN deposit_status TEXT DEFAULT 'unpaid';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'balance_status') THEN
        ALTER TABLE reservations ADD COLUMN balance_status TEXT DEFAULT 'unpaid';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'contract_url') THEN
        ALTER TABLE reservations ADD COLUMN contract_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'itinerary_url') THEN
        ALTER TABLE reservations ADD COLUMN itinerary_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'assigned_guide') THEN
        ALTER TABLE reservations ADD COLUMN assigned_guide JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'daily_accommodations') THEN
        ALTER TABLE reservations ADD COLUMN daily_accommodations JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'history') THEN
        ALTER TABLE reservations ADD COLUMN history JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'are_assignments_visible_to_user') THEN
        ALTER TABLE reservations ADD COLUMN are_assignments_visible_to_user BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ================================================================
-- 완료!
-- ================================================================
