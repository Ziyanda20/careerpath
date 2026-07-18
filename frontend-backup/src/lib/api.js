const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.detail || "Something went wrong");
  return data;
}

export const api = {
  // Auth
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login:    (body) => request("/auth/login",    { method: "POST", body: JSON.stringify(body) }),
  me:       ()     => request("/auth/me"),

  // APS
  calculateAPS: (subjects) =>
    request("/aps/calculate", { method: "POST", body: JSON.stringify({ subjects }) }),
  filterCourses: (filters) =>
    request("/aps/courses",   { method: "POST", body: JSON.stringify(filters) }),

  // Upload
  uploadReport: (formData) => {
    const token = getToken();
    return fetch(`${BASE}/upload/report-card`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Upload failed");
      return d;
    });
  },

  // Chatbot
  sendMessage: (message, aps_score) =>
    request("/chat/message", { method: "POST", body: JSON.stringify({ message, aps_score }) }),
  getChatHistory: () => request("/chat/history"),

  // Grade 11
  saveTermResult: (body) =>
    request("/grade11/term-result", { method: "POST", body: JSON.stringify(body) }),
  getProgress:   () => request("/grade11/progress"),
  whatIf:        (body) =>
    request("/grade11/what-if", { method: "POST", body: JSON.stringify(body) }),

  // Courses
  getCourses: (params) => {
    const q = new URLSearchParams(params).toString();
    return request(`/courses/?${q}`);
  },
};
