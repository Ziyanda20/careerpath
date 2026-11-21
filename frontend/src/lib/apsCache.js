// Cached APS/qualifying-course data is namespaced per user ID. This is what
// prevents one account's results from ever being shown to a different
// account in the same browser (e.g. two tabs logged in as different users,
// or switching accounts without an explicit logout).

function key(userId) {
  return `aps_result:${userId}`;
}

export function getApsResult(userId) {
  if (!userId || typeof window === "undefined") return null;
  const raw = localStorage.getItem(key(userId));
  return raw ? JSON.parse(raw) : null;
}

export function setApsResult(userId, data) {
  if (!userId || typeof window === "undefined") return;
  localStorage.setItem(key(userId), JSON.stringify(data));
}

export function clearApsResult(userId) {
  if (!userId || typeof window === "undefined") return;
  localStorage.removeItem(key(userId));
}