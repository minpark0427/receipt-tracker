INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access to receipt images"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipt-images');

CREATE POLICY "Allow public insert access to receipt images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "Allow public update access to receipt images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipt-images');

CREATE POLICY "Allow public delete access to receipt images"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipt-images');
