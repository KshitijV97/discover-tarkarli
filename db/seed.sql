-- Sample data. Re-runnable: rooms/menu upsert by unique key, settings upsert.

insert into rooms (name, slug, description, max_occupancy, base_price, amenities, sort_order) values
  ('Sea Breeze Suite', 'sea-breeze-suite',
   'Our largest room, with a private balcony facing the Arabian Sea and a king bed.',
   4, 6500, '{"Sea view","Balcony","King bed","AC"}', 1),
  ('Sunset Room', 'sunset-room',
   'West-facing room with the best sunset light in the house. Queen bed and day lounger.',
   3, 5200, '{"Sea view","Queen bed","AC"}', 2),
  ('Coral Room', 'coral-room',
   'Bright, airy double opening onto the garden, a short walk from the sand.',
   2, 4200, '{"Garden view","Double bed","AC"}', 3),
  ('Driftwood Room', 'driftwood-room',
   'Rustic timber interiors, twin or double setup, ideal for friends travelling together.',
   2, 3900, '{"Garden view","Twin/Double","AC"}', 4),
  ('Lagoon Family Room', 'lagoon-family-room',
   'Two connected spaces with a double bed and two singles. Great for families.',
   5, 7800, '{"Partial sea view","Family","AC"}', 5),
  ('Palm Nook', 'palm-nook',
   'A cosy hideaway under the coconut palms, perfect for solo travellers or couples.',
   2, 3200, '{"Garden view","Double bed","Fan + AC"}', 6)
on conflict (slug) do nothing;

insert into menu_items (name, description, category, price, veg, sort_order)
select * from (values
  ('Prawn Gassi', 'Coastal prawn curry in coconut and tamarind', 'Mains', 480.00, false, 1),
  ('Kingfish Rava Fry', 'Semolina-crusted kingfish, pan fried', 'Mains', 520.00, false, 2),
  ('Veg Thali', 'Seasonal vegetables, dal, rice, chapati, papad', 'Mains', 320.00, true, 3),
  ('Neer Dosa with Chutney', 'Soft rice crepes, coconut chutney', 'Snacks', 180.00, true, 4),
  ('Kokum Cooler', 'Chilled kokum and mint', 'Drinks', 120.00, true, 5),
  ('Tender Coconut', 'Fresh from the grove', 'Drinks', 90.00, true, 6)
) as v(name, description, category, price, veg, sort_order)
where not exists (select 1 from menu_items);

-- Settings rows are optional (code has defaults) — seeded here so they are
-- visible/editable from day one.
insert into settings (key, value) values
  ('deposit',      '{"type":"percent","value":30}'),
  ('meals',        '{"breakfastIncluded":true,"breakfastPrice":350,"lunchPrice":550,"dinnerPrice":650,"cutoffTime":"18:00","cutoffDaysBefore":1}'),
  ('tax',          '{"roomRateLow":5,"roomRateHigh":18,"roomThreshold":7500,"foodRate":5,"intraState":true}'),
  ('booking',      '{"minNights":1,"maxNights":30,"maxAdvanceDays":365,"holdMinutes":15,"paymentsEnabled":true,"checkInTime":"14:00","checkOutTime":"11:00"}'),
  ('property',     '{"name":"Golden Tide Retreat","timezone":"Asia/Kolkata","phone":"","email":"","address":"","gstin":""}')
on conflict (key) do nothing;
