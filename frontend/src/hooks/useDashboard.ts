import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "../api/dashboard";

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.getDashboard });
}
