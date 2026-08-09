import type { Options } from "rehype-pretty-code";

/** Shared Shiki options for published posts and live preview. */
export const rehypePrettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark",
  },
  keepBackground: false,
  defaultLang: "txt",
} satisfies Partial<Options>;
