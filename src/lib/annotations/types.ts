export type AnnotationKind = "highlight" | "note";

export type Annotation = {
  id: string;
  postId: string;
  kind: AnnotationKind;
  body: string;
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type AnnotationInput = {
  postId: string;
  kind: AnnotationKind;
  body?: string;
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
  color?: string;
};

export type AnnotationUpdate = {
  body?: string;
  color?: string;
  kind?: AnnotationKind;
};

export const DEFAULT_ANNOTATION_COLOR = "amber";

export const CONTEXT_CHARS = 32;
