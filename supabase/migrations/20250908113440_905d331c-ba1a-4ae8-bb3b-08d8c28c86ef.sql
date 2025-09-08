-- Fix admin access for founder
UPDATE users 
SET is_admin = true 
WHERE founder_admin = true OR phone_number = '0507068007';

-- Ensure founder admin status is maintained
UPDATE users 
SET founder_admin = true, is_admin = true, is_shareholder = true
WHERE phone_number = '0507068007';