import { useNavigate, useParams } from "react-router-dom";
import type { PostPayload } from "../api/posts";
import { ErrorState, LoadingState } from "../components/DataStates";
import { PostForm } from "../features/posts/PostForm";
import { usePost, useUpdatePost } from "../hooks/usePosts";

export function PostEditPage() {
  const { postId } = useParams();
  const id = Number(postId);
  const navigate = useNavigate();
  const { data: post, isPending, isError, refetch } = usePost(id);
  const updateMutation = useUpdatePost(id);

  async function handleSubmit(payload: PostPayload) {
    await updateMutation.mutateAsync(payload);
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
