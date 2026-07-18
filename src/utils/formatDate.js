// src/utils/formatDate.js
export const formatDate = (date, options = {}) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(d);
};
