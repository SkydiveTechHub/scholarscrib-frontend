"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useUploadAvatar } from "@/hooks/api/use-user";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage, Section, submitClass } from "./section";

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
  const [success, setSuccess] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      await uploadAvatar.mutateAsync(file);

      setSuccess("Photo updated.");
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
    <Section title="Photo" description="JPEG, PNG, or WebP, up to 2MB.">
      <FormMessage error={error} success={success} />

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
