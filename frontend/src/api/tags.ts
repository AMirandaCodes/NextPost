import type { Tag } from "../types";
import { api } from "./client";

export async function listTags(): Promise<Tag[]> {
  const { data } = await api.get<Tag[]>("/tags");
  return data;
}
