import { getCoordinatorPhotoKey } from "@/composition/admin";
import { storage } from "@/composition/uploads";
import { AppError } from "@/lib/errors";

const PHOTO_URL_TTL_SECONDS = 60;

/** Public, like the contact page: redirects to a short-lived presigned URL. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const key = await getCoordinatorPhotoKey({ id });
    const url = await storage.presignDownload({
      key,
      expiresInSeconds: PHOTO_URL_TTL_SECONDS,
    });
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AppError)
      return new Response(null, { status: error.status });
    throw error;
  }
}
