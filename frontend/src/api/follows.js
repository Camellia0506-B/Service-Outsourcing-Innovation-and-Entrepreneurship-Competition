import http from "./http";

export function followListAPI(user_id) {
  return http.post("/follows/list", { user_id });
}

export function followAddAPI({ user_id, univ_id }) {
  return http.post("/follows/add", { user_id, univ_id });
}

export function followDeleteAPI(id) {
  return http.post("/follows/delete", { id });
}
