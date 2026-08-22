import type {
  Annotation,
  AnnotationInput,
  AnnotationUpdate,
} from "./types";
import { DEFAULT_ANNOTATION_COLOR } from "./types";

const STORAGE_PREFIX = "thblog-annotations:";

function storageKey(postId: string) {
  return `${STORAGE_PREFIX}${postId}`;
}

function readAll(postId: string): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(postId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAnnotation);
  } catch {
    return [];
  }
}

function writeAll(postId: string, items: Annotation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(postId), JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

function isAnnotation(value: unknown): value is Annotation {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.postId === "string" &&
    (a.kind === "highlight" || a.kind === "note") &&
    typeof a.quote === "string" &&
    typeof a.prefix === "string" &&
    typeof a.suffix === "string" &&
    typeof a.startOffset === "number" &&
    typeof a.endOffset === "number"
  );
}

export function listLocalAnnotations(postId: string): Annotation[] {
  return readAll(postId);
}

export function createLocalAnnotation(input: AnnotationInput): Annotation {
  const now = Date.now();
  const annotation: Annotation = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `local_${now}_${Math.random().toString(36).slice(2, 10)}`,
    postId: input.postId,
    kind: input.kind,
    body: input.body ?? "",
    quote: input.quote,
    prefix: input.prefix,
    suffix: input.suffix,
    startOffset: input.startOffset,
    endOffset: input.endOffset,
    color: input.color ?? DEFAULT_ANNOTATION_COLOR,
    createdAt: now,
    updatedAt: now,
  };
  const items = readAll(input.postId);
  items.push(annotation);
  writeAll(input.postId, items);
  return annotation;
}

export function updateLocalAnnotation(
  postId: string,
  id: string,
  update: AnnotationUpdate,
): Annotation | null {
  const items = readAll(postId);
  const index = items.findIndex((a) => a.id === id);
  if (index < 0) return null;
  const current = items[index]!;
  const next: Annotation = {
    ...current,
    body: update.body !== undefined ? update.body : current.body,
    color: update.color !== undefined ? update.color : current.color,
    kind: update.kind !== undefined ? update.kind : current.kind,
    updatedAt: Date.now(),
  };
  items[index] = next;
  writeAll(postId, items);
  return next;
}

export function removeLocalAnnotation(postId: string, id: string): boolean {
  const items = readAll(postId);
  const next = items.filter((a) => a.id !== id);
  if (next.length === items.length) return false;
  writeAll(postId, next);
  return true;
}
