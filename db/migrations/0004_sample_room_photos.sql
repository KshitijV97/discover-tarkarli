-- Placeholder photos (Unsplash licence) for the six sample rooms, only where a
-- room has no photos yet. Replace with real photography via the admin later.
update rooms set photos = case slug
  when 'sea-breeze-suite'   then array['https://images.unsplash.com/photo-1602002418082-a4443e081dd1','https://images.unsplash.com/photo-1578683010236-d716f9a3f461','https://images.unsplash.com/photo-1540541338287-41700207dee6']
  when 'sunset-room'        then array['https://images.unsplash.com/photo-1582719508461-905c673771fd','https://images.unsplash.com/photo-1611892440504-42a792e24d32','https://images.unsplash.com/photo-1473116763249-2faaef81ccda']
  when 'coral-room'         then array['https://images.unsplash.com/photo-1631049307264-da0ec9d70304','https://images.unsplash.com/photo-1618773928121-c32242e63f39','https://images.unsplash.com/photo-1519046904884-53103b34b206']
  when 'driftwood-room'     then array['https://images.unsplash.com/photo-1611892440504-42a792e24d32','https://images.unsplash.com/photo-1590490360182-c33d57733427','https://images.unsplash.com/photo-1506953823976-52e1fdc0149a']
  when 'lagoon-family-room' then array['https://images.unsplash.com/photo-1595576508898-0ad5c879a061','https://images.unsplash.com/photo-1590490360182-c33d57733427','https://images.unsplash.com/photo-1520250497591-112f2f40a3f4']
  when 'palm-nook'          then array['https://images.unsplash.com/photo-1618773928121-c32242e63f39','https://images.unsplash.com/photo-1631049307264-da0ec9d70304','https://images.unsplash.com/photo-1566073771259-6a8506099945']
  else photos end
where photos = '{}' and slug in ('sea-breeze-suite','sunset-room','coral-room','driftwood-room','lagoon-family-room','palm-nook');
