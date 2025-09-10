-- Direct update with debugging
DO $$
BEGIN
    -- Log current state
    RAISE NOTICE 'Current state: %', (SELECT founder_admin FROM users WHERE phone_number = '0507068007');
    
    -- Try to update directly
    UPDATE users 
    SET founder_admin = true, is_admin = true, is_shareholder = true 
    WHERE phone_number = '0507068007';
    
    -- Log new state
    RAISE NOTICE 'New state: %', (SELECT founder_admin FROM users WHERE phone_number = '0507068007');
    
    -- Check if update was successful
    IF NOT FOUND THEN
        RAISE NOTICE 'No rows were updated';
    ELSE
        RAISE NOTICE 'Update successful';
    END IF;
END $$;