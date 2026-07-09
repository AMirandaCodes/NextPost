import { useNavigate } from "react-router-dom";
import type { PostPayload } from "../api/posts";
import type { ImageSelection } from "../features/posts/ImageField";
import { PostForm } from "../features/posts/PostForm";
import { useCreatePost, useUploadPostImage } from "../hooks/usePosts";

export function PostCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreatePost();
  const uploadImageMutation = useUploadPostImage();

  async function handleSubmit(payload: PostPayload, image: ImageSelection) {
    const post = await createMutation.mutateAsync(payload);
    if (image.file) {
      await uploadImageMutation.mutateAsync({ id: post.id, file: image.file });
    }
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
