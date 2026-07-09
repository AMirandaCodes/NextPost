import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import * as postsApi from "../api/posts";

interface AuthImageProps {
  postId: number;
  imagePath: string; // part of the cache key so replacing the image busts it
  alt: string;
  className?: string;
}

/**
 * <img> tags can't send an Authorization header, so the image endpoint is
 * fetched through the authenticated Axios client and rendered as an object URL.
 */
export function AuthImage({ postId, imagePath, alt, className }: AuthImageProps) {
  const {
    data: src,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["post-image", postId, imagePath],
    queryFn: async () => URL.createObjectURL(await postsApi.getPostImageBlob(postId)),
    staleTime: Infinity,
  });

  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Loading image"
        className={`animate-pulse bg-slate-100 ${className ?? ""}`}
      />
    );
  }
  if (isError) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-50 text-sm text-slate-400 ${className ?? ""}`}
      >
        Image unavailable
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}
