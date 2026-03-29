
import { useMemo } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedData } from "@/hooks/useFeedData";
import { useAuth } from "@/context/AuthContext";

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
  const { user, appUser } = useAuth();
  const postIds = useMemo(() => posts.map(p => p.id), [posts]);
  
  const {
    getCommentsForPost,
    getCommentLikes,
    getPostLikes,
    getPostShare,
    togglePostReaction,
    toggleCommentReaction,
    toggleShare,
    editComment,
    deleteComment,
    postLikeLoading,
    commentLikeLoading,
  } = useFeedData(postIds);

  const currentUser = appUser ? { id: appUser.id, full_name: appUser.firstName + ' ' + appUser.lastName, avatar_url: appUser.avatarUrl } : null;

  return (
    <div className="space-y-6">
      {posts.length > 0 ? (
        posts.map((post) => (
          <PostCard 
            key={post.id} 
            {...post} 
            onEdit={onEditPost}
            onDelete={onDeletePost}
            currentUser={currentUser}
            feedComments={getCommentsForPost(post.id)}
            postLikesData={getPostLikes(post.id)}
            getCommentLikes={getCommentLikes}
            onTogglePostReaction={togglePostReaction}
            onToggleCommentReaction={toggleCommentReaction}
            onEditComment={editComment}
            onDeleteComment={deleteComment}
            postLikeLoading={postLikeLoading.has(post.id)}
            commentLikeLoading={false}
            postShareData={getPostShare(post.id)}
            onToggleShare={toggleShare}
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
