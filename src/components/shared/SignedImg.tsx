"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseStoredObject } from "@/lib/storagePath";

async function signStored(stored: string, deviceToken?: string | null) {
  const parsed = parseStoredObject(stored);
  if (!parsed) return "";
  if ("external" in parsed) return stored;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!deviceToken) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers,
    body: JSON.stringify({ stored, deviceToken: deviceToken || undefined }),
  });
  const json = await res.json().catch(() => ({}));
  return (json.url as string) || "";
}

export function SignedImg({
  stored,
  className,
  alt,
  deviceToken,
  onClick,
  onSigned,
}: {
  stored: string;
  className?: string;
  alt?: string;
  deviceToken?: string | null;
  onClick?: (url: string) => void;
  onSigned?: (url: string) => void;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let cancel = false;
    signStored(stored, deviceToken).then((url) => {
      if (!cancel) {
        setSrc(url);
        if (url) onSigned?.(url);
      }
    });
    return () => {
      cancel = true;
    };
  }, [stored, deviceToken, onSigned]);

  if (!src) return <span className={className} />;
  return (
    <img
      src={src}
      alt={alt || ""}
      className={className}
      onClick={onClick ? () => onClick(src) : undefined}
    />
  );
}
