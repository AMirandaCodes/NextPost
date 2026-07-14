import type { User } from "../types";
import { api } from "./client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/login", payload);
  return data;
}

/** Demo-mode only: the backend returns a session for the shared demo account. */
export async function demoLogin(): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/demo");
  return data;
}

export async function register(payload: RegisterPayload): Promise<User> {
  const { data } = await api.post<User>("/auth/register", payload);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/users/me");
  return data;
}

export async function updateMe(payload: { email?: string; full_name?: string }): Promise<User> {
  const { data } = await api.patch<User>("/users/me", payload);
  return data;
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<void> {
  await api.put("/users/me/password", payload);
}
