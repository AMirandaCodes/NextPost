import { useQuery } from "@tanstack/react-query";
import * as tagsApi from "../api/tags";

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: tagsApi.listTags });
}
