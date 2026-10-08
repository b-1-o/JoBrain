import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/require-auth-user";
import {
  MEDIA_KINDS,
  buildMediaObjectKey,
  type MediaKind,
  validateMediaBytes,
} from "@/lib/media";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isMediaKind(value: unknown): value is MediaKind {
  return typeof value === "string" && (MEDIA_KINDS as readonly string[]).includes(value);
}

async function putBlob(pathname: string, body: Uint8Array, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("STORAGE_UNAVAILABLE");

  const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
      "x-api-version": "7",
      "x-vercel-blob-access": "public",
    },
    body: Buffer.from(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Blob upload failed.");
  }

  return (await response.json()) as { url: string; pathname: string };
}

async function deleteBlob(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  await fetch("https://blob.vercel-storage.com/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-api-version": "7",
    },
    body: JSON.stringify({ urls: [url] }),
  }).catch(() => undefined);
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Media storage is not configured. Set BLOB_READ_WRITE_TOKEN (Vercel Blob) or paste a public image URL.",
        code: "STORAGE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const kindRaw = form.get("kind");
  const file = form.get("file");

  if (!isMediaKind(kindRaw)) {
    return NextResponse.json({ error: "Invalid media kind." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const validation = validateMediaBytes(kindRaw, buffer, file.type);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const key = buildMediaObjectKey(user.id, kindRaw, validation.mime);

  try {
    const blob = await putBlob(key, buffer, validation.mime);
    const field =
      kindRaw === "avatar" ? "avatarUrl" : kindRaw === "banner" ? "bannerUrl" : "backgroundUrl";

    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { [field]: blob.url },
      create: {
        userId: user.id,
        displayName: user.name,
        [field]: blob.url,
      },
    });

    return NextResponse.json({ url: blob.url, kind: kindRaw, profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { kind?: unknown };
  if (!isMediaKind(body.kind)) {
    return NextResponse.json({ error: "Invalid media kind." }, { status: 400 });
  }

  const field =
    body.kind === "avatar" ? "avatarUrl" : body.kind === "banner" ? "bannerUrl" : "backgroundUrl";

  const existing = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const previous = existing?.[field] ?? null;

  if (previous && previous.includes("blob.vercel-storage.com")) {
    await deleteBlob(previous);
  }

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { [field]: null },
    create: { userId: user.id, displayName: user.name, [field]: null },
  });

  return NextResponse.json({ ok: true, profile });
}
