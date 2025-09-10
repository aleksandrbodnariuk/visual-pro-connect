-- Fix founder_admin status for the main admin account
UPDATE users 
SET 
  founder_admin = true,
  is_admin = true,
  is_shareholder = true
WHERE phone_number = '0507068007';