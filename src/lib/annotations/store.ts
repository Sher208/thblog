import type {
  Annotation,
  AnnotationInput,
  AnnotationUpdate,
} from "./types";
import {
  createLocalAnnotation,
  listLocalAnnotations,
  removeLocalAnnotation,
  updateLocalAnnotation,
} from "./local-store";

async function apiList(postId: string): Promise<Annotation[]> {
  const res = await fetch(
    `/api/annotations?postId=${encodeURIComponent(postId)}`,
  );
  if (!res.ok) {
    throw new Error("Failed to load annotations");
  }
  const data = (await res.json()) as { annotations: Annotation[] };
  return data.annotations;
}

async function apiCreate(input: AnnotationInput): Promise<Annotation> {
  const res = await fetch("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(err?.error ?? "Failed to create annotation");
  }
  const data = (await res.json()) as { annotation: Annotation };
  return data.annotation;
}

async function apiUpdate(
  id: string,
  update: AnnotationUpdate,
): Promise<Annotation> {
  const res = await fetch("/api/annotations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...update }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(err?.error ?? "Failed to update annotation");
  }
  const data = (await res.json()) as { annotation: Annotation };
  return data.annotation;
}

async function apiRemove(id: string): Promise<void> {
  const res = await fetch(
    `/api/annotations?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(err?.error ?? "Failed to delete annotation");
  }
}

export async function listAnnotations(
  postId: string,
  isAuthenticated: boolean,
): Promise<Annotation[]> {
  if (isAuthenticated) return apiList(postId);
  return listLocalAnnotations(postId);
}

export async function createAnnotation(
  input: AnnotationInput,
  isAuthenticated: boolean,
): Promise<Annotation> {
  if (isAuthenticated) return apiCreate(input);
  return createLocalAnnotation(input);
}

export async function updateAnnotation(
  postId: string,
  id: string,
  update: AnnotationUpdate,
  isAuthenticated: boolean,
): Promise<Annotation | null> {
  if (isAuthenticated) return apiUpdate(id, update);
  return updateLocalAnnotation(postId, id, update);
}

export async function removeAnnotation(
  postId: string,
  id: string,
  isAuthenticated: boolean,
): Promise<void> {
  if (isAuthenticated) {
    await apiRemove(id);
    return;
  }
  removeLocalAnnotation(postId, id);
}
