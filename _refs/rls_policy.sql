-- ============================================
-- RLS Policy: Allow full access via anon key
-- Jalankan di Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor
-- ============================================

-- 1. Aktifkan RLS pada semua tabel (wajib agar policy bisa diterapkan)
ALTER TABLE public.ms_merk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_operator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_aksesoris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_kuota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_hp_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_hp_dtl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_hp_hdr_non_pajak ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_hp_dtl_non_pajak ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_cctv_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_cctv_dtl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trs_penjualan_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trs_penjualan_dtl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trs_pembelian_hdr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trs_pembelian_dtl ENABLE ROW LEVEL SECURITY;

-- 2. Buat policy "allow all" untuk anon & authenticated role
-- ms_merk
DROP POLICY IF EXISTS "allow_all_ms_merk" ON public.ms_merk;
CREATE POLICY "allow_all_ms_merk" ON public.ms_merk FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_operator
DROP POLICY IF EXISTS "allow_all_ms_operator" ON public.ms_operator;
CREATE POLICY "allow_all_ms_operator" ON public.ms_operator FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_supplier
DROP POLICY IF EXISTS "allow_all_ms_supplier" ON public.ms_supplier;
CREATE POLICY "allow_all_ms_supplier" ON public.ms_supplier FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_aksesoris
DROP POLICY IF EXISTS "allow_all_ms_aksesoris" ON public.ms_aksesoris;
CREATE POLICY "allow_all_ms_aksesoris" ON public.ms_aksesoris FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_kuota
DROP POLICY IF EXISTS "allow_all_ms_kuota" ON public.ms_kuota;
CREATE POLICY "allow_all_ms_kuota" ON public.ms_kuota FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_hp_hdr
DROP POLICY IF EXISTS "allow_all_ms_hp_hdr" ON public.ms_hp_hdr;
CREATE POLICY "allow_all_ms_hp_hdr" ON public.ms_hp_hdr FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_hp_dtl
DROP POLICY IF EXISTS "allow_all_ms_hp_dtl" ON public.ms_hp_dtl;
CREATE POLICY "allow_all_ms_hp_dtl" ON public.ms_hp_dtl FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_hp_hdr_non_pajak
DROP POLICY IF EXISTS "allow_all_ms_hp_hdr_non_pajak" ON public.ms_hp_hdr_non_pajak;
CREATE POLICY "allow_all_ms_hp_hdr_non_pajak" ON public.ms_hp_hdr_non_pajak FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_hp_dtl_non_pajak
DROP POLICY IF EXISTS "allow_all_ms_hp_dtl_non_pajak" ON public.ms_hp_dtl_non_pajak;
CREATE POLICY "allow_all_ms_hp_dtl_non_pajak" ON public.ms_hp_dtl_non_pajak FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_cctv_hdr
DROP POLICY IF EXISTS "allow_all_ms_cctv_hdr" ON public.ms_cctv_hdr;
CREATE POLICY "allow_all_ms_cctv_hdr" ON public.ms_cctv_hdr FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ms_cctv_dtl
DROP POLICY IF EXISTS "allow_all_ms_cctv_dtl" ON public.ms_cctv_dtl;
CREATE POLICY "allow_all_ms_cctv_dtl" ON public.ms_cctv_dtl FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- trs_penjualan_hdr
DROP POLICY IF EXISTS "allow_all_trs_penjualan_hdr" ON public.trs_penjualan_hdr;
CREATE POLICY "allow_all_trs_penjualan_hdr" ON public.trs_penjualan_hdr FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- trs_penjualan_dtl
DROP POLICY IF EXISTS "allow_all_trs_penjualan_dtl" ON public.trs_penjualan_dtl;
CREATE POLICY "allow_all_trs_penjualan_dtl" ON public.trs_penjualan_dtl FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- trs_pembelian_hdr
DROP POLICY IF EXISTS "allow_all_trs_pembelian_hdr" ON public.trs_pembelian_hdr;
CREATE POLICY "allow_all_trs_pembelian_hdr" ON public.trs_pembelian_hdr FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- trs_pembelian_dtl
DROP POLICY IF EXISTS "allow_all_trs_pembelian_dtl" ON public.trs_pembelian_dtl;
CREATE POLICY "allow_all_trs_pembelian_dtl" ON public.trs_pembelian_dtl FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
