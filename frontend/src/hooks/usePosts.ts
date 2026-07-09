import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as postsApi from "../api/posts";
import type { PostListParams, PostPayload } from "../api/posts";

export const postKeys = {
  all: ["posts"] as const,
  list: (params: PostListParams) => ["posts", "list", params] as const,
  detail: (id: number) => ["posts", "detail", id] as const,
};

export function usePostsList(params: PostListParams) {
  return useQuery({
    queryKey: postKeys.list(params),
    queryFn: () => postsApi.listPosts(params),
    placeholderData: keepPreviousData, // keep the table stable while a new page loads
  });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => postsApi.getPost(id),
  });
}

/** Invalidate everything a post mutation can affect: lists, details, images, tags. */
function useInvalidatePosts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: postKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["post-image"] });
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
  };
}

export function useCreatePost() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (payload: PostPayload) => postsApi.createPost(payload),
    onSuccess: invalidate,
  });
}

export function useUpdatePost(id: number) {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (payload: Partial<PostPayload>) => postsApi.updatePost(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeletePost() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (id: number) => postsApi.deletePost(id),
    onSuccess: invalidate,
  });
}

export function useUploadPostImage() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => postsApi.uploadPostImage(id, file),
    onSuccess: invalidate,
  });
}

export function useDeletePostImage() {
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (id: number) => postsApi.deletePostImage(id),
    onSuccess: invalidate,
  });
}
