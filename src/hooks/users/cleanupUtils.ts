
export function removeUserFromRelatedData(userId: string): void {
  // Remove user's posts
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const updatedPosts = posts.filter((post: any) => post.userId !== userId && post.user_id !== userId);
  localStorage.setItem("posts", JSON.stringify(updatedPosts));
  
  // Remove user's portfolio items
  const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]");
  const updatedPortfolio = portfolio.filter((item: any) => item.userId !== userId && item.user_id !== userId);
  localStorage.setItem("portfolio", JSON.stringify(updatedPortfolio));
  
  // Shares, stock exchange and transactions are now managed in Supabase
  // No localStorage cleanup needed for these
  
  // Видаляємо повідомлення та запити в друзі
  const friendRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
  const updatedFriendRequests = friendRequests.filter(
    (req: any) => req.sender_id !== userId && req.receiver_id !== userId
  );
  localStorage.setItem("friendRequests", JSON.stringify(updatedFriendRequests));
  
  const messages = JSON.parse(localStorage.getItem("messages") || "[]");
  const updatedMessages = messages.filter(
    (msg: any) => msg.sender_id !== userId && msg.receiver_id !== userId
  );
  localStorage.setItem("messages", JSON.stringify(updatedMessages));
}
