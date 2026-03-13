-- MindGuard Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INT,
  health_issues TEXT[],
  user_email TEXT,
  user_phone TEXT,
  guardian_name TEXT,
  guardian_email TEXT,
  guardian_phone TEXT,
  guardian_social TEXT,
  medication_opted_in BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency INT DEFAULT 1,
  times TEXT[],
  stock_count INT DEFAULT 0,
  per_day INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Medication Logs
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_time TIMESTAMPTZ,
  taken_at TIMESTAMPTZ,
  photo_before_url TEXT,
  photo_after_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'taken', 'missed')),
  guardian_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Stress Entries
CREATE TABLE IF NOT EXISTS stress_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  wake_time TIME,
  sleep_time TIME,
  food_habits TEXT,
  protein_intake NUMERIC,
  nutrient_intake NUMERIC,
  typing_speed INT,
  anxiousness INT,
  nervousness INT,
  custom_factors JSONB,
  stress_score NUMERIC,
  recovery_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS) Policies
-- Users can only see/modify their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Medications: users can CRUD their own medications
CREATE POLICY "Users can view own meds" ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meds" ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meds" ON medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meds" ON medications FOR DELETE USING (auth.uid() = user_id);

-- Medication Logs
CREATE POLICY "Users can view own med logs" ON medication_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own med logs" ON medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own med logs" ON medication_logs FOR UPDATE USING (auth.uid() = user_id);

-- Stress Entries
CREATE POLICY "Users can view own stress" ON stress_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stress" ON stress_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for medication photos
INSERT INTO storage.buckets (id, name, public) VALUES ('medication-photos', 'medication-photos', true)
ON CONFLICT DO NOTHING;

-- Storage policy: users can upload to their own folder
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medication-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view medication photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'medication-photos');
