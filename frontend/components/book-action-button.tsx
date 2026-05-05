"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { importGoogleBook } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { useToast } from "@/components/toast-provider";

export function BookActionButton({
  volumeId,
  existingSlug
}: {
  volumeId: string;
  existingSlug?: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (existingSlug) {
    return <Link href={`/books/${existingSlug}`} className="action-link">Open book</Link>;
  }

  async function importBook() {
    setPending(true);
    setError("");
    const access = getAccessToken();
    if (!access) {
      setError("Log in first to import books.");
      pushToast("Log in first to import books.", "error");
      router.push("/auth?mode=login");
      setPending(false);
      return;
    }

    try {
      const payload = await importGoogleBook(volumeId, access);
      pushToast(`Imported ${payload.title}. You can log and review it now.`);
      router.push(`/books/${payload.slug}`);
      router.refresh();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Import failed.", "error");
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button type="button" onClick={importBook} disabled={pending}>
        {pending ? "Importing..." : "Import to log"}
      </button>
      {error ? <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.9rem" }}>{error}</p> : null}
    </div>
  );
}
