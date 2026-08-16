import type { Root } from "hast";
import { visit } from "unist-util-visit";

/** Opens markdown links in a new tab (skips same-page fragment anchors). */
export function rehypeExternalLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;

      const href = node.properties.href;
      if (typeof href !== "string" || !href || href.startsWith("#")) return;

      node.properties.target = "_blank";
      node.properties.rel = ["noopener", "noreferrer"];
    });
  };
}
