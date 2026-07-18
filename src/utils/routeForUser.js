// src/utils/routeForUser.js

// Single source of truth for "where does this user belong" —
// used by App.jsx (route guards) and LoginPage.jsx (post-login redirect).
export function routeForUser(user) {
  if (!user) return "/login";
  if (user.isAdmin) return "/admin";
  if (user.role === "kitchen") return "/kitchen";
  if (user.role === "waiter") return "/waiter";
  if (user.role === "accountant") return "/accountant";
  return "/home"; // customer
}
