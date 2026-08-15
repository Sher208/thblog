import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

const COPY_ICON: Element = {
  type: "element",
  tagName: "svg",
  properties: {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    className: ["code-block-copy-icon", "code-block-copy-icon--copy"],
  },
  children: [
    {
      type: "element",
      tagName: "rect",
      properties: {
        width: "14",
        height: "14",
        x: "8",
        y: "8",
        rx: "2",
        ry: "2",
      },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
      },
      children: [],
    },
  ],
};

const CHECK_ICON: Element = {
  type: "element",
  tagName: "svg",
  properties: {
    xmlns: "http://www.w3.org/2000/svg",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    className: ["code-block-copy-icon", "code-block-copy-icon--check"],
    hidden: true,
  },
  children: [
    {
      type: "element",
      tagName: "path",
      properties: { d: "M20 6 9 17l-5-5" },
      children: [],
    },
  ],
};

function hasCopyToolbar(node: Element): boolean {
  return node.children.some(
    (child) =>
      child.type === "element" &&
      child.properties != null &&
      (child.properties["data-code-copy"] != null ||
        child.properties.dataCodeCopy != null),
  );
}

function languageFromPre(figure: Element): string | null {
  const pre = figure.children.find(
    (child): child is Element =>
      child.type === "element" && child.tagName === "pre",
  );
  if (!pre?.properties) return null;
  const raw =
    pre.properties["data-language"] ?? pre.properties.dataLanguage ?? null;
  if (typeof raw !== "string") return null;
  const lang = raw.trim().toLowerCase();
  if (!lang || lang === "txt" || lang === "text" || lang === "plain") {
    return null;
  }
  return lang;
}

function copyToolbar(lang: string | null): Element {
  const children: ElementContent[] = [];

  if (lang) {
    children.push({
      type: "element",
      tagName: "span",
      properties: { className: ["code-block-lang"] },
      children: [{ type: "text", value: lang }],
    });
  }

  children.push({
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["code-block-copy"],
      "aria-label": "Copy code",
      "data-code-copy-btn": "",
    },
    children: [structuredClone(COPY_ICON), structuredClone(CHECK_ICON)],
  });

  return {
    type: "element",
    tagName: "div",
    properties: {
      className: ["code-block-toolbar"],
      "data-code-copy": "",
    },
    children,
  };
}

/** Adds a visible Copy control to rehype-pretty-code figures. */
export function rehypeCodeCopy() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "figure" || !node.properties) return;
      if (
        node.properties["data-rehype-pretty-code-figure"] == null &&
        node.properties.dataRehypePrettyCodeFigure == null
      ) {
        return;
      }
      if (hasCopyToolbar(node)) return;

      const rawClass = node.properties.className;
      const classes: string[] = Array.isArray(rawClass)
        ? rawClass.map(String)
        : rawClass == null || rawClass === true
          ? []
          : String(rawClass).split(/\s+/).filter(Boolean);
      if (!classes.includes("code-block-host")) {
        classes.push("code-block-host");
      }
      node.properties.className = classes;
      node.children.push(copyToolbar(languageFromPre(node)));
    });
  };
}
