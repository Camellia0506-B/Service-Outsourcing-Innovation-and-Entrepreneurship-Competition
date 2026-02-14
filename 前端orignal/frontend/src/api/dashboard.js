import http from "./http";

export function dashboardAPI(user_id) {
  return http.post("/dashboard", { user_id });
}
