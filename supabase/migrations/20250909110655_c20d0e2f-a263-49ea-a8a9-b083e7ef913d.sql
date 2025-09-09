-- Fix founder_admin status for the main admin account
UPDATE users 
SET founder_admin = true 
WHERE phone_number = '0507068007' AND full_name = 'Олександр Боднарюк';