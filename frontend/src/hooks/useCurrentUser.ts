import { useQuery } from "@tanstack/react-query";
import * as authApi from "../api/auth";
import { useAuth } from "../context/auth-context";

export function useCurrentUser() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}
