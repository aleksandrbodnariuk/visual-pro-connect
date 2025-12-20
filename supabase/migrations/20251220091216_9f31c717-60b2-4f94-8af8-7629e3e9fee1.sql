-- Add CHECK constraints for input validation on user content

-- Posts table: content length limit
ALTER TABLE public.posts 
ADD CONSTRAINT posts_content_length CHECK (content IS NULL OR length(content) <= 10000);

-- Comments table: content length limit
ALTER TABLE public.comments 
ADD CONSTRAINT comments_content_length CHECK (length(content) <= 5000);

-- Users table: field length limits and URL format validation
ALTER TABLE public.users
ADD CONSTRAINT users_full_name_length CHECK (full_name IS NULL OR length(full_name) <= 200),
ADD CONSTRAINT users_bio_length CHECK (bio IS NULL OR length(bio) <= 2000),
ADD CONSTRAINT users_title_length CHECK (title IS NULL OR length(title) <= 200),
ADD CONSTRAINT users_country_length CHECK (country IS NULL OR length(country) <= 100),
ADD CONSTRAINT users_city_length CHECK (city IS NULL OR length(city) <= 100),
ADD CONSTRAINT users_website_format CHECK (
  website IS NULL OR 
  website = '' OR 
  website ~ '^https?://[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+(/[^\s]*)?$'
),
ADD CONSTRAINT users_instagram_length CHECK (instagram IS NULL OR length(instagram) <= 100),
ADD CONSTRAINT users_facebook_length CHECK (facebook IS NULL OR length(facebook) <= 200),
ADD CONSTRAINT users_viber_length CHECK (viber IS NULL OR length(viber) <= 50);

-- Messages table: content length limit
ALTER TABLE public.messages 
ADD CONSTRAINT messages_content_length CHECK (length(content) <= 5000);

-- Notifications table: message length limit
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_message_length CHECK (length(message) <= 1000);

-- Portfolio table: field length limits
ALTER TABLE public.portfolio
ADD CONSTRAINT portfolio_title_length CHECK (length(title) <= 200),
ADD CONSTRAINT portfolio_description_length CHECK (description IS NULL OR length(description) <= 2000);