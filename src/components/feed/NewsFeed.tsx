
import { PostCard } from "./PostCard";

// Тестові дані для демонстрації
const POSTS = [
  {
    id: "1",
    author: {
      id: "user1",
      name: "Олександр Петренко",
      username: "alex_photo",
      avatarUrl: "https://i.pravatar.cc/150?img=1",
      profession: "Photo"
    },
    imageUrl: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
    caption: "Вечірня фотосесія із використанням світлових ефектів. #creative #photoshoot #lights",
    likes: 124,
    comments: 18,
    timeAgo: "2 години тому"
  },
  {
    id: "2",
    author: {
      id: "user2",
      name: "Марія Коваленко",
      username: "maria_video",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
      profession: "Video"
    },
    imageUrl: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81",
    caption: "Зйомка нового музичного кліпу. Закулісся творчого процесу! #musicvideo #production",
    likes: 89,
    comments: 7,
    timeAgo: "5 годин тому"
  },
  {
    id: "3",
    author: {
      id: "user3",
      name: "Ігор Мельник",
      username: "igor_music",
      avatarUrl: "https://i.pravatar.cc/150?img=8",
      profession: "Music"
    },
    imageUrl: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b",
    caption: "Новий трек вже скоро! Готуємось до релізу і аранжуємо останні деталі. #newmusic #producer",
    likes: 203,
    comments: 25,
    timeAgo: "1 день тому"
  },
];

export function NewsFeed() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      {POSTS.map((post) => (
        <PostCard key={post.id} {...post} />
      ))}
    </div>
  );
}
