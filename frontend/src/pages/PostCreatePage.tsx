import { useNavigate } from "react-router-dom";
import type { PostPayload } from "../api/posts";
import { PostForm } from "../features/posts/PostForm";
import { useCreatePost } from "../hooks/usePosts";

export function PostCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePost();

  async function handleSubmit(payload: PostPayload) {
    await createMutation.mutateAsync(payload);
    navigate("/posts");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New post</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PostForm submitLabel="Create post" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
