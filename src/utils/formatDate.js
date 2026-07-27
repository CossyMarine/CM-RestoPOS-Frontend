// src/utils/formatDate.js
const KENYA_TZ = "Africa/Nairobi";

// General-purpose formatter — always renders in Kenya time regardless of the
// device's own timezone/locale.
export const formatDate = (date, options = {}) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: KENYA_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(d);
};

// Drop-in replacement for `new Date(x).toLocaleString()` — same output
// shape, pinned to Kenya time instead of the device's local timezone.
export const formatKenyanDateTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-KE", { timeZone: KENYA_TZ });
};

// Drop-in replacement for `new Date(x).toLocaleDateString()`.
export const formatKenyanDate = (date, options = {}) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-KE", { timeZone: KENYA_TZ, ...options });
};

// Drop-in replacement for `new Date(x).toLocaleTimeString()`.
export const formatKenyanTime = (date, options = {}) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-KE", {
    timeZone: KENYA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
};

// Turns a <input type="date"> value ("YYYY-MM-DD") into the start or end
// instant of that Kenyan calendar day, as a real Date object — for
// client-side range filtering (mirrors the backend's getKenyanDayBounds).
// Kenya has no DST, so a fixed +03:00 offset is always correct.
export const kenyanDayBound = (dateStr, edge = "start") => {
  if (!dateStr) return null;
  const time = edge === "end" ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${dateStr}T${time}+03:00`);
};
