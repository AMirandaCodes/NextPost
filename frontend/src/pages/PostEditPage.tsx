import { useNavigate, useParams } from "react-router-dom";
import type { PostPayload } from "../api/posts";
import { ErrorState, LoadingState } from "../components/DataStates";
import type { ImageSelection } from "../features/posts/ImageField";
import { PostForm } from "../features/posts/PostForm";
import {
  useDeletePostImage,
  usePost,
  useUpdatePost,
  useUploadPostImage,
} from "../hooks/usePosts";

export function PostEditPage() {
  const { postId } = useParams();
  const id = Number(postId);
  const navigate = useNavigate();
  const { data: post, isPending, isError, refetch } = usePost(id);
  const updateMutation = useUpdatePost(id);
  const uploadImageMutation = useUploadPostImage();
  const deleteImageMutation = useDeletePostImage();

  async function handleSubmit(payload: PostPayload, image: ImageSelection) {
    await updateMutation.mutateAsync(payload);
    if (image.remove) {
      await deleteImageMutation.mutateAsync(id);
    } else if (image.file) {
      await uploadImageMutation.mutateAsync({ id, file: image.file });
    }
    navigate("/posts");
  }

  if (isPending) return <LoadingState label="Loading post…" />;
  if (isError) {
    return <ErrorState message="Could not load this post." onRetry={() => void refetch()} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Edit post</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PostForm initial={post} submitLabel="Save changes" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
