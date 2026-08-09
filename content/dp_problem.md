# Dynamic Programming Interview Mastery

## A Pattern-Based Guide from Recursion → Memoization → Tabulation

Dynamic Programming is often taught as a collection of problems:

- Climbing Stairs
- House Robber
- Knapsack
- Coin Change
- LCS
- Edit Distance
- Longest Increasing Subsequence
- Matrix Chain Multiplication
- Stock problems
- Burst Balloons

The problem with learning DP this way is that every new problem feels like a completely new puzzle.

It isn't.

Most DP interview problems are variations of a relatively small number of **state and transition patterns**.

The goal of this guide is therefore not to memorize solutions.

The goal is to learn how to look at a new problem and think:

> "I've seen this state structure before."

---

# 1. The DP Mental Model

Before learning individual patterns, understand what Dynamic Programming actually does.

Suppose a recursive solution looks like this:

```text
                    solve(problem)
                   /              \
             choice 1            choice 2
              /                     \
          subproblem              subproblem
             / \                    / \
            ...                    ...
```

The problem is that the same subproblems may appear repeatedly.

For example:

```text
                 f(5)
               /     \
             f(4)    f(3)
            /   \    /   \
          f(3) f(2) f(2) f(1)
```

`f(3)` and `f(2)` are calculated multiple times.

DP says:

> If a subproblem has already been solved, don't solve it again.

There are two primary ways to do this.

### Top-Down

Start with recursion and cache the results.

```text
Recursion
    ↓
Memoization
```

### Bottom-Up

Start with the smallest states and build the answer iteratively.

```text
Base cases
    ↓
Small problems
    ↓
Larger problems
    ↓
Final answer
```

So throughout this article, we'll follow:

```text
                 Problem
                    │
                    ↓
              Define state
                    │
                    ↓
                Recursion
                    │
                    ↓
             Add memoization
                    │
                    ↓
              Build tabulation
                    │
                    ↓
            Optimize space
```

---

# 2. The Five Questions You Should Ask in Every DP Problem

Before writing code, ask these questions.

## Question 1: What changes?

What variables completely describe the remaining problem?

For example:

```python
solve(i)
```

might mean:

> Solve the problem starting from index `i`.

Or:

```python
solve(i, capacity)
```

might mean:

> Solve using the first `i` items with `capacity` remaining.

Or:

```python
solve(i, j)
```

might mean:

> Solve the problem involving positions `i` and `j`.

Those variables become your DP state.

---

## Question 2: What are my choices?

Most recursive DP problems can be expressed as:

```text
At this state:

        ┌── choice 1
state ──┤
        └── choice 2
```

Examples:

```text
Knapsack:
    Take item
    Don't take item

House Robber:
    Rob house
    Skip house

Stock:
    Buy
    Sell
    Hold

LCS:
    Match
    Skip X
    Skip Y
```

---

## Question 3: What smaller state does each choice create?

This is where the recurrence comes from.

For example:

```python
take = value + solve(i + 1, capacity - weight)
skip = solve(i + 1, capacity)

return max(take, skip)
```

---

## Question 4: What is the base case?

Ask:

> When is there nothing left to solve?

Examples:

```python
if i == n:
    return 0
```

or:

```python
if capacity == 0:
    return 0
```

or:

```python
if i > j:
    return 0
```

---

## Question 5: What are we optimizing?

The transition usually contains one of these:

```text
max()       → maximize something
min()       → minimize something
+           → count ways
or          → determine existence
```

This distinction is extremely important.

---

# Pattern 1: 1D / Linear DP

## The simplest DP pattern

This is usually the first DP pattern you should learn.

The state depends on a **single index**.

```text
dp[i]
```

means something like:

> The best answer for the first `i` elements.

---

# How to recognize it

Look for problems involving:

- a sequence
- an array
- decisions made from left to right
- current answer depending on previous positions
- "maximum/minimum ways to reach..."
- "number of ways..."
- "best possible score..."

Common examples:

- Climbing Stairs
- House Robber
- Min Cost Climbing Stairs
- Decode Ways
- Maximum Sum of Non-Adjacent Elements

---

# Example: House Robber

You have houses containing money.

You cannot rob two adjacent houses.

Find the maximum amount you can steal.

Consider:

```text
[2, 7, 9, 3, 1]
```

At every house:

```text
Rob it
   OR
Skip it
```

This immediately suggests recursion.

---

## Step 1: Recursive

Define:

```python
solve(i)
```

as:

> Maximum money we can obtain starting from house `i`.

At house `i`:

```text
             house i
             /      \
          rob       skip
           |          |
       i + 2        i + 1
```

Therefore:

```python
def rob(nums):
    def solve(i):
        if i >= len(nums):
            return 0

        take = nums[i] + solve(i + 2)
        skip = solve(i + 1)

        return max(take, skip)

    return solve(0)
```

The recursion is correct.

But it repeatedly solves the same states.

---

# Step 2: Memoization

There are only `n` possible states:

```text
0, 1, 2, 3, ..., n-1
```

So cache them.

```python
from functools import lru_cache

def rob(nums):

    @lru_cache(None)
    def solve(i):
        if i >= len(nums):
            return 0

        take = nums[i] + solve(i + 2)
        skip = solve(i + 1)

        return max(take, skip)

    return solve(0)
```

Complexity:

```text
Time:  O(N)
Space: O(N)
```

---

# Step 3: Bottom-Up

Our recursive definition was:

```text
solve(i) = max(
    nums[i] + solve(i+2),
    solve(i+1)
)
```

Therefore:

```python
dp[i] = max(nums[i] + dp[i+2], dp[i+1])
```

Build the table from right to left.

```python
def rob(nums):
    n = len(nums)

    dp = [0] * (n + 2)

    for i in range(n - 1, -1, -1):
        dp[i] = max(
            nums[i] + dp[i + 2],
            dp[i + 1]
        )

    return dp[0]
```

---

# Step 4: Space Optimization

Notice that `dp[i]` only needs:

```text
dp[i+1]
dp[i+2]
```

We don't need the entire array.

```python
def rob(nums):
    next1 = 0
    next2 = 0

    for x in reversed(nums):
        current = max(x + next2, next1)

        next2 = next1
        next1 = current

    return next1
```

This is the general progression:

```text
Recursion
   ↓
Memoization
   ↓
O(N) DP
   ↓
O(1) DP
```

---

# Pattern 2: 0/1 Knapsack

This is one of the most important DP patterns for interviews.

The fundamental idea is:

> At every item, either take it or don't take it.

The "0/1" means:

```text
0 → don't take
1 → take once
```

---

# How to recognize it

Look for:

- items
- capacity
- target sum
- subset
- partition
- choose/not choose
- each element can be used at most once

Typical problems:

- 0/1 Knapsack
- Subset Sum
- Equal Sum Partition
- Count Subsets
- Minimum Subset Sum Difference
- Target Sum

---

# Example: 0/1 Knapsack

Given:

```text
weights = [1, 3, 4, 5]
values  = [1, 4, 5, 7]
capacity = 7
```

At every item:

```text
            item
           /    \
        take    skip
```

---

## Step 1: Recursive

Define:

```python
solve(i, capacity)
```

meaning:

> Maximum value using items from `i` onward with this much capacity remaining.

```python
def knapsack(wt, val, capacity, i):

    if i == len(wt) or capacity == 0:
        return 0

    skip = knapsack(wt, val, capacity, i + 1)

    take = 0

    if wt[i] <= capacity:
        take = val[i] + knapsack(
            wt,
            val,
            capacity - wt[i],
            i + 1
        )

    return max(take, skip)
```

Notice the important part:

```python
i + 1
```

after taking an item.

That is what makes it **0/1**.

---

# Step 2: Memoization

The state is:

```text
(i, capacity)
```

Therefore:

```python
from functools import lru_cache

def knapsack(wt, val, capacity):

    @lru_cache(None)
    def solve(i, remaining):

        if i == len(wt) or remaining == 0:
            return 0

        skip = solve(i + 1, remaining)

        take = 0

        if wt[i] <= remaining:
            take = val[i] + solve(
                i + 1,
                remaining - wt[i]
            )

        return max(take, skip)

    return solve(0, capacity)
```

Complexity:

```text
States = N × W
Time   = O(NW)
Space  = O(NW)
```

---

# Step 3: Tabulation

Our state:

```text
dp[i][w]
```

means:

> Best value using the first `i` items with capacity `w`.

Transition:

```text
don't take
    ↓
dp[i-1][w]

take
    ↓
value[i-1] + dp[i-1][w-weight]
```

Therefore:

```python
def knapsack(wt, val, W):

    n = len(wt)

    dp = [[0] * (W + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):

        for capacity in range(1, W + 1):

            skip = dp[i - 1][capacity]

            take = 0

            if wt[i - 1] <= capacity:
                take = (
                    val[i - 1]
                    + dp[i - 1][capacity - wt[i - 1]]
                )

            dp[i][capacity] = max(take, skip)

    return dp[n][W]
```

---

# The most important recognition trick

Whenever you see:

```text
Choose elements
+
Each element can be used once
+
Target/capacity constraint
```

think:

> **0/1 Knapsack**

Then ask whether you're:

```text
Maximizing → max()
Counting   → +
Existence  → OR
```

This single observation solves a huge family of problems.

---

# Pattern 3: Unbounded Knapsack

This looks almost identical to 0/1 Knapsack.

The only difference:

> You can use the same item repeatedly.

Examples:

- Coin Change
- Rod Cutting
- Unbounded Knapsack

---

# The critical difference

0/1:

```python
take → solve(i + 1, remaining - weight)
```

Unbounded:

```python
take → solve(i, remaining - weight)
```

That single difference changes the entire problem family.

---

# Example: Coin Change

Coins:

```text
[1, 2, 5]
```

Find the minimum number of coins needed to make:

```text
11
```

At every coin:

```text
Take coin
   OR
Skip coin
```

---

## Step 1: Recursive

```python
def solve(i, amount):

    if amount == 0:
        return 0

    if i == len(coins):
        return float("inf")

    skip = solve(i + 1, amount)

    take = float("inf")

    if coins[i] <= amount:
        take = 1 + solve(
            i,
            amount - coins[i]
        )

    return min(take, skip)
```

Notice:

```python
solve(i, ...)
```

after taking the coin.

We stay at the same item because it can be reused.

---

# Step 2: Memoization

```python
from functools import lru_cache

def coinChange(coins, amount):

    @lru_cache(None)
    def solve(i, remaining):

        if remaining == 0:
            return 0

        if i == len(coins):
            return float("inf")

        skip = solve(i + 1, remaining)

        take = float("inf")

        if coins[i] <= remaining:
            take = 1 + solve(
                i,
                remaining - coins[i]
            )

        return min(take, skip)

    ans = solve(0, amount)

    return -1 if ans == float("inf") else ans
```

---

# Step 3: Tabulation

```python
def coinChange(coins, amount):

    dp = [float("inf")] * (amount + 1)

    dp[0] = 0

    for current in range(1, amount + 1):

        for coin in coins:

            if coin <= current:
                dp[current] = min(
                    dp[current],
                    1 + dp[current - coin]
                )

    return -1 if dp[amount] == float("inf") else dp[amount]
```

The important idea:

```text
0/1 Knapsack
     ↓
Can't reuse item

Unbounded Knapsack
     ↓
Can reuse item
```

---

# Pattern 4: LCS / Two-Sequence DP

The Longest Common Subsequence family is another major DP pattern.

The key clue:

> You are comparing two sequences.

Examples:

- LCS
- Edit Distance
- Shortest Common Supersequence
- Longest Palindromic Subsequence
- Minimum insertions/deletions
- Sequence matching

---

# Example: Longest Common Subsequence

Given:

```text
A = "abcde"
B = "ace"
```

Answer:

```text
"ace"
```

Length:

```text
3
```

---

# The recursive thinking

Look at:

```text
A[i]
B[j]
```

There are two cases.

### Characters match

```text
A[i] == B[j]

        match
          ↓
      solve(i+1, j+1)
```

### Characters don't match

We have two choices:

```text
skip A[i]
        OR
skip B[j]
```

Therefore:

```text
solve(i, j)
    =
    1 + solve(i+1, j+1)      if equal

    max(
        solve(i+1, j),
        solve(i, j+1)
    )                        otherwise
```

---

# Step 1: Recursive

```python
def lcs(a, b):

    def solve(i, j):

        if i == len(a) or j == len(b):
            return 0

        if a[i] == b[j]:
            return 1 + solve(i + 1, j + 1)

        return max(
            solve(i + 1, j),
            solve(i, j + 1)
        )

    return solve(0, 0)
```

---

# Step 2: Memoization

```python
from functools import lru_cache

def lcs(a, b):

    @lru_cache(None)
    def solve(i, j):

        if i == len(a) or j == len(b):
            return 0

        if a[i] == b[j]:
            return 1 + solve(i + 1, j + 1)

        return max(
            solve(i + 1, j),
            solve(i, j + 1)
        )

    return solve(0, 0)
```

Complexity:

```text
States = M × N

Time   = O(MN)
Space  = O(MN)
```

---

# Step 3: Tabulation

```python
def lcs(a, b):

    m = len(a)
    n = len(b)

    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):

        for j in range(1, n + 1):

            if a[i - 1] == b[j - 1]:

                dp[i][j] = 1 + dp[i - 1][j - 1]

            else:

                dp[i][j] = max(
                    dp[i - 1][j],
                    dp[i][j - 1]
                )

    return dp[m][n]
```

---

# LCS Family

Once you understand this template, many problems become variations.

```text
LCS
 │
 ├── Longest Common Subsequence
 │
 ├── Shortest Common Supersequence
 │
 ├── Edit Distance
 │
 ├── Longest Palindromic Subsequence
 │
 ├── Minimum deletions
 │
 ├── Minimum insertions
 │
 └── Sequence Pattern Matching
```

For example:

```text
LPS(s)
=
LCS(s, reverse(s))
```

The important thing isn't memorizing that formula.

It's recognizing:

> "This problem compares two sequences."

---

# Pattern 5: Grid / Matrix DP

Grid DP appears when you move through a matrix.

Typical clues:

- move right/down
- reach destination
- minimum cost
- maximum reward
- number of paths

Examples:

- Unique Paths
- Unique Paths II
- Minimum Path Sum
- Maximum Path Sum
- Dungeon Game

---

# Example: Unique Paths

A robot starts at:

```text
(0, 0)
```

and wants to reach:

```text
(m-1, n-1)
```

It can move:

```text
→
↓
```

At every cell:

```text
        cell
       /    \
     ↓        →
```

---

# Step 1: Recursive

```python
def uniquePaths(m, n):

    def solve(r, c):

        if r == m - 1 and c == n - 1:
            return 1

        if r >= m or c >= n:
            return 0

        return (
            solve(r + 1, c)
            + solve(r, c + 1)
        )

    return solve(0, 0)
```

---

# Step 2: Memoization

State:

```text
(r, c)
```

```python
from functools import lru_cache

def uniquePaths(m, n):

    @lru_cache(None)
    def solve(r, c):

        if r == m - 1 and c == n - 1:
            return 1

        if r >= m or c >= n:
            return 0

        return (
            solve(r + 1, c)
            + solve(r, c + 1)
        )

    return solve(0, 0)
```

---

# Step 3: Tabulation

```python
def uniquePaths(m, n):

    dp = [[0] * n for _ in range(m)]

    for r in range(m):
        dp[r][0] = 1

    for c in range(n):
        dp[0][c] = 1

    for r in range(1, m):
        for c in range(1, n):

            dp[r][c] = (
                dp[r - 1][c]
                + dp[r][c - 1]
            )

    return dp[m - 1][n - 1]
```

The general structure is:

```text
dp[r][c]
   =
previous states
```

The exact transition changes depending on the problem.

---

# Pattern 6: Longest Increasing Subsequence

LIS is important enough to deserve its own pattern.

The clue:

> Find the longest subsequence satisfying an ordering condition.

Examples:

- Longest Increasing Subsequence
- Longest Decreasing Subsequence
- Russian Doll Envelopes
- Maximum Length Chain

---

# The DP State

For LIS:

```text
dp[i]
```

means:

> Length of the longest increasing subsequence ending at `i`.

For every previous index:

```text
j < i
```

if:

```text
nums[j] < nums[i]
```

then:

```text
dp[i] = max(dp[i], dp[j] + 1)
```

---

# Step 1: Recursive

A useful interview-friendly formulation is:

```python
def lis(nums):

    def solve(i, prev):

        if i == len(nums):
            return 0

        skip = solve(i + 1, prev)

        take = 0

        if prev == -1 or nums[i] > nums[prev]:
            take = 1 + solve(i + 1, i)

        return max(take, skip)

    return solve(0, -1)
```

The state is:

```text
(i, previous_index)
```

---

# Step 2: Memoization

```python
from functools import lru_cache

def lis(nums):

    @lru_cache(None)
    def solve(i, prev):

        if i == len(nums):
            return 0

        skip = solve(i + 1, prev)

        take = 0

        if prev == -1 or nums[i] > nums[prev]:
            take = 1 + solve(i + 1, i)

        return max(take, skip)

    return solve(0, -1)
```

---

# Step 3: Tabulation

A simpler bottom-up formulation uses:

```text
dp[i] = LIS ending at i
```

```python
def lis(nums):

    n = len(nums)

    dp = [1] * n

    for i in range(n):

        for j in range(i):

            if nums[j] < nums[i]:
                dp[i] = max(
                    dp[i],
                    dp[j] + 1
                )

    return max(dp)
```

Complexity:

```text
Time:  O(N²)
Space: O(N)
```

There is also an `O(N log N)` solution using a tails array and binary search, but the `O(N²)` DP is the important pattern to understand first.

---

# Pattern 7: State Machine DP

This pattern is extremely common in stock problems.

The key idea:

> Your state is not just an index. It also includes your current condition/status.

For example:

```text
i = current day

holding = 0/1
```

Therefore:

```text
dp[i][holding]
```

---

# Example: Best Time to Buy and Sell Stock II

You can buy and sell multiple times.

At each day:

```text
If not holding:

    Buy
    Skip

If holding:

    Sell
    Hold
```

This creates a state machine.

```text
              BUY
       ┌─────────────────┐
       ↓                 │
   NOT HOLDING ─────→ HOLDING
       ↑                 │
       └────── SELL ─────┘
```

---

# Step 1: Recursive

```python
def maxProfit(prices):

    def solve(i, holding):

        if i == len(prices):
            return 0

        skip = solve(i + 1, holding)

        if holding:

            sell = prices[i] + solve(
                i + 1,
                False
            )

            return max(skip, sell)

        else:

            buy = -prices[i] + solve(
                i + 1,
                True
            )

            return max(skip, buy)

    return solve(0, False)
```

---

# Step 2: Memoization

```python
from functools import lru_cache

def maxProfit(prices):

    @lru_cache(None)
    def solve(i, holding):

        if i == len(prices):
            return 0

        skip = solve(i + 1, holding)

        if holding:

            sell = prices[i] + solve(
                i + 1,
                False
            )

            return max(skip, sell)

        buy = -prices[i] + solve(
            i + 1,
            True
        )

        return max(skip, buy)

    return solve(0, False)
```

---

# Step 3: Tabulation

```python
def maxProfit(prices):

    n = len(prices)

    dp = [[0] * 2 for _ in range(n + 1)]

    for i in range(n - 1, -1, -1):

        dp[i][0] = max(
            dp[i + 1][0],
            -prices[i] + dp[i + 1][1]
        )

        dp[i][1] = max(
            dp[i + 1][1],
            prices[i] + dp[i + 1][0]
        )

    return dp[0][0]
```

This pattern extends naturally to:

- transaction fees
- cooldown
- limited transactions
- buy/sell multiple times

The state simply becomes richer.

For example:

```text
dp[i][transactions][holding]
```

---

# Pattern 8: Interval DP / Matrix Chain Multiplication

This pattern is different from the previous ones.

The key clue:

> You are solving a problem over a range `[i, j]` and trying every possible split point.

This is the pattern behind:

- Matrix Chain Multiplication
- Burst Balloons
- Palindrome Partitioning
- Boolean Parenthesization
- Optimal BST
- many interval games

---

# The mental picture

Suppose:

```text
[i ------------------------ j]
```

Try every split:

```text
[i ---- k] [k+1 ----------- j]
```

Then:

```text
answer(i,j)
=
best over every k
```

This is the essence of interval DP.

---

# Matrix Chain Multiplication

Suppose matrices must be multiplied.

The order matters because:

```text
(A × B) × C
```

can have a different cost from:

```text
A × (B × C)
```

---

# Step 1: Recursive

```python
def solve(arr, i, j):

    if i >= j:
        return 0

    ans = float("inf")

    for k in range(i, j):

        left = solve(arr, i, k)
        right = solve(arr, k + 1, j)

        cost = (
            arr[i - 1]
            * arr[k]
            * arr[j]
        )

        ans = min(
            ans,
            left + right + cost
        )

    return ans
```

Notice the structure:

```text
solve(i, j)

for k in range(i, j):
    solve(i, k)
    solve(k+1, j)
```

Whenever you see this structure, think:

> **Interval DP / MCM**

---

# Step 2: Memoization

```python
from functools import lru_cache

def matrixChain(arr):

    @lru_cache(None)
    def solve(i, j):

        if i >= j:
            return 0

        ans = float("inf")

        for k in range(i, j):

            cost = (
                solve(i, k)
                + solve(k + 1, j)
                + arr[i - 1] * arr[k] * arr[j]
            )

            ans = min(ans, cost)

        return ans

    return solve(1, len(arr) - 1)
```

---

# Step 3: Tabulation

Interval DP is usually filled by increasing interval length.

```python
def matrixChain(arr):

    n = len(arr)

    dp = [[0] * n for _ in range(n)]

    for length in range(2, n):

        for i in range(1, n - length + 1):

            j = i + length - 1

            dp[i][j] = float("inf")

            for k in range(i, j):

                cost = (
                    dp[i][k]
                    + dp[k + 1][j]
                    + arr[i - 1] * arr[k] * arr[j]
                )

                dp[i][j] = min(
                    dp[i][j],
                    cost
                )

    return dp[1][n - 1]
```

The important pattern:

```text
                    [i................j]
                         ↓
                 try every k
                    ↙       ↘
              [i..k]       [k+1..j]
```

---

# Pattern 9: Tree DP

Tree DP is fundamentally different because the state flows from children to parents.

The general idea:

```text
             node
            /    \
         left    right
           ↓       ↓
        result   result
            \     /
             node
```

You recursively solve the children first.

Then combine their results.

---

# Example: Diameter of Binary Tree

The diameter is the longest path between two nodes.

For each node:

```text
left height
right height
```

The path through the current node is:

```text
left + right
```

while the height returned to the parent is:

```text
1 + max(left, right)
```

---

# Step 1: Recursive

```python
def diameter(root):

    ans = 0

    def solve(node):

        nonlocal ans

        if not node:
            return 0

        left = solve(node.left)
        right = solve(node.right)

        ans = max(
            ans,
            left + right
        )

        return 1 + max(left, right)

    solve(root)

    return ans
```

This is already essentially the optimized DP solution.

---

# Why this is DP

Because each subtree is solved once.

The state is:

```text
node
```

and the result is reused by its parent.

---

# Tree DP Recognition

Look for:

```text
Tree
+
Each node depends on children
+
Need maximum/minimum/count
```

Think:

> **Tree DP**

Common problems:

- Diameter
- Maximum Path Sum
- House Robber III
- Binary Tree Cameras
- Maximum Independent Set on Tree

---

# Pattern 10: DAG / Graph DP

Some graph problems are DP problems in disguise.

The key clue:

> The graph has a direction and no cycles.

A DAG gives you a natural dependency order.

Example:

```text
A → B → D
 \       ↑
  → C ───┘
```

You can compute answers after computing all dependencies.

---

# Example: Longest Path in DAG

Suppose:

```text
u → v
```

Then:

```text
dp[v] = max(dp[v], dp[u] + weight)
```

The recurrence is very similar to LIS.

---

# Recursive

```python
def solve(node):

    if node in memo:
        return memo[node]

    best = 0

    for nei, weight in graph[node]:

        best = max(
            best,
            weight + solve(nei)
        )

    memo[node] = best

    return best
```

---

# Tabulation

Use topological ordering.

```python
for u in topo_order:

    for v, weight in graph[u]:

        dp[v] = max(
            dp[v],
            dp[u] + weight
        )
```

The important insight:

> DAG DP is essentially DP over dependencies.

---

# Pattern 11: Bitmask DP

This is one of the more advanced interview patterns.

The clue:

> You need to keep track of which elements have already been used.

If there are `N` elements, represent the selected elements using a bitmask.

Example:

```text
Elements:

A B C D

mask = 0101

A → selected
B → not selected
C → selected
D → not selected
```

The state often looks like:

```text
dp[mask][i]
```

meaning:

> We have already selected the elements represented by `mask` and are currently at `i`.

---

# Example: Traveling Salesman

You want the minimum cost to visit every city exactly once.

State:

```text
(mask, city)
```

Choices:

```text
Go to any unvisited city
```

---

# Recursive

```python
def solve(mask, city):

    if mask == all_visited:
        return cost[city][0]

    ans = float("inf")

    for nxt in range(n):

        if not (mask & (1 << nxt)):

            new_mask = mask | (1 << nxt)

            ans = min(
                ans,
                cost[city][nxt]
                + solve(new_mask, nxt)
            )

    return ans
```

---

# Memoization

```python
from functools import lru_cache

@lru_cache(None)
def solve(mask, city):

    if mask == all_visited:
        return cost[city][0]

    ans = float("inf")

    for nxt in range(n):

        if not (mask & (1 << nxt)):

            ans = min(
                ans,
                cost[city][nxt]
                + solve(
                    mask | (1 << nxt),
                    nxt
                )
            )

    return ans
```

The number of states is approximately:

```text
2^N × N
```

So bitmask DP is generally useful only for relatively small `N`.

---

# Pattern 12: Digit DP

Digit DP is less common than the other patterns but extremely powerful.

The clue:

> Count numbers within a range that satisfy some property involving their digits.

Examples:

- Count numbers with no repeated digits
- Count numbers containing a particular digit
- Count numbers with digit sum `K`
- Count numbers satisfying digit constraints

The state often looks like:

```text
(position, tight, started, other_state)
```

For example:

```text
dp(pos, tight, sum)
```

means:

> How many valid numbers can we create from this digit position onward, given the current digit sum and whether we are restricted by the upper bound?

---

# The `tight` idea

Suppose the upper bound is:

```text
527
```

If we have chosen:

```text
4
```

for the first digit, the next digit can be:

```text
0...9
```

because:

```text
4 < 5
```

But if we choose:

```text
5
```

then the next digit cannot exceed:

```text
2
```

That's what `tight` tracks.

```text
tight = True
    ↓
must respect upper bound

tight = False
    ↓
can choose 0...9
```

Digit DP is an advanced pattern and usually appears in harder interviews or competitive programming.

---

# Putting the Patterns Together

At this point, you should stop thinking:

> "Which DP problem is this?"

Instead ask:

> "Which state structure does this problem have?"

Here is the mental map.

```text
                         DP
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
     1 variable       2 variables       Complex state
        │                 │                 │
        ↓                 ↓                 ↓
     1D DP           Grid / LCS        State Machine
                    Knapsack           Bitmask
                                      Digit DP
        │
        └───────────────────────────────────────
```

And another useful classification:

```text
What is the structure?

Sequence
   → 1D DP / LIS

Two sequences
   → LCS

Choose / don't choose
   → 0/1 Knapsack

Unlimited reuse
   → Unbounded Knapsack

Grid
   → Grid DP

Range [i,j]
   → Interval / MCM

Tree
   → Tree DP

DAG
   → Graph DP

Current condition/state
   → State Machine DP

Subset of elements
   → Bitmask DP

Digits of a number
   → Digit DP
```

---

# The Most Important Interview Skill: Finding the State

The biggest mistake people make with DP is trying to remember the recurrence immediately.

Don't.

Start with the state.

For example:

## House Robber

Ask:

> What information determines the remaining problem?

Answer:

```text
current index
```

Therefore:

```text
dp[i]
```

---

## Knapsack

Ask:

> What determines the remaining problem?

Answer:

```text
current item
+
remaining capacity
```

Therefore:

```text
dp[i][capacity]
```

---

## LCS

Answer:

```text
position in string A
+
position in string B
```

Therefore:

```text
dp[i][j]
```

---

## Stock

Answer:

```text
day
+
whether I'm holding stock
```

Therefore:

```text
dp[i][holding]
```

---

## TSP

Answer:

```text
which cities have been visited
+
current city
```

Therefore:

```text
dp[mask][city]
```

---

# A Universal DP Workflow

When you encounter an unfamiliar DP problem in an interview, follow this exact sequence.

## Step 1: Ignore optimization

Write the brute-force recursive solution first.

Ask:

```text
What are my choices?
```

---

## Step 2: Define the state

Ask:

```text
What variables completely describe the remaining problem?
```

Write:

```python
solve(...)
```

before writing the recurrence.

---

## Step 3: Draw the choices

For example:

```text
             state
            /     \
         take     skip
```

or:

```text
             state
          /    |    \
       buy    hold   sell
```

or:

```text
             [i,j]
          /    |    \
       k=i   k=i+1   k=j-1
```

---

## Step 4: Write the recursive recurrence

Don't worry about performance yet.

Make it correct first.

---

## Step 5: Identify repeated states

If you see:

```text
solve(i)
solve(i, capacity)
solve(i, j)
solve(node)
solve(mask, i)
```

appearing repeatedly, you have overlapping subproblems.

---

## Step 6: Memoize

Put the state into a cache.

```python
@lru_cache(None)
def solve(...):
```

Now your recursive solution is usually enough to pass many constraints.

---

## Step 7: Convert to bottom-up

Take your recursive dependencies:

```text
dp[i] depends on dp[i+1]
```

and determine the correct iteration direction.

For example:

```text
dp[i] depends on dp[i-1]
        ↓
iterate left → right
```

while:

```text
dp[i] depends on dp[i+1]
        ↓
iterate right → left
```

For intervals:

```text
dp[i][j]
depends on smaller intervals
        ↓
iterate by increasing length
```

---

# The Recursion → Memoization → Tabulation Translation

This is one of the most valuable things to internalize.

Suppose you have:

```python
def solve(i):
    ...
```

Then:

```text
solve(i)
```

usually becomes:

```text
dp[i]
```

If you have:

```python
solve(i, j)
```

then:

```text
dp[i][j]
```

If you have:

```python
solve(i, capacity)
```

then:

```text
dp[i][capacity]
```

If you have:

```python
solve(mask, node)
```

then:

```text
dp[mask][node]
```

In other words:

> **Your recursive parameters are usually your DP dimensions.**

This is one of the most powerful DP transformations you can learn.

---

# How to Decide Between max, min, count and boolean

After identifying your states, determine what the problem wants.

## Maximum

Keywords:

```text
maximum
largest
longest
best
maximum profit
```

Usually:

```python
max(...)
```

---

## Minimum

Keywords:

```text
minimum
smallest
minimum cost
fewest
least
```

Usually:

```python
min(...)
```

---

## Counting

Keywords:

```text
number of ways
how many
count
```

Usually:

```python
left + right
```

---

## Boolean / Existence

Keywords:

```text
possible?
can we?
is there?
does a solution exist?
```

Usually:

```python
left or right
```

This explains why many apparently different problems are actually the same DP pattern.

---

# The DP Pattern Cheat Sheet

| Problem Structure      | Pattern            | Typical State       |
| ---------------------- | ------------------ | ------------------- |
| Sequence               | 1D DP              | `dp[i]`             |
| Non-adjacent choices   | 1D DP              | `dp[i]`             |
| Take / Don't Take      | 0/1 Knapsack       | `dp[i][capacity]`   |
| Reuse items            | Unbounded Knapsack | `dp[i][capacity]`   |
| Two strings            | LCS                | `dp[i][j]`          |
| Grid movement          | Grid DP            | `dp[r][c]`          |
| Increasing subsequence | LIS                | `dp[i]`             |
| Buy/Sell/Hold          | State Machine      | `dp[i][state]`      |
| Range partition        | Interval DP        | `dp[i][j]`          |
| Tree                   | Tree DP            | `dp[node][state]`   |
| DAG                    | Graph DP           | `dp[node]`          |
| Used subset            | Bitmask DP         | `dp[mask][i]`       |
| Number digits          | Digit DP           | `dp[pos][state...]` |

---

# The Patterns You Should Prioritize for Interviews

You don't need to master all patterns equally.

I would learn them in this order:

## Tier 1 — Must Know

```text
1. 1D DP
2. 0/1 Knapsack
3. Unbounded Knapsack
4. LCS
5. Grid DP
6. LIS
```

These give you the foundation.

---

## Tier 2 — Very Important

```text
7. State Machine DP
8. Interval / MCM DP
9. Tree DP
```

These cover many medium/hard interview problems.

---

## Tier 3 — Advanced

```text
10. DAG DP
11. Bitmask DP
12. Digit DP
```

Learn these after the first nine are comfortable.

---

# The Ultimate DP Recognition Checklist

When you see a new problem, run through this checklist.

```text
┌────────────────────────────────────────────┐
│            DP RECOGNITION CHECK            │
└────────────────────────────────────────────┘

1. Is this asking for:
   maximum / minimum / count / existence?

                    ↓

2. Are there overlapping subproblems?

                    ↓

3. What variables define the state?

                    ↓

4. What choices do I have?

                    ↓

5. Does the problem look like:

   One index?
       → 1D DP

   Take / skip?
       → 0/1 Knapsack

   Reuse items?
       → Unbounded Knapsack

   Two sequences?
       → LCS

   Grid?
       → Grid DP

   Increasing sequence?
       → LIS

   Buy / sell / hold?
       → State Machine

   Range [i,j] + split?
       → Interval DP

   Tree?
       → Tree DP

   DAG?
       → Graph DP

   Used subset?
       → Bitmask DP

   Digits of a number?
       → Digit DP
```

---

# One Final Principle

The biggest leap in DP comes when you stop asking:

> "Have I seen this exact problem before?"

and start asking:

> "What information describes the state of this problem?"

For example, these look completely different:

```text
House Robber
Knapsack
LCS
Stock Trading
TSP
Matrix Chain Multiplication
```

But underneath:

```text
House Robber
    → dp[i]

Knapsack
    → dp[i][capacity]

LCS
    → dp[i][j]

Stock
    → dp[i][holding]

TSP
    → dp[mask][city]

MCM
    → dp[i][j]
```

That's the real skill.

Once you can identify the state, the rest becomes mechanical:

```text
             Identify State
                   ↓
             Identify Choices
                   ↓
              Write Recursion
                   ↓
             Add Memoization
                   ↓
             Convert to DP
                   ↓
             Optimize Space
```

Dynamic Programming stops being a collection of tricks.

It becomes a process.

And that process is what you should practice for interviews.
