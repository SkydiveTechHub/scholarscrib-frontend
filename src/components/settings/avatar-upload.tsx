"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadAvatar } from "@/hooks/api/use-user";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage, Section, submitClass } from "./section";

const MAX_EDGE = 512;

/**
 * Scales a picked photo down to avatar size and re-encodes it as JPEG, so a
 * multi-megabyte phone photo lands well under the server's 2MB limit.
 */
type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/**
 * Decodes a picked photo upright. Safari throws a TypeError for the
 * `imageOrientation: "from-image"` option (and older versions lack
 * createImageBitmap altogether), so fall back step by step: bitmap with the
 * option, bitmap without it, then a plain <img>. Browsers that skip the option
 * already apply the EXIF rotation by default.
 */
async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    for (const options of [{ imageOrientation: "from-image" as const }, undefined]) {
      try {
        const bitmap = await (options
          ? createImageBitmap(file, options)
          : createImageBitmap(file));
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        };
      } catch {
        // Try the next strategy.
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("This photo format isn't supported. Try a JPEG or PNG.");
  }
}

async function shrinkImage(file: File): Promise<File> {
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process this image.");
    // JPEG has no alpha; paint white so transparent PNGs don't turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("Could not process this image.");
    const name = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.release();
  }
}

export function AvatarUpload({
  image,
  firstName,
  lastName,
}: {
  image: string | null;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Shows the chosen file immediately, before the upload round-trip finishes.
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const uploadAvatar = useUploadAvatar();
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      const small = await shrinkImage(file);
      setPreview(URL.createObjectURL(small));
      await uploadAvatar.mutateAsync(small);

      toast.success("Photo updated.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      );
      setPreview(null);
    } finally {
      setLoading(false);
      // Allow re-picking the same file after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Section title="Photo" description="JPEG, PNG, or WebP. Large photos are resized automatically.">
      <FormMessage error={error} />

      <div className="flex items-center gap-4">
        <Avatar
          image={preview ?? image}
          firstName={firstName}
          lastName={lastName}
          className="w-16 h-16 text-lg"
        />

        <div>
          <input
            ref={inputRef}
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={loading}
            className="sr-only"
          />
          <label
            htmlFor="avatar"
            className={`${submitClass} inline-block cursor-pointer ${
              loading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {loading ? "Uploading..." : image ? "Change photo" : "Upload photo"}
          </label>
        </div>
      </div>
    </Section>
  );
}
