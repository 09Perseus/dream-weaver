
INSERT INTO public.furniture_items (id, name, category, style_tags, file_url, thumbnail_url, real_width, real_depth, real_height, floor_offset, price, buy_url) VALUES
-- Beds
('bed_001', 'Low Platform Bed', 'bed', '{minimalist,japandi}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.0, 1.6, 0.35, 0, 899, '#'),
('bed_002', 'Linen Upholstered Bed', 'bed', '{scandinavian,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.1, 1.8, 1.1, 0, 1299, '#'),
('bed_003', 'Rattan Canopy Bed', 'bed', '{boho,tropical}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.2, 1.8, 2.0, 0, 1499, '#'),
-- Sofas
('sofa_001', 'Oslo Corner Sofa', 'sofa', '{scandinavian,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.6, 1.6, 0.75, 0, 1299, '#'),
('sofa_002', 'Velvet 3-Seater', 'sofa', '{mid-century,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.2, 0.9, 0.85, 0, 999, '#'),
('sofa_003', 'Modular Cloud Sofa', 'sofa', '{modern,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.8, 1.1, 0.7, 0, 1399, '#'),
-- Tables
('table_001', 'Round Marble Dining Table', 'table', '{modern,luxe}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.2, 1.2, 0.75, 0, 899, '#'),
('table_002', 'Oak Coffee Table', 'table', '{scandinavian,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.2, 0.6, 0.45, 0, 399, '#'),
('table_003', 'Walnut Desk', 'table', '{mid-century,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.4, 0.7, 0.75, 0, 599, '#'),
-- Chairs
('chair_001', 'Accent Armchair', 'chair', '{modern,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.75, 0.8, 0.85, 0, 499, '#'),
('chair_002', 'Wishbone Dining Chair', 'chair', '{scandinavian,japandi}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.55, 0.5, 0.76, 0, 299, '#'),
('chair_003', 'Egg Chair', 'chair', '{mid-century,retro}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.86, 0.8, 1.05, 0, 799, '#'),
-- Lamps
('lamp_001', 'Arched Floor Lamp', 'lamp', '{modern,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.4, 0.4, 1.8, 0, 249, '#'),
('lamp_002', 'Pendant Globe Light', 'lamp', '{scandinavian,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.35, 0.35, 0.35, 0, 199, '#'),
('lamp_003', 'Bedside Table Lamp', 'lamp', '{minimalist,japandi}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.25, 0.25, 0.45, 0, 129, '#'),
-- Plants
('plant_001', 'Fiddle Leaf Fig', 'plant', '{boho,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.5, 0.5, 1.5, 0, 89, '#'),
('plant_002', 'Monstera Deliciosa', 'plant', '{tropical,boho}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.6, 0.6, 1.2, 0, 69, '#'),
('plant_003', 'Snake Plant in Pot', 'plant', '{minimalist,japandi}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 0.3, 0.3, 0.9, 0, 49, '#'),
-- Rugs
('rug_001', 'Berber Wool Rug', 'rug', '{boho,scandinavian}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.4, 1.7, 0.02, 0, 399, '#'),
('rug_002', 'Jute Natural Rug', 'rug', '{minimalist,japandi}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.0, 1.4, 0.01, 0, 249, '#'),
('rug_003', 'Abstract Flatweave Rug', 'rug', '{modern,mid-century}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 2.5, 1.8, 0.01, 0, 349, '#'),
-- Shelves
('shelf_001', 'Floating Oak Shelf', 'shelf', '{scandinavian,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.2, 0.25, 0.03, 0, 199, '#'),
('shelf_002', 'Industrial Pipe Bookcase', 'shelf', '{industrial,modern}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.0, 0.35, 1.8, 0, 599, '#'),
('shelf_003', 'Modular Grid Shelf', 'shelf', '{modern,minimalist}', 'PENDING_UPLOAD', 'PENDING_UPLOAD', 1.6, 0.35, 1.6, 0, 449, '#')
ON CONFLICT (id) DO NOTHING;
