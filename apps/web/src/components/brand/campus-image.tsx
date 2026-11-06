import type { CampusPhoto } from "./campus-photos";

/**
 * A pre-encoded campus photo filling its positioned parent. The browser picks
 * AVIF when it can and the right width for `sizes`; a blurred preview shows
 * until the image arrives. `priority` is for the photo a page opens on.
 */
export function CampusImage({
  photo,
  alt,
  sizes,
  priority = false,
  className,
}: {
  photo: CampusPhoto;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={photo.avif} sizes={sizes} />
      {/* oxlint-disable-next-line nextjs/no-img-element -- the photos are already encoded, so next/image would only re-encode them. */}
      <img
        src={photo.fallback}
        srcSet={photo.webp}
        sizes={sizes}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        style={{ backgroundImage: photo.placeholder, backgroundSize: "cover" }}
        className={`absolute inset-0 size-full ${className ?? ""}`}
      />
    </picture>
  );
}
