-- ============================================================================
-- AI CHIT FUND & CASH PAYMENT MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Schema (Self-Cleaning Version)
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. CLEANUP OLD TABLES FROM PREVIOUS PROJECT (Fixes column mismatch errors)
-- ============================================================================
DROP TABLE IF EXISTS public.payment_allocations CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.prize_payouts CASCADE;
DROP TABLE IF EXISTS public.auction_rounds CASCADE;
DROP TABLE IF EXISTS public.scheme_members CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.schemes CASCADE;
DROP TABLE IF EXISTS public.daily_closings CASCADE;
DROP SEQUENCE IF EXISTS receipt_seq CASCADE;

-- ============================================================================
-- 1. SCHEMES TABLE (Chit Scheme Register)
-- ============================================================================
CREATE TABLE public.schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_code VARCHAR(50) UNIQUE NOT NULL,            -- e.g. "LAK-100K-20M"
    scheme_name VARCHAR(100) NOT NULL,                  -- e.g. "Lakshmi 1 Lakh 20 Months"
    chit_value NUMERIC(14,2) NOT NULL CHECK (chit_value > 0), -- e.g. 100000.00
    duration_months INT NOT NULL CHECK (duration_months > 0),  -- e.g. 20
    gross_subscription NUMERIC(14,2) NOT NULL,          -- e.g. 5000.00
    foreman_commission_rate NUMERIC(5,4) DEFAULT 0.0500 CHECK (foreman_commission_rate <= 0.0700), -- 5% legal cap
    current_cycle INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'terminated')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. MEMBERS TABLE (Registered Members & Guarantors)
-- ============================================================================
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20),
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(50),
    address TEXT,
    
    -- Guarantor Info (Required for prized members)
    guarantor_name VARCHAR(100),
    guarantor_phone VARCHAR(20),
    guarantor_relation VARCHAR(50),
    guarantor_address TEXT,
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'defaulter', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. SCHEME MEMBERS (Tokens & Prized Status)
-- ============================================================================
CREATE TABLE public.scheme_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    token_number INT NOT NULL,                          -- Token 1 to 20
    is_prized BOOLEAN DEFAULT FALSE,
    prized_cycle INT,
    prized_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, token_number),
    UNIQUE(scheme_id, member_id)
);

-- ============================================================================
-- 4. AUCTION ROUNDS (Dynamic Monthly Dividends & Net Payable)
-- ============================================================================
CREATE TABLE public.auction_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
    cycle_number INT NOT NULL,
    auction_date DATE NOT NULL,
    
    winning_bid NUMERIC(14,2) NOT NULL CHECK (winning_bid >= 0),
    foreman_commission NUMERIC(14,2) NOT NULL,          -- 5% capped
    net_dividend_pool NUMERIC(14,2) NOT NULL,           -- Bid - Commission
    dividend_per_member NUMERIC(14,2) NOT NULL,         -- Pool / total members
    gross_subscription NUMERIC(14,2) NOT NULL,          -- Monthly target
    net_payable NUMERIC(14,2) NOT NULL,                 -- Dynamic payable per member
    
    winning_member_id UUID REFERENCES public.members(id),
    prize_amount NUMERIC(14,2) NOT NULL,                -- Chit value - Bid
    
    is_closed BOOLEAN DEFAULT FALSE,                    -- Month-end locking
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scheme_id, cycle_number)
);

-- ============================================================================
-- 5. PRIZE PAYOUTS (Money Going Out - Winner Disbursement)
-- ============================================================================
CREATE TABLE public.prize_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_round_id UUID NOT NULL REFERENCES public.auction_rounds(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    gross_prize_amount NUMERIC(14,2) NOT NULL,
    deductions NUMERIC(14,2) DEFAULT 0.00,
    net_payout NUMERIC(14,2) NOT NULL,
    disbursement_date DATE NOT NULL,
    payment_mode VARCHAR(30) DEFAULT 'cheque' CHECK (payment_mode IN ('cash', 'cheque', 'neft', 'rtgs')),
    reference_number VARCHAR(100),
    
    guarantor_agreement_signed BOOLEAN DEFAULT FALSE,
    promissory_notes_collected BOOLEAN DEFAULT FALSE,
    security_cheques_collected BOOLEAN DEFAULT FALSE,
    documents_verified_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SEQUENTIAL RECEIPTS & CASH PAYMENTS
-- ============================================================================
CREATE SEQUENCE receipt_seq START WITH 1001;

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,         -- e.g. "RCT-2026-01001"
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    scheme_id UUID REFERENCES public.schemes(id),
    
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'cheque')),
    notes TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Field Agent',
    
    is_reversed BOOLEAN DEFAULT FALSE,
    reversal_reason TEXT,
    reversed_at TIMESTAMPTZ,
    reversed_by VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. PAYMENT ALLOCATIONS
-- ============================================================================
CREATE TABLE public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    auction_round_id UUID REFERENCES public.auction_rounds(id),
    allocated_amount NUMERIC(14,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_type VARCHAR(30) DEFAULT 'installment' CHECK (allocation_type IN ('installment', 'advance', 'late_fee')),
    cycle_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. DAILY CLOSINGS
-- ============================================================================
CREATE TABLE public.daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    closing_date DATE UNIQUE NOT NULL,
    total_cash_collected NUMERIC(14,2) DEFAULT 0.00,
    total_receipts INT NOT NULL DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. STORED POSTGRES FUNCTION: Atomic Auction Calculation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_auction_round(
    p_scheme_id UUID,
    p_cycle_number INT,
    p_winning_bid NUMERIC(14,2),
    p_winning_member_id UUID,
    p_auction_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
    v_scheme RECORD;
    v_total_members INT;
    v_commission NUMERIC(14,2);
    v_net_dividend_pool NUMERIC(14,2);
    v_dividend_per_member NUMERIC(14,2);
    v_net_payable NUMERIC(14,2);
    v_prize_amount NUMERIC(14,2);
    v_round_id UUID;
BEGIN
    SELECT * INTO v_scheme FROM public.schemes WHERE id = p_scheme_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheme not found';
    END IF;

    v_total_members := v_scheme.duration_months;
    v_commission := ROUND(v_scheme.chit_value * v_scheme.foreman_commission_rate, 2);
    v_net_dividend_pool := GREATEST(0.00, p_winning_bid - v_commission);
    v_dividend_per_member := ROUND(v_net_dividend_pool / v_total_members, 2);
    v_net_payable := v_scheme.gross_subscription - v_dividend_per_member;
    v_prize_amount := v_scheme.chit_value - p_winning_bid;

    INSERT INTO public.auction_rounds (
        scheme_id, cycle_number, auction_date,
        winning_bid, foreman_commission, net_dividend_pool,
        dividend_per_member, gross_subscription, net_payable,
        winning_member_id, prize_amount, is_closed, closed_at
    ) VALUES (
        p_scheme_id, p_cycle_number, p_auction_date,
        p_winning_bid, v_commission, v_net_dividend_pool,
        v_dividend_per_member, v_scheme.gross_subscription, v_net_payable,
        p_winning_member_id, v_prize_amount, TRUE, NOW()
    )
    ON CONFLICT (scheme_id, cycle_number) DO UPDATE SET
        winning_bid = EXCLUDED.winning_bid,
        foreman_commission = EXCLUDED.foreman_commission,
        net_dividend_pool = EXCLUDED.net_dividend_pool,
        dividend_per_member = EXCLUDED.dividend_per_member,
        net_payable = EXCLUDED.net_payable,
        prize_amount = EXCLUDED.prize_amount,
        winning_member_id = EXCLUDED.winning_member_id,
        is_closed = TRUE,
        closed_at = NOW()
    RETURNING id INTO v_round_id;

    IF p_winning_member_id IS NOT NULL THEN
        UPDATE public.scheme_members
        SET is_prized = TRUE, prized_cycle = p_cycle_number, prized_date = p_auction_date
        WHERE scheme_id = p_scheme_id AND member_id = p_winning_member_id;
    END IF;

    UPDATE public.schemes
    SET current_cycle = p_cycle_number + 1, updated_at = NOW()
    WHERE id = p_scheme_id;

    RETURN jsonb_build_object(
        'auction_round_id', v_round_id,
        'foreman_commission', v_commission,
        'dividend_per_member', v_dividend_per_member,
        'net_payable', v_net_payable,
        'prize_amount', v_prize_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all schemes" ON public.schemes FOR ALL USING (true);
CREATE POLICY "Allow public all members" ON public.members FOR ALL USING (true);
CREATE POLICY "Allow public all scheme_members" ON public.scheme_members FOR ALL USING (true);
CREATE POLICY "Allow public all auction_rounds" ON public.auction_rounds FOR ALL USING (true);
CREATE POLICY "Allow public all prize_payouts" ON public.prize_payouts FOR ALL USING (true);
CREATE POLICY "Allow public all payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow public all payment_allocations" ON public.payment_allocations FOR ALL USING (true);
CREATE POLICY "Allow public all daily_closings" ON public.daily_closings FOR ALL USING (true);

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- 12. INITIAL SEED DATA
-- ============================================================================
INSERT INTO public.schemes (scheme_code, scheme_name, chit_value, duration_months, gross_subscription, foreman_commission_rate, current_cycle)
VALUES ('LAK-100K-20M', 'Lakshmi Chit Scheme #1', 100000.00, 20, 5000.00, 0.0500, 4);

INSERT INTO public.members (full_name, phone, guarantor_name, guarantor_phone, guarantor_relation)
VALUES 
    ('Ramesh Kumar', '+919876543210', 'K. Selvam', '+919443211223', 'Brother'),
    ('Suresh Perumal', '+919876543211', 'M. Natarajan', '+919443211224', 'Uncle'),
    ('Priya Sharma', '+919876543212', 'R. Sharma', '+919443211225', 'Father'),
    ('Murugan K.', '+919876543213', 'S. Arumugam', '+919443211226', 'Friend'),
    ('Hannah Jones', '+919876543214', 'D. Jones', '+919443211227', 'Spouse');

COMMIT;
