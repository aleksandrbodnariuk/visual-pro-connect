
import { PostCard } from "@/components/feed/PostCard";

interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    profession?: string;
  };
  imageUrl: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
}

interface ProfilePostsListProps {
  posts: Post[];
  isCurrentUser: boolean;
  onEditPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}

export function ProfilePostsList({ 
  posts, 
  isCurrentUser, 
  onEditPost, 
  onDeletePost 
}: ProfilePostsListProps) {
  return (
    <div className="space-y-6">
      {posts.length > 0 ? (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            {...post} 
            onEdit={onEditPost}
            onDelete={onDeletePost}
          />
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Немає публікацій для відображення
        </div>
      )}
    </div>
  );
}
