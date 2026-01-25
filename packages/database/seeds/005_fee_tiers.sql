INSERT INTO fee_tiers (id, name, fee_percentage) 
VALUES 
  (1, 'Standard', 0.1), 
  (2, 'Premium', 0.05)
ON CONFLICT (id) DO NOTHING;
