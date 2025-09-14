// frontend/src/api.js
const RAW_BASE = (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE)) || "/api";
const BASE = String(RAW_BASE || "/api").replace(/\/+$/, "");

function getToken() {
  try { return localStorage.getItem("token") || null; } catch { return null; }
}

export async function request(path, { method = "GET", body, headers } = {}) {
  const finalHeaders = { "Content-Type": "application/json", ...(headers || {}) };
  const token = getToken();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/${String(path).replace(/^\/+/, "")}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${method} ${path} -> ${res.status}: ${detail}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

const api = {
  request,
  // auth
  register: ({ email, password, role }) => request("auth/register", { method: "POST", body: { email, password, role } }),
  login: ({ email, password }) => request("auth/login", { method: "POST", body: { email, password } }),
  me: () => request("auth/me"),

  // locations & spaces with filters
  locations: (params = {}) => {
    const q = new URLSearchParams();
    if (params.city) q.set("city", params.city);
    if (params.type) q.set("type", params.type);
    if (params.services?.length) q.set("services", params.services.join(","));
    if (params.available_from) q.set("available_from", params.available_from);
    if (params.available_to) q.set("available_to", params.available_to);
    return request(`locations?${q.toString()}`);
  },
  spacesByLocation: (locId) => request(`locations/${encodeURIComponent(locId)}/spaces`),

  // bookings
  listBookings: ({ user_id } = {}) => request("bookings" + (user_id ? `?user_id=${encodeURIComponent(user_id)}` : "")),
  availability: ({ space_id, start_ts, end_ts }) => {
    const q = new URLSearchParams({ space_id, start_ts, end_ts });
    return request(`bookings/availability?${q.toString()}`);
  },
  createBooking: ({ space_id, start_ts, end_ts, note }) =>
    request("bookings", { method: "POST", body: { space_id, start_ts, end_ts, note } }),
  payBooking: (id) => request(`bookings/${encodeURIComponent(id)}/pay`, { method: "POST" }),

  // manager
  managerReport: () => request("manager/report"),
};



// --- admin api ---
api.adminListUsers = async () => request("admin/users");
api.adminCreateUser = async (body) => request("admin/users", { method: "POST", body });

// --- catalog api ---
api.createLocation = (body) => request("locations", { method: "POST", body });
api.updateLocation = (id, body) => request(`locations/${id}`, { method: "PUT", body });
api.deleteLocation = (id) => request(`locations/${id}`, { method: "DELETE" });

api.createSpace = (locationId, body) => request(`locations/${locationId}/spaces`, { method: "POST", body });
api.updateSpace = (id, body) => request(`spaces/${id}`, { method: "PUT", body });
api.deleteSpace = (id) => request(`spaces/${id}`, { method: "DELETE" });

api.emailReceipt = (bookingId, body) => request(`bookings/${bookingId}/email-receipt`, { method: "POST", body });

export default api;


// --- admin wizard ---
api.wizardPrefill = () => request("admin/wizard/prefill");
api.wizardValidate = (payload) => request("admin/wizard/validate", { method: "POST", body: payload });
api.wizardCommit = (payload) => request("admin/wizard/commit", { method: "POST", body: payload });
