import GithubSlugger from "github-slugger";
import type { Heading, PhrasingContent, Root as MdastRoot } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

function phrasingText(node: PhrasingContent | Heading): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  if ("children" in node && Array.isArray(node.children)) {
    return node.children
      .map((child) => phrasingText(child as PhrasingContent))
      .join("");
  }
  return "";
}

/** Build a heading outline from an mdast tree (h1–h3). */
export function extractTocFromTree(tree: MdastRoot): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];

  visit(tree, "heading", (node: Heading) => {
    if (node.depth < 1 || node.depth > 3) return;
    const text = phrasingText(node).trim();
    if (!text) return;
    items.push({
      id: slugger.slug(text),
      text,
      level: node.depth,
    });
  });

  return items;
}

/** Heading outline for editor / read views — matches remark + github-slugger. */
export function extractTocFromMarkdown(bodyMd: string): TocItem[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(bodyMd);
  return extractTocFromTree(tree as MdastRoot);
}
