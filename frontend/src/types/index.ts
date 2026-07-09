export type Platform = "facebook" | "instagram" | "x" | "linkedin" | "tiktok" | "other";
export type PostStatus = "draft" | "scheduled" | "published";

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  other: "Other",
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  platform: Platform;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  image_path: string | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}
