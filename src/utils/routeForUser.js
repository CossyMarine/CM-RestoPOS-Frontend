// src/utils/routeForUser.js
export function routeForUser(user) {
  if (!user) return "/login";
  if (user.role === "superadmin") return "/superadmin/onboard";
  if (user.isAdmin) return "/admin";
  if (user.role === "kitchen") return "/kitchen";
  if (user.role === "waiter") return "/waiter";
  if (user.role === "accountant") return "/accountant";
  return "/home"; // customer
}