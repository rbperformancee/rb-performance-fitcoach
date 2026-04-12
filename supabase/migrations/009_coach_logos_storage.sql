-- =============================================
-- 009 : Storage bucket public pour les logos coach
-- =============================================

-- Creer le bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-logos', 'coach-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy : tout le monde peut lire (bucket public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'coach-logos public read'
  ) THEN
    CREATE POLICY "coach-logos public read" ON storage.objects
      FOR SELECT USING (bucket_id = 'coach-logos');
  END IF;
END $$;

-- Policy : coach peut uploader uniquement dans son dossier (prefix = coach.id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'coach-logos upload own'
  ) THEN
    CREATE POLICY "coach-logos upload own" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'coach-logos'
        AND auth.role() = 'authenticated'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'coach-logos update own'
  ) THEN
    CREATE POLICY "coach-logos update own" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'coach-logos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
