-- Update file_url for all furniture_items to point to local GLB models

-- Beds
UPDATE furniture_items SET file_url = 'Bed/japanese_futonbed.glb' WHERE id = 'bed_001';
UPDATE furniture_items SET file_url = 'Bed/realistic_bed_3d_model.glb' WHERE id = 'bed_002';
UPDATE furniture_items SET file_url = 'Bed/ornate_carved_bed.glb' WHERE id = 'bed_003';

-- Chairs
UPDATE furniture_items SET file_url = 'Chair/leather_chair.glb' WHERE id = 'chair_001';
UPDATE furniture_items SET file_url = 'Chair/vintage_zen_dining_chair.glb' WHERE id = 'chair_002';
UPDATE furniture_items SET file_url = 'Chair/woven_lounge_chair.glb' WHERE id = 'chair_003';

-- Lamps
UPDATE furniture_items SET file_url = 'Lamps/ikea_lamp.glb' WHERE id = 'lamp_001';
UPDATE furniture_items SET file_url = 'Lamps/retro_lowpoly_lamp.glb' WHERE id = 'lamp_002';
UPDATE furniture_items SET file_url = 'Lamps/desk_lamp.glb' WHERE id = 'lamp_003';

-- Plants
UPDATE furniture_items SET file_url = 'Plants/house_palm_plant.glb' WHERE id = 'plant_001';
UPDATE furniture_items SET file_url = 'Plants/aglaonema_plant.glb' WHERE id = 'plant_002';
UPDATE furniture_items SET file_url = 'Plants/low-poly_snake_plant.glb' WHERE id = 'plant_003';

-- Rugs / Carpets
UPDATE furniture_items SET file_url = 'Carpet/antique_heriz_8708_golden_horn_beige_rugs.glb' WHERE id = 'rug_001';
UPDATE furniture_items SET file_url = 'Carpet/mat.glb' WHERE id = 'rug_002';
UPDATE furniture_items SET file_url = 'Carpet/mat.glb' WHERE id = 'rug_003';

-- Tables
UPDATE furniture_items SET file_url = 'Tables/hexagonal_table_01.glb' WHERE id = 'table_001';
UPDATE furniture_items SET file_url = 'Tables/psx_wooden_table.glb' WHERE id = 'table_002';
UPDATE furniture_items SET file_url = 'Tables/office_table_desk.glb' WHERE id = 'table_003';

-- Sofas (using chair models as closest match)
UPDATE furniture_items SET file_url = 'Chair/barcelona_chair.glb' WHERE id = 'sofa_001';
UPDATE furniture_items SET file_url = 'Chair/leather_chair.glb' WHERE id = 'sofa_002';
UPDATE furniture_items SET file_url = 'Chair/woven_lounge_chair.glb' WHERE id = 'sofa_003';

-- Shelves (using table models as closest proxy)
UPDATE furniture_items SET file_url = 'Tables/serving_table_01.glb' WHERE id = 'shelf_001';
UPDATE furniture_items SET file_url = 'Tables/victorian_style_tabledesk.glb' WHERE id = 'shelf_002';
UPDATE furniture_items SET file_url = 'Tables/serving_table_01.glb' WHERE id = 'shelf_003';