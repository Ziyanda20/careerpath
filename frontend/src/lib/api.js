const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() { if (typeof window === "undefined") return null; return localStorage.getItem("token"); }
async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(BASE + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}
export const api = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  calculateAPS: (subjects) => request("/aps/calculate", { method: "POST", body: JSON.stringify({ subjects }) }),
  uploadReport: (formData) => {
    const token = getToken();
    return fetch(BASE + "/upload/report-card", { method: "POST", headers: token ? { Authorization: "Bearer " + token } : {}, body: formData })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || "Upload failed"); return d; });
  },
  sendMessage: (message, aps_score) => request("/chat/message", { method: "POST", body: JSON.stringify({ message, aps_score }) }),
  getChatHistory: () => request("/chat/history"),
  clearChatHistory: () => request("/chat/history", { method: "DELETE" }),
  saveTermResult: (body) => request("/grade12/term-result", { method: "POST", body: JSON.stringify(body) }),
  getProgress: () => request("/grade12/progress"),
  whatIf: (body) => request("/grade12/what-if", { method: "POST", body: JSON.stringify(body) }),
  careerFit: (body) => request("/grade12/career-fit", { method: "POST", body: JSON.stringify(body || {}) }),
};