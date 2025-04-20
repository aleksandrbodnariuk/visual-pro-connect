
import { PostCard } from "@/components/feed/PostCard";
import { PostMenu } from "@/components/profile/PostMenu";

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
          <div key={post.id} className="relative">
            {isCurrentUser && (
              <div className="absolute right-4 top-4 z-10">
                <PostMenu 
                  postId={post.id}
                  isAuthor={isCurrentUser}
                  onEdit={onEditPost}
                  onDelete={onDeletePost}
                />
              </div>
            )}
            <PostCard {...post} />
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Немає публікацій для відображення
        </div>
      )}
    </div>
  );
}
