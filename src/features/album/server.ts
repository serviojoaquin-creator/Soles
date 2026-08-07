import "server-only";

import { albumConfig, TRIP_PHOTOS_BUCKET } from "@/features/album/config";
import { getCurrentUser } from "@/features/auth/server";
import { getTripContext, type TripContext } from "@/features/trips/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AlbumComment = Tables<"comments"> & { authorName: string };
export type AlbumPhoto = Tables<"photos"> & {
  comments: AlbumComment[];
  signedUrl: string;
  uploaderName: string;
};

export type AlbumContext = TripContext & {
  activities: Array<Pick<Tables<"activities">, "id" | "title">>;
  currentUserId: string;
  hasMore: boolean;
  page: number;
  photos: AlbumPhoto[];
  totalPhotos: number;
};

async function commentAuthors(
  comments: Tables<"comments">[],
): Promise<Map<string, string>> {
  const ids = [...new Set(comments.map((comment) => comment.author_id))];
  if (ids.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  return new Map(
    (data ?? []).map((profile) => [profile.id, profile.display_name]),
  );
}

export async function getActivityComments(
  tripId: string,
  activityIds: string[],
): Promise<Map<string, AlbumComment[]>> {
  const result = new Map<string, AlbumComment[]>();
  if (activityIds.length === 0) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("trip_id", tripId)
    .in("activity_id", activityIds)
    .is("deleted_at", null)
    .order("created_at");
  if (error) throw new Error("Unable to load activity comments.");

  const comments = data ?? [];
  const authors = await commentAuthors(comments);
  for (const comment of comments) {
    const enriched = {
      ...comment,
      authorName: authors.get(comment.author_id) ?? "Viajero",
    };
    const list = result.get(comment.activity_id ?? "") ?? [];
    list.push(enriched);
    result.set(comment.activity_id ?? "", list);
  }
  return result;
}

export async function getAlbumContext(
  tripId: string,
  requestedPage: number,
): Promise<AlbumContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const tripContext = await getTripContext(tripId);
  if (!tripContext) return null;

  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), 100)
    : 1;
  const limit = page * albumConfig.pageSize;
  const supabase = await createClient();
  const [photosResult, activitiesResult] = await Promise.all([
    supabase
      .from("photos")
      .select("*", { count: "exact" })
      .eq("trip_id", tripId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(0, limit - 1),
    supabase
      .from("activities")
      .select("id, title")
      .eq("trip_id", tripId)
      .is("deleted_at", null)
      .order("activity_date")
      .order("position"),
  ]);
  if (photosResult.error || activitiesResult.error) {
    throw new Error("Unable to load the private album.");
  }

  const photos = photosResult.data ?? [];
  const photoIds = photos.map((photo) => photo.id);
  const uploaderIds = [...new Set(photos.map((photo) => photo.uploaded_by))];
  const [commentsResult, uploadersResult, signedPhotos] = await Promise.all([
    photoIds.length
      ? supabase
          .from("comments")
          .select("*")
          .in("photo_id", photoIds)
          .is("deleted_at", null)
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
    uploaderIds.length
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", uploaderIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(
      photos.map((photo) =>
        supabase.storage
          .from(TRIP_PHOTOS_BUCKET)
          .createSignedUrl(photo.storage_path, albumConfig.signedUrlSeconds),
      ),
    ),
  ]);
  if (commentsResult.error || uploadersResult.error) {
    throw new Error("Unable to load album details.");
  }

  const comments = commentsResult.data ?? [];
  const authors = await commentAuthors(comments);
  const uploaderNames = new Map(
    (uploadersResult.data ?? []).map((profile) => [
      profile.id,
      profile.display_name,
    ]),
  );

  const commentsByPhoto = new Map<string, AlbumComment[]>();
  for (const comment of comments) {
    if (!comment.photo_id) continue;
    const list = commentsByPhoto.get(comment.photo_id) ?? [];
    list.push({
      ...comment,
      authorName: authors.get(comment.author_id) ?? "Viajero",
    });
    commentsByPhoto.set(comment.photo_id, list);
  }

  const albumPhotos = photos.flatMap((photo, index) => {
    const signedUrl = signedPhotos[index].data?.signedUrl;
    if (!signedUrl) return [];
    return [
      {
        ...photo,
        comments: commentsByPhoto.get(photo.id) ?? [],
        signedUrl,
        uploaderName: uploaderNames.get(photo.uploaded_by) ?? "Viajero",
      },
    ];
  });
  const totalPhotos = photosResult.count ?? albumPhotos.length;

  return {
    ...tripContext,
    activities: activitiesResult.data ?? [],
    currentUserId: user.id,
    hasMore: totalPhotos > limit,
    page,
    photos: albumPhotos,
    totalPhotos,
  };
}
