-- Додаємо foreign key relationships для friend_requests
ALTER TABLE friend_requests 
ADD CONSTRAINT fk_friend_requests_sender 
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE friend_requests 
ADD CONSTRAINT fk_friend_requests_receiver 
FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;