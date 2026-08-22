import type { Annotation } from "./types";
import { CONTEXT_CHARS } from "./types";

type TextNodeOffset = {
  node: Text;
  start: number;
  end: number;
};

function collectTextNodes(root: Node): TextNodeOffset[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: TextNodeOffset[] = [];
  let offset = 0;
  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    // Skip text inside existing annotation marks when measuring? No — we
    // measure the live DOM. Before re-paint we clear marks so offsets match
    // the plain content. While creating from a selection that already has
    // marks, text nodes inside marks are still valid.
    const length = text.data.length;
    nodes.push({ node: text, start: offset, end: offset + length });
    offset += length;
    current = walker.nextNode();
  }
  return nodes;
}

function rootPlainText(root: HTMLElement): string {
  return root.textContent ?? "";
}

/** Map a DOM Range to absolute text offsets within root. */
export function rangeToOffsets(
  root: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  if (!root.contains(range.commonAncestorContainer)) return null;
  const nodes = collectTextNodes(root);
  if (nodes.length === 0) return null;

  const start = pointToOffset(nodes, range.startContainer, range.startOffset);
  const end = pointToOffset(nodes, range.endContainer, range.endOffset);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function pointToOffset(
  nodes: TextNodeOffset[],
  container: Node,
  offset: number,
): number | null {
  if (container.nodeType === Node.TEXT_NODE) {
    const entry = nodes.find((n) => n.node === container);
    if (!entry) return null;
    return entry.start + Math.min(offset, entry.node.data.length);
  }

  // Container is an element: offset is a child index
  if (offset === 0) {
    // Start of element — find first text node descendant
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const first = walker.nextNode() as Text | null;
    if (!first) {
      // Empty element: use offset of next text after container
      return offsetBeforeNode(nodes, container);
    }
    const entry = nodes.find((n) => n.node === first);
    return entry?.start ?? null;
  }

  const child = container.childNodes[offset - 1];
  if (!child) {
    const last = container.childNodes[container.childNodes.length - 1];
    if (!last) return offsetBeforeNode(nodes, container);
    return offsetAfterNode(nodes, last);
  }
  return offsetAfterNode(nodes, child);
}

function offsetBeforeNode(nodes: TextNodeOffset[], node: Node): number | null {
  const walker = document.createTreeWalker(
    node.ownerDocument!.body,
    NodeFilter.SHOW_TEXT,
  );
  // Simpler: use textContent length of preceding siblings within root
  void walker;
  for (const entry of nodes) {
    if (
      node.compareDocumentPosition(entry.node) &
      Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      return entry.start;
    }
  }
  return nodes.length ? nodes[nodes.length - 1]!.end : 0;
}

function offsetAfterNode(nodes: TextNodeOffset[], node: Node): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const entry = nodes.find((n) => n.node === node);
    return entry?.end ?? null;
  }
  let last: TextNodeOffset | null = null;
  for (const entry of nodes) {
    if (node.contains(entry.node)) last = entry;
  }
  if (last) return last.end;
  return offsetBeforeNode(nodes, node);
}

/** Build a Range from absolute text offsets within root. */
export function offsetsToRange(
  root: HTMLElement,
  start: number,
  end: number,
): Range | null {
  if (end <= start) return null;
  const nodes = collectTextNodes(root);
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;

  for (const entry of nodes) {
    if (!startNode && start >= entry.start && start <= entry.end) {
      startNode = entry.node;
      startOff = start - entry.start;
    }
    if (!endNode && end >= entry.start && end <= entry.end) {
      endNode = entry.node;
      endOff = end - entry.start;
    }
  }

  if (!startNode || !endNode) return null;
  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    return range;
  } catch {
    return null;
  }
}

export type TextSelector = {
  quote: string;
  prefix: string;
  suffix: string;
  startOffset: number;
  endOffset: number;
};

/** Create a quote+position selector from the current Range inside root. */
export function createSelectorFromRange(
  root: HTMLElement,
  range: Range,
): TextSelector | null {
  const offsets = rangeToOffsets(root, range);
  if (!offsets) return null;
  const text = rootPlainText(root);
  const quote = text.slice(offsets.start, offsets.end);
  if (!quote.trim()) return null;
  const prefix = text.slice(
    Math.max(0, offsets.start - CONTEXT_CHARS),
    offsets.start,
  );
  const suffix = text.slice(
    offsets.end,
    Math.min(text.length, offsets.end + CONTEXT_CHARS),
  );
  return {
    quote,
    prefix,
    suffix,
    startOffset: offsets.start,
    endOffset: offsets.end,
  };
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);
  for (let j = 0; j < cols; j++) prev[j] = j;
  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost,
      );
    }
    for (let j = 0; j < cols; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

function findExactMatches(haystack: string, needle: string): number[] {
  const hits: number[] = [];
  if (!needle) return hits;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    hits.push(idx);
    from = idx + 1;
  }
  return hits;
}

function scoreMatch(
  text: string,
  start: number,
  quote: string,
  prefix: string,
  suffix: string,
): number {
  const end = start + quote.length;
  const actualPrefix = text.slice(Math.max(0, start - prefix.length), start);
  const actualSuffix = text.slice(end, end + suffix.length);
  let score = 0;
  if (actualPrefix === prefix) score += 10;
  else if (normalizeWs(actualPrefix) === normalizeWs(prefix)) score += 6;
  else score += Math.max(0, 4 - levenshtein(actualPrefix, prefix));

  if (actualSuffix === suffix) score += 10;
  else if (normalizeWs(actualSuffix) === normalizeWs(suffix)) score += 6;
  else score += Math.max(0, 4 - levenshtein(actualSuffix, suffix));

  return score;
}

/**
 * Resolve a stored selector to absolute offsets in the current root text.
 * Exact quote + best prefix/suffix, then fuzzy fallback near startOffset.
 */
export function resolveSelector(
  root: HTMLElement,
  selector: Pick<
    Annotation,
    "quote" | "prefix" | "suffix" | "startOffset" | "endOffset"
  >,
): { start: number; end: number } | null {
  const text = rootPlainText(root);
  const { quote, prefix, suffix, startOffset } = selector;
  if (!quote) return null;

  const exact = findExactMatches(text, quote);
  if (exact.length === 1) {
    return { start: exact[0]!, end: exact[0]! + quote.length };
  }
  if (exact.length > 1) {
    let best = exact[0]!;
    let bestScore = -Infinity;
    for (const hit of exact) {
      const s = scoreMatch(text, hit, quote, prefix, suffix);
      // Prefer closer to original offset on ties
      const distPenalty = Math.abs(hit - startOffset) * 0.001;
      const total = s - distPenalty;
      if (total > bestScore) {
        bestScore = total;
        best = hit;
      }
    }
    return { start: best, end: best + quote.length };
  }

  // Fuzzy: search near original offset with normalized whitespace
  const normQuote = normalizeWs(quote);
  if (!normQuote) return null;

  const windowRadius = Math.max(240, Math.min(800, quote.length * 3));
  const winStart = Math.max(0, startOffset - windowRadius);
  const winEnd = Math.min(text.length, startOffset + windowRadius + quote.length);
  const window = text.slice(winStart, winEnd);

  const targetLen = quote.length;
  const minLen = Math.max(1, Math.floor(targetLen * 0.8));
  const maxLen = Math.ceil(targetLen * 1.2);
  const maxDist = Math.max(2, Math.floor(normQuote.length * 0.2));
  const step = Math.max(1, Math.floor(targetLen / 20));

  let bestStart = -1;
  let bestEnd = -1;
  let bestScore = -Infinity;

  // Seed candidates from a short distinctive prefix of the quote
  const seed = normQuote.slice(0, Math.min(12, normQuote.length));
  const candidateStarts = new Set<number>();
  if (seed.length >= 3) {
    let from = 0;
    const rawWindow = window;
    while (from < rawWindow.length) {
      const idx = rawWindow.indexOf(seed.slice(0, 3), from);
      if (idx === -1) break;
      candidateStarts.add(idx);
      from = idx + 1;
    }
  }
  // Also sample evenly near the original offset
  for (let i = 0; i + minLen <= window.length; i += step) {
    candidateStarts.add(i);
  }

  for (const i of candidateStarts) {
    for (let len = minLen; len <= maxLen; len += Math.max(1, Math.floor(step / 2))) {
      if (i + len > window.length) break;
      const candidate = window.slice(i, i + len);
      const normCandidate = normalizeWs(candidate);
      if (!normCandidate) continue;
      const dist = levenshtein(normCandidate, normQuote);
      if (dist > maxDist) continue;
      const absStart = winStart + i;
      const contextScore = scoreMatch(
        text,
        absStart,
        candidate,
        prefix,
        suffix,
      );
      const score =
        contextScore * 2 -
        dist * 3 -
        Math.abs(absStart - startOffset) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        bestStart = absStart;
        bestEnd = absStart + len;
      }
    }
  }

  if (bestStart < 0) return null;
  return { start: bestStart, end: bestEnd };
}

export function clearAnnotationMarks(root: HTMLElement) {
  const marks = root.querySelectorAll("mark[data-annotation-id]");
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}

function wrapRangeWithMark(
  range: Range,
  annotation: Pick<Annotation, "id" | "kind" | "color">,
): boolean {
  if (range.collapsed) return false;
  return wrapRangeByTextNodes(range, annotation);
}

function wrapRangeByTextNodes(
  range: Range,
  annotation: Pick<Annotation, "id" | "kind" | "color">,
): boolean {
  const root = range.commonAncestorContainer;
  const rootEl =
    root.nodeType === Node.ELEMENT_NODE
      ? (root as HTMLElement)
      : root.parentElement;
  if (!rootEl) return false;

  // Re-collect intersecting text nodes from the original range bounds
  // After extract failure we still have the range points
  try {
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
    );
    const toWrap: { node: Text; start: number; end: number }[] = [];
    let node = walker.nextNode();
    while (node) {
      const text = node as Text;
      if (range.intersectsNode(text)) {
        let start = 0;
        let end = text.data.length;
        if (text === range.startContainer) start = range.startOffset;
        if (text === range.endContainer) end = range.endOffset;
        if (end > start) toWrap.push({ node: text, start, end });
      }
      node = walker.nextNode();
    }

    // Wrap from the end so earlier offsets stay valid
    for (let i = toWrap.length - 1; i >= 0; i--) {
      const part = toWrap[i]!;
      const mark = document.createElement("mark");
      mark.dataset.annotationId = annotation.id;
      mark.dataset.kind = annotation.kind;
      if (annotation.color) mark.dataset.color = annotation.color;
      mark.className = "annotation-mark";

      const full = part.node;
      const mid =
        part.start === 0 && part.end === full.data.length
          ? full
          : (() => {
              if (part.end < full.data.length) full.splitText(part.end);
              if (part.start > 0) return full.splitText(part.start);
              return full;
            })();

      mid.parentNode?.insertBefore(mark, mid);
      mark.appendChild(mid);
    }
    return toWrap.length > 0;
  } catch {
    return false;
  }
}

/** Clear existing marks and paint all resolvable annotations. */
export function applyAnnotations(
  root: HTMLElement,
  annotations: Annotation[],
): void {
  clearAnnotationMarks(root);
  // Apply longest first so nested overlaps behave more predictably
  const sorted = [...annotations].sort(
    (a, b) => b.quote.length - a.quote.length,
  );
  for (const annotation of sorted) {
    const resolved = resolveSelector(root, annotation);
    if (!resolved) continue;
    const range = offsetsToRange(root, resolved.start, resolved.end);
    if (!range) continue;
    wrapRangeWithMark(range, annotation);
  }
}

/** Return the Selection Range if it is a non-empty selection inside root. */
export function getSelectionRangeInRoot(root: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const text = range.toString();
  if (!text.trim()) return null;
  return range;
}
