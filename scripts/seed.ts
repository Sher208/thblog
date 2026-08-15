import "dotenv/config";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { account, user } from "../src/lib/db/schema";
import { createId } from "../src/lib/id";
import { createPostFromMarkdown } from "../src/lib/posts";

const SAMPLE_PUBLIC = `---
title: Two Sum — Hash Map Pattern
slug: two-sum-hash-map
tags: [arrays, hash-map]
excerpt: Find two numbers that add up to a target in O(n) with a complement map.
visibility: public
series: array-patterns
seriesTitle: Array Patterns
seriesOrder: 1
---

## Problem

Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

## Pattern

Use a **hash map** of value → index. For each number, check if \`target - num\` was already seen.

## Approach

1. Walk the array once.
2. For each \`nums[i]\`, look up \`target - nums[i]\` in the map.
3. If found, return both indices.
4. Otherwise store \`nums[i] → i\`.

## Solution

\`\`\`ts
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }

  return [];
}
\`\`\`

## Complexity

- Time: \`O(n)\`
- Space: \`O(n)\`
`;

const SAMPLE_PUBLIC_TWO = `---
title: Contains Duplicate — Set Pattern
slug: contains-duplicate-set
tags: [arrays, hash-map]
excerpt: Detect duplicates in one pass with a set.
visibility: public
series: array-patterns
seriesTitle: Array Patterns
seriesOrder: 2
---

## Problem

Given an integer array \`nums\`, return \`true\` if any value appears at least twice.

## Pattern

Keep a set of values seen so far. If the current value is already in the set, you found a duplicate.

## Solution

\`\`\`ts
function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
\`\`\`

## Complexity

- Time: \`O(n)\`
- Space: \`O(n)\`
`;

const SAMPLE_PRIVATE = `---
title: Draft — Sliding Window Template
slug: sliding-window-template
tags: [arrays, sliding-window]
excerpt: Private draft of the fixed and variable sliding window skeleton.
visibility: private
series: array-patterns
seriesTitle: Array Patterns
seriesOrder: 3
---

## When to use

Contiguous subarrays / substrings with a running constraint (sum, unique chars, etc.).

## Fixed window

\`\`\`ts
function fixedWindow(nums: number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;

  for (let i = k; i < nums.length; i++) {
    sum += nums[i] - nums[i - k];
    best = Math.max(best, sum);
  }

  return best;
}
\`\`\`

## Variable window

Expand \`right\`, shrink \`left\` while the invariant is broken, track the answer.
`;

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@thblog.local";
  const password = process.env.ADMIN_PASSWORD ?? "changeme-thblog";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const id = createId("user");
  const now = new Date();
  const hashed = await hashPassword(password);

  await db.insert(user).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: createId("acc"),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Created admin: ${email}`);
}

async function seedPosts() {
  // Opt-in only — avoids polluting an existing blog with sample notes.
  if (process.env.SEED_SAMPLE_POSTS !== "true") {
    console.log("Skipping sample posts (set SEED_SAMPLE_POSTS=true to enable)");
    return;
  }

  await createPostFromMarkdown(SAMPLE_PUBLIC, "two-sum.md");
  await createPostFromMarkdown(SAMPLE_PUBLIC_TWO, "contains-duplicate.md");
  await createPostFromMarkdown(SAMPLE_PRIVATE, "sliding-window.md");
  console.log("Seeded sample posts (2 public, 1 private)");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./data/thblog.db";
  if (dbUrl.startsWith("file:")) {
    const filePath = dbUrl.replace(/^file:/, "");
    mkdirSync(dirname(filePath), { recursive: true });
  }

  await ensureAdmin();
  await seedPosts();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
