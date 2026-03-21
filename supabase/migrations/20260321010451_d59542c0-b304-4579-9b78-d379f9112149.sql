-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('furniture-models', 'furniture-models', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for furniture-models
CREATE POLICY "Public read access for furniture-models"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'furniture-models');

-- Public read access for thumbnails
CREATE POLICY "Public read access for thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Authenticated users can upload to furniture-models
CREATE POLICY "Authenticated upload to furniture-models"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'furniture-models');

-- Authenticated users can delete from furniture-models
CREATE POLICY "Authenticated delete from furniture-models"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'furniture-models');

-- Authenticated users can upload to thumbnails
CREATE POLICY "Authenticated upload to thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Authenticated users can delete from thumbnails
CREATE POLICY "Authenticated delete from thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails');