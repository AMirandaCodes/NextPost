import type { Page, Platform, Post, PostStatus } from "../types";
import { api } from "./client";

export interface PostListParams {
  page?: number;
  page_size?: number;
  platform?: Platform | "";
  status?: PostStatus | "";
  tag?: string;
  search?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  sort_by?: "created_at" | "updated_at" | "scheduled_at" | "title";
  sort_order?: "asc" | "desc";
}

export interface PostPayload {
  title: string;
  content: string;
  platform: Platform;
  status: PostStatus;
  scheduled_at: string | null;
  tags: string[];
}

export async function listPosts(params: PostListParams): Promise<Page<Post>> {
  // Drop empty-string filters so the query string stays clean.
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== undefined),
  );
  const { data } = await api.get<Page<Post>>("/posts", { params: cleaned });
  return data;
}

export async function getPost(id: number): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${id}`);
  return data;
}

export async function createPost(payload: PostPayload): Promise<Post> {
  const { data } = await api.post<Post>("/posts", payload);
  return data;
}

export async function updatePost(id: number, payload: Partial<PostPayload>): Promise<Post> {
  const { data } = await api.patch<Post>(`/posts/${id}`, payload);
  return data;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/posts/${id}`);
}

export async function uploadPostImage(id: number, file: File): Promise<Post> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.put<Post>(`/posts/${id}/image`, formData);
  return data;
}

export async function deletePostImage(id: number): Promise<void> {
  await api.delete(`/posts/${id}/image`);
}

export async function getPostImageBlob(id: number): Promise<Blob> {
  const { data } = await api.get<Blob>(`/posts/${id}/image`, { responseType: "blob" });
  return data;
}
