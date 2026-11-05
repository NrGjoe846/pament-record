-- ============================================================================
-- SIMPLIFIED CUSTOMER / MEMBER SCHEMA FOR SUPABASE
-- Focuses strictly on essential customer payment tracking:
-- Name, Phone, Home Address, Monthly Due, Completed Amount, Balance Due, Ending Month
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old unused tables if they exist and replace with streamlined customer table
DROP TABLE IF EXISTS public.daily_closings CASCADE;
DROP TABLE IF EXISTS public.schemes CASCADE;
DROP TABLE IF EXISTS public.payment_allocations CASCADE;
DROP TABLE IF EXISTS public.prize_payouts CASCADE;
DROP TABLE IF EXISTS public.auction_rounds CASCADE;
DROP TABLE IF EXISTS public.scheme_members CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP SEQUENCE IF EXISTS receipt_seq CASCADE;

-- ============================================================================
-- 1. SIMPLIFIED CUSTOMERS / MEMBERS TABLE
-- ============================================================================
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    home_address TEXT,
    
    -- Financial Commitment & Progress
    monthly_due NUMERIC(14,2) NOT NULL DEFAULT 5000.00,       -- How much they should pay per month
    total_target NUMERIC(14,2) NOT NULL DEFAULT 100000.00,     -- Total commitment (e.g. 20 months * 5000 = 100k)
    total_paid NUMERIC(14,2) NOT NULL DEFAULT 0.00,           -- Currently completed amount
    balance_due NUMERIC(14,2) GENERATED ALWAYS AS (GREATEST(0.00, total_target - total_paid)) STORED, -- Balance remaining
    
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ending_month DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '20 months'), -- Ending month / completion date
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulter')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. PAYMENTS TABLE (Linked directly to each customer)
-- ============================================================================
CREATE SEQUENCE receipt_seq START WITH 1001;

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) DEFAULT 'cash',
    notes TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Field Agent',
    is_reversed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update member's completed amount & balance whenever a cash payment is saved
CREATE OR REPLACE FUNCTION public.sync_member_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.members
        SET total_paid = total_paid + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.member_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.members
        SET total_paid = GREATEST(0.00, total_paid - OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_member_payment ON public.payments;
CREATE TRIGGER trg_sync_member_payment
AFTER INSERT OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_member_payment_totals();

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY & PERMISSIONS
-- ============================================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all members" ON public.members FOR ALL USING (true);
CREATE POLICY "Allow public all payments" ON public.payments FOR ALL USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 4. INITIAL REALISTIC CUSTOMER DATA (With exactly the requested fields)
-- ============================================================================
INSERT INTO public.members (name, phone, home_address, monthly_due, total_target, total_paid, start_date, ending_month)
VALUES 
    ('Ramesh Kumar', '+91 98765 43210', 'No. 14, Gandhi Street, T. Nagar, Chennai - 600017', 5000.00, 100000.00, 35000.00, '2026-01-01', '2027-08-31'),
    ('Suresh Perumal', '+91 98765 43211', 'Plot 42, Anna Nagar 2nd Avenue, Chennai - 600040', 5000.00, 100000.00, 45000.00, '2026-01-01', '2027-08-31'),
    ('Priya Sharma', '+91 98765 43212', '7A, Lake View Road, West Mambalam, Chennai - 600033', 5000.00, 100000.00, 20000.00, '2026-01-01', '2027-08-31'),
    ('Murugan K.', '+91 98765 43213', '23/4, Bazaar Road, Mylapore, Chennai - 600004', 5000.00, 100000.00, 15000.00, '2026-01-01', '2027-08-31'),
    ('Hannah Jones', '+91 98765 43214', 'Flat 302, Green Park Apts, Velachery, Chennai - 600042', 5000.00, 100000.00, 50000.00, '2026-01-01', '2027-08-31');

COMMIT;

