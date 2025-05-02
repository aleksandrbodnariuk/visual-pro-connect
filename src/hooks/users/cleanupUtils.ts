
export function removeUserFromRelatedData(userId: string): void {
  // Remove user's posts
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const updatedPosts = posts.filter((post: any) => post.userId !== userId && post.user_id !== userId);
  localStorage.setItem("posts", JSON.stringify(updatedPosts));
  
  // Remove user's portfolio items
  const portfolio = JSON.parse(localStorage.getItem("portfolio") || "[]");
  const updatedPortfolio = portfolio.filter((item: any) => item.userId !== userId && item.user_id !== userId);
  localStorage.setItem("portfolio", JSON.stringify(updatedPortfolio));
  
  // Remove user from shares data
  const shares = JSON.parse(localStorage.getItem("shares") || "[]");
  const updatedShares = shares.filter((share: any) => share.userId !== userId && share.user_id !== userId);
  localStorage.setItem("shares", JSON.stringify(updatedShares));
  
  // Remove user from other relevant storage
  const stockExchange = JSON.parse(localStorage.getItem("stockExchange") || "[]");
  const updatedStockExchange = stockExchange.filter((item: any) => item.sellerId !== userId && item.seller_id !== userId);
  localStorage.setItem("stockExchange", JSON.stringify(updatedStockExchange));
  
  const transactions = JSON.parse(localStorage.getItem("sharesTransactions") || "[]");
  const updatedTransactions = transactions.filter(
    (t: any) => (t.sellerId !== userId && t.buyerId !== userId) && (t.seller_id !== userId && t.buyer_id !== userId)
  );
  localStorage.setItem("sharesTransactions", JSON.stringify(updatedTransactions));
  
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
