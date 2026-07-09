import type { DashboardStats } from "../types";
import { api } from "./client";

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>("/dashboard");
  return data;
}
