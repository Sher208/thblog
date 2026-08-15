import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { rehypePrettyCodeOptions } from "./rehype-pretty-code-options";
import { rehypeCodeCopy } from "./rehype-code-copy";

/** Client-side Markdown → HTML for live preview (includes Shiki highlighting). */
export async function renderMarkdownPreview(bodyMd: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypePrettyCode, rehypePrettyCodeOptions)
    .use(rehypeCodeCopy)
    .use(rehypeStringify)
    .process(bodyMd);

  return String(file);
}
