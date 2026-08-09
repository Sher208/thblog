# Dynamic Programming: The Interview Problem Set

## Common Problems, Patterns, and Python Solutions

This is the practical companion to the DP pattern guide.

The goal is simple:

> Learn the pattern, recognize the problem, and implement the solution.

For every pattern, we cover the most important interview problems with concise Python solutions.

---

# 1. 1D / Linear DP

The state usually looks like:

```python
dp[i]
```

Think:

> "What is the best/count/possible answer up to or starting from index `i`?"

---

## Problem 1: Climbing Stairs

### Pattern

At every step:

```text
Take 1 step
OR
Take 2 steps
```

### DP

```python
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 2:
            return n

        prev2 = 1
        prev1 = 2

        for _ in range(3, n + 1):
            curr = prev1 + prev2
            prev2 = prev1
            prev1 = curr

        return prev1
```

**Time:** `O(N)`
**Space:** `O(1)`

---

## Problem 2: Min Cost Climbing Stairs

```python
class Solution:
    def minCostClimbingStairs(self, cost):
        prev2 = 0
        prev1 = 0

        for i in range(2, len(cost) + 1):
            curr = min(
                prev1 + cost[i - 1],
                prev2 + cost[i - 2]
            )

            prev2 = prev1
            prev1 = curr

        return prev1
```

**Time:** `O(N)`
**Space:** `O(1)`

---

## Problem 3: House Robber

At every house:

```text
Rob
OR
Skip
```

```python
class Solution:
    def rob(self, nums):
        prev2 = 0
        prev1 = 0

        for money in nums:
            curr = max(
                prev1,
                prev2 + money
            )

            prev2 = prev1
            prev1 = curr

        return prev1
```

**Time:** `O(N)`
**Space:** `O(1)`

---

## Problem 4: House Robber II

Houses are arranged in a circle.

Therefore:

```text
Case 1: Don't rob first
Case 2: Don't rob last
```

```python
class Solution:
    def rob(self, nums):

        if len(nums) == 1:
            return nums[0]

        def rob_linear(arr):
            prev2 = 0
            prev1 = 0

            for x in arr:
                curr = max(
                    prev1,
                    prev2 + x
                )

                prev2 = prev1
                prev1 = curr

            return prev1

        return max(
            rob_linear(nums[:-1]),
            rob_linear(nums[1:])
        )
```

**Time:** `O(N)`
**Space:** `O(1)`

---

## Problem 5: Decode Ways

At every position:

```text
Decode one digit
OR
Decode two digits
```

```python
class Solution:
    def numDecodings(self, s):

        if not s or s[0] == '0':
            return 0

        prev2 = 1
        prev1 = 1

        for i in range(1, len(s)):

            curr = 0

            if s[i] != '0':
                curr += prev1

            two = int(s[i - 1:i + 1])

            if 10 <= two <= 26:
                curr += prev2

            prev2 = prev1
            prev1 = curr

        return prev1
```

---

# 2. 0/1 Knapsack

The key question:

> Can each item be used at most once?

If yes, think:

```text
Take
OR
Don't Take
```

---

## Problem 6: 0/1 Knapsack

```python
def knapsack(weights, values, capacity):

    n = len(weights)

    dp = [[0] * (capacity + 1)
          for _ in range(n + 1)]

    for i in range(1, n + 1):

        for w in range(capacity + 1):

            dp[i][w] = dp[i - 1][w]

            if weights[i - 1] <= w:
                dp[i][w] = max(
                    dp[i][w],
                    values[i - 1]
                    + dp[i - 1][w - weights[i - 1]]
                )

    return dp[n][capacity]
```

---

## Problem 7: Subset Sum

Question:

> Can we create `target` using each number at most once?

```python
def subset_sum(nums, target):

    dp = [False] * (target + 1)
    dp[0] = True

    for num in nums:

        for s in range(target, num - 1, -1):
            dp[s] = dp[s] or dp[s - num]

    return dp[target]
```

**Important:** Iterate backwards because each number can be used only once.

---

## Problem 8: Equal Sum Partition

If total sum is odd:

```text
Impossible
```

Otherwise:

```text
target = total_sum / 2
```

Then solve Subset Sum.

```python
def can_partition(nums):

    total = sum(nums)

    if total % 2:
        return False

    target = total // 2

    dp = [False] * (target + 1)
    dp[0] = True

    for num in nums:

        for s in range(target, num - 1, -1):
            dp[s] = dp[s] or dp[s - num]

    return dp[target]
```

---

## Problem 9: Count Subsets With Sum K

Here the DP operation changes from:

```text
OR
```

to:

```text
+
```

```python
def count_subsets(nums, target):

    dp = [0] * (target + 1)
    dp[0] = 1

    for num in nums:

        for s in range(target, num - 1, -1):
            dp[s] += dp[s - num]

    return dp[target]
```

---

## Problem 10: Minimum Subset Sum Difference

Find a subset sum as close as possible to:

```text
total / 2
```

```python
def min_subset_difference(nums):

    total = sum(nums)

    dp = [False] * (total + 1)
    dp[0] = True

    for num in nums:

        for s in range(total, num - 1, -1):
            dp[s] = dp[s] or dp[s - num]

    for s in range(total // 2, -1, -1):

        if dp[s]:
            return total - 2 * s
```

---

## Problem 11: Target Sum

Convert:

```text
+ and -
```

into a subset-sum problem.

```python
def findTargetSumWays(nums, target):

    total = sum(nums)

    if abs(target) > total:
        return 0

    if (total + target) % 2:
        return 0

    subset = (total + target) // 2

    dp = [0] * (subset + 1)
    dp[0] = 1

    for num in nums:

        for s in range(subset, num - 1, -1):
            dp[s] += dp[s - num]

    return dp[subset]
```

---

# 3. Unbounded Knapsack

The key difference:

```text
0/1 Knapsack
    ↓
Use item once

Unbounded
    ↓
Reuse item
```

---

## Problem 12: Coin Change

Minimum number of coins.

```python
class Solution:
    def coinChange(self, coins, amount):

        dp = [float('inf')] * (amount + 1)
        dp[0] = 0

        for current in range(1, amount + 1):

            for coin in coins:

                if coin <= current:
                    dp[current] = min(
                        dp[current],
                        1 + dp[current - coin]
                    )

        return (
            -1
            if dp[amount] == float('inf')
            else dp[amount]
        )
```

---

## Problem 13: Coin Change II

Count the number of combinations.

```python
class Solution:
    def change(self, amount, coins):

        dp = [0] * (amount + 1)
        dp[0] = 1

        for coin in coins:

            for current in range(
                coin,
                amount + 1
            ):
                dp[current] += dp[current - coin]

        return dp[amount]
```

Notice:

```text
0/1 → iterate backwards
Unbounded → iterate forwards
```

This is an extremely important interview detail.

---

## Problem 14: Rod Cutting

```python
def rod_cutting(prices, length):

    dp = [0] * (length + 1)

    for piece in range(1, length + 1):

        for current in range(
            piece,
            length + 1
        ):
            dp[current] = max(
                dp[current],
                prices[piece - 1]
                + dp[current - piece]
            )

    return dp[length]
```

---

# 4. LCS / Two-String DP

When two strings/sequences interact, think:

```text
dp[i][j]
```

---

## Problem 15: Longest Common Subsequence

```python
def lcs(a, b):

    m = len(a)
    n = len(b)

    dp = [[0] * (n + 1)
          for _ in range(m + 1)]

    for i in range(1, m + 1):

        for j in range(1, n + 1):

            if a[i - 1] == b[j - 1]:

                dp[i][j] = (
                    1 + dp[i - 1][j - 1]
                )

            else:

                dp[i][j] = max(
                    dp[i - 1][j],
                    dp[i][j - 1]
                )

    return dp[m][n]
```

---

## Problem 16: Longest Common Substring

Unlike LCS, mismatch means:

```text
0
```

```python
def longest_common_substring(a, b):

    m = len(a)
    n = len(b)

    dp = [[0] * (n + 1)
          for _ in range(m + 1)]

    answer = 0

    for i in range(1, m + 1):

        for j in range(1, n + 1):

            if a[i - 1] == b[j - 1]:

                dp[i][j] = (
                    1 + dp[i - 1][j - 1]
                )

                answer = max(
                    answer,
                    dp[i][j]
                )

    return answer
```

---

## Problem 17: Longest Palindromic Subsequence

Reverse the string and find LCS.

```python
def longest_palindromic_subsequence(s):

    return lcs(
        s,
        s[::-1]
    )
```

---

## Problem 18: Minimum Insertions to Make Palindrome

```text
Minimum insertions
=
N - Longest Palindromic Subsequence
```

```python
def min_insertions(s):

    lps = longest_palindromic_subsequence(s)

    return len(s) - lps
```

---

## Problem 19: Minimum Deletions to Make Palindrome

Same idea.

```python
def min_deletions(s):

    lps = longest_palindromic_subsequence(s)

    return len(s) - lps
```

---

## Problem 20: Shortest Common Supersequence Length

```python
def shortest_common_supersequence(a, b):

    common = lcs(a, b)

    return len(a) + len(b) - common
```

---

## Problem 21: Edit Distance

Operations:

```text
Insert
Delete
Replace
```

```python
def edit_distance(word1, word2):

    m = len(word1)
    n = len(word2)

    dp = [[0] * (n + 1)
          for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i

    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):

        for j in range(1, n + 1):

            if word1[i - 1] == word2[j - 1]:

                dp[i][j] = dp[i - 1][j - 1]

            else:

                dp[i][j] = 1 + min(
                    dp[i - 1][j],       # delete
                    dp[i][j - 1],       # insert
                    dp[i - 1][j - 1]    # replace
                )

    return dp[m][n]
```

---

# 5. Grid DP

Think:

```text
dp[row][column]
```

and identify the allowed movements.

---

## Problem 22: Unique Paths

```python
def unique_paths(m, n):

    dp = [[1] * n for _ in range(m)]

    for r in range(1, m):

        for c in range(1, n):

            dp[r][c] = (
                dp[r - 1][c]
                + dp[r][c - 1]
            )

    return dp[m - 1][n - 1]
```

---

## Problem 23: Unique Paths II

Some cells are blocked.

```python
def unique_paths_with_obstacles(grid):

    m = len(grid)
    n = len(grid[0])

    if grid[0][0] == 1:
        return 0

    dp = [[0] * n for _ in range(m)]
    dp[0][0] = 1

    for r in range(m):

        for c in range(n):

            if grid[r][c] == 1:
                dp[r][c] = 0
                continue

            if r > 0:
                dp[r][c] += dp[r - 1][c]

            if c > 0:
                dp[r][c] += dp[r][c - 1]

    return dp[m - 1][n - 1]
```

---

## Problem 24: Minimum Path Sum

```python
def min_path_sum(grid):

    m = len(grid)
    n = len(grid[0])

    dp = [[0] * n for _ in range(m)]

    dp[0][0] = grid[0][0]

    for r in range(m):

        for c in range(n):

            if r == 0 and c == 0:
                continue

            top = (
                dp[r - 1][c]
                if r > 0
                else float('inf')
            )

            left = (
                dp[r][c - 1]
                if c > 0
                else float('inf')
            )

            dp[r][c] = (
                grid[r][c]
                + min(top, left)
            )

    return dp[m - 1][n - 1]
```

---

# 6. Longest Increasing Subsequence

The basic DP state:

```text
dp[i]
=
LIS ending at i
```

---

## Problem 25: LIS

```python
def length_of_lis(nums):

    n = len(nums)

    dp = [1] * n

    for i in range(n):

        for j in range(i):

            if nums[j] < nums[i]:

                dp[i] = max(
                    dp[i],
                    dp[j] + 1
                )

    return max(dp, default=0)
```

**Time:** `O(N²)`
**Space:** `O(N)`

---

## Problem 26: Maximum Length Chain

For pairs `(a, b)`, where:

```text
a_next > b_previous
```

```python
def max_chain(pairs):

    pairs.sort()

    n = len(pairs)

    dp = [1] * n

    for i in range(n):

        for j in range(i):

            if pairs[j][1] < pairs[i][0]:

                dp[i] = max(
                    dp[i],
                    dp[j] + 1
                )

    return max(dp, default=0)
```

---

# 7. State Machine DP

Think:

```text
day + current state
```

Typical states:

```text
holding
not holding
cooldown
transactions remaining
```

---

## Problem 27: Best Time to Buy and Sell Stock II

```python
def max_profit(prices):

    cash = 0
    hold = float('-inf')

    for price in prices:

        cash = max(
            cash,
            hold + price
        )

        hold = max(
            hold,
            cash - price
        )

    return cash
```

A safer state-update version:

```python
def max_profit(prices):

    cash = 0
    hold = -prices[0]

    for price in prices[1:]:

        old_cash = cash

        cash = max(
            cash,
            hold + price
        )

        hold = max(
            hold,
            old_cash - price
        )

    return cash
```

---

## Problem 28: Stock With Cooldown

After selling:

```text
Must wait one day
```

```python
def max_profit(prices):

    if not prices:
        return 0

    hold = -prices[0]
    sold = 0
    cooldown = 0

    for price in prices[1:]:

        prev_hold = hold
        prev_sold = sold
        prev_cooldown = cooldown

        hold = max(
            prev_hold,
            prev_cooldown - price
        )

        sold = prev_hold + price

        cooldown = max(
            prev_cooldown,
            prev_sold
        )

    return max(sold, cooldown)
```

---

## Problem 29: Stock With Transaction Fee

```python
def max_profit(prices, fee):

    cash = 0
    hold = -prices[0]

    for price in prices[1:]:

        old_cash = cash

        cash = max(
            cash,
            hold + price - fee
        )

        hold = max(
            hold,
            old_cash - price
        )

    return cash
```

---

# 8. Interval / MCM DP

The defining structure:

```text
solve(i, j)

for k in range(i, j):
    solve(i, k)
    solve(k+1, j)
```

---

## Problem 30: Matrix Chain Multiplication

```python
def matrix_chain(arr):

    n = len(arr)

    dp = [[0] * n for _ in range(n)]

    for length in range(2, n):

        for i in range(1, n - length + 1):

            j = i + length - 1

            dp[i][j] = float('inf')

            for k in range(i, j):

                cost = (
                    dp[i][k]
                    + dp[k + 1][j]
                    + arr[i - 1]
                    * arr[k]
                    * arr[j]
                )

                dp[i][j] = min(
                    dp[i][j],
                    cost
                )

    return dp[1][n - 1]
```

---

## Problem 31: Palindrome Partitioning II

Minimum cuts needed.

```python
def min_cut(s):

    n = len(s)

    palindrome = [
        [False] * n
        for _ in range(n)
    ]

    for i in range(n - 1, -1, -1):

        for j in range(i, n):

            if (
                s[i] == s[j]
                and (
                    j - i <= 2
                    or palindrome[i + 1][j - 1]
                )
            ):
                palindrome[i][j] = True

    dp = [0] * n

    for i in range(n):

        if palindrome[0][i]:
            dp[i] = 0
            continue

        dp[i] = i

        for j in range(1, i + 1):

            if palindrome[j][i]:

                dp[i] = min(
                    dp[i],
                    dp[j - 1] + 1
                )

    return dp[-1]
```

---

## Problem 32: Burst Balloons

Classic interval DP.

```python
def max_coins(nums):

    nums = [1] + nums + [1]

    n = len(nums)

    dp = [[0] * n for _ in range(n)]

    for length in range(2, n):

        for left in range(
            0,
            n - length
        ):

            right = left + length

            for k in range(
                left + 1,
                right
            ):

                coins = (
                    nums[left]
                    * nums[k]
                    * nums[right]
                    + dp[left][k]
                    + dp[k][right]
                )

                dp[left][right] = max(
                    dp[left][right],
                    coins
                )

    return dp[0][n - 1]
```

---

# 9. Tree DP

The general pattern:

```text
Solve children
      ↓
Combine results
      ↓
Return state to parent
```

---

## Problem 33: Maximum Depth of Binary Tree

```python
def max_depth(root):

    if not root:
        return 0

    return 1 + max(
        max_depth(root.left),
        max_depth(root.right)
    )
```

---

## Problem 34: Diameter of Binary Tree

```python
def diameterOfBinaryTree(root):

    answer = 0

    def dfs(node):

        nonlocal answer

        if not node:
            return 0

        left = dfs(node.left)
        right = dfs(node.right)

        answer = max(
            answer,
            left + right
        )

        return 1 + max(left, right)

    dfs(root)

    return answer
```

---

## Problem 35: Maximum Path Sum

```python
def maxPathSum(root):

    answer = float('-inf')

    def dfs(node):

        nonlocal answer

        if not node:
            return 0

        left = max(
            0,
            dfs(node.left)
        )

        right = max(
            0,
            dfs(node.right)
        )

        answer = max(
            answer,
            node.val + left + right
        )

        return node.val + max(
            left,
            right
        )

    dfs(root)

    return answer
```

---

## Problem 36: House Robber III

At each node:

```text
Rob current
OR
Don't rob current
```

```python
def rob(root):

    def dfs(node):

        if not node:
            return (0, 0)

        left_rob, left_skip = dfs(node.left)
        right_rob, right_skip = dfs(node.right)

        rob_current = (
            node.val
            + left_skip
            + right_skip
        )

        skip_current = (
            max(left_rob, left_skip)
            + max(right_rob, right_skip)
        )

        return (
            rob_current,
            skip_current
        )

    return max(dfs(root))
```

This is a very important Tree DP pattern:

```text
dp[node][0] = skip node
dp[node][1] = rob node
```

---

# 10. DAG DP

The graph must have no cycles.

Typical approach:

```text
Topological Order
       ↓
DP transition
```

---

## Problem 37: Longest Path in DAG

```python
from collections import deque

def longest_path(n, edges):

    graph = [[] for _ in range(n)]
    indegree = [0] * n

    for u, v, weight in edges:

        graph[u].append((v, weight))
        indegree[v] += 1

    queue = deque(
        i for i in range(n)
        if indegree[i] == 0
    )

    dp = [0] * n

    while queue:

        u = queue.popleft()

        for v, weight in graph[u]:

            dp[v] = max(
                dp[v],
                dp[u] + weight
            )

            indegree[v] -= 1

            if indegree[v] == 0:
                queue.append(v)

    return max(dp)
```

---

# 11. Bitmask DP

Use when:

```text
N is small
+
Need to remember which elements were used
```

The common state:

```text
dp[mask][i]
```

---

## Problem 38: Traveling Salesman Problem

```python
def tsp(dist):

    n = len(dist)

    INF = float('inf')

    dp = [
        [INF] * n
        for _ in range(1 << n)
    ]

    dp[1][0] = 0

    for mask in range(1 << n):

        for city in range(n):

            if not (mask & (1 << city)):
                continue

            current = dp[mask][city]

            if current == INF:
                continue

            for nxt in range(n):

                if mask & (1 << nxt):
                    continue

                new_mask = (
                    mask | (1 << nxt)
                )

                dp[new_mask][nxt] = min(
                    dp[new_mask][nxt],
                    current + dist[city][nxt]
                )

    full = (1 << n) - 1

    return min(
        dp[full][city] + dist[city][0]
        for city in range(n)
    )
```

**Time:** `O(2^N × N²)`
**Space:** `O(2^N × N)`

---

# 12. Digit DP

Digit DP is more advanced.

Typical state:

```text
position
+
tight
+
additional constraint
```

---

## Problem 39: Count Numbers With Digit Sum

Count numbers from `0` to `N` having digit sum equal to `target`.

```python
from functools import lru_cache

def count_digit_sum(N, target):

    digits = list(map(int, str(N)))

    @lru_cache(None)
    def solve(pos, total, tight):

        if total > target:
            return 0

        if pos == len(digits):
            return int(total == target)

        limit = (
            digits[pos]
            if tight
            else 9
        )

        answer = 0

        for digit in range(limit + 1):

            answer += solve(
                pos + 1,
                total + digit,
                tight and digit == limit
            )

        return answer

    return solve(0, 0, True)
```

The exact implementation varies depending on the constraint, but the pattern is:

```text
position
    ↓
choose digit
    ↓
update state
    ↓
continue
```

---

# 13. A Few Important DP Problems That Don't Fit One Simple Bucket

Some interview problems combine patterns.

---

## Problem 40: Word Break

You are given a dictionary and need to determine whether a string can be segmented.

State:

```text
dp[i]
=
can prefix ending at i be formed?
```

```python
def wordBreak(s, wordDict):

    words = set(wordDict)

    dp = [False] * (len(s) + 1)

    dp[0] = True

    for i in range(1, len(s) + 1):

        for j in range(i):

            if (
                dp[j]
                and s[j:i] in words
            ):
                dp[i] = True
                break

    return dp[-1]
```

Pattern:

```text
1D DP + string partition
```

---

# Problem 41: Partition Equal Subset Sum

A very common interview problem.

```python
def canPartition(nums):

    total = sum(nums)

    if total % 2:
        return False

    target = total // 2

    dp = [False] * (target + 1)
    dp[0] = True

    for num in nums:

        for s in range(target, num - 1, -1):

            dp[s] = (
                dp[s]
                or dp[s - num]
            )

    return dp[target]
```

Pattern:

```text
0/1 Knapsack
```

---

# Problem 42: Maximum Product Subarray

This is a useful example of **state DP**.

Why?

Because a negative number can turn:

```text
minimum → maximum
```

So we track both.

```python
def maxProduct(nums):

    current_max = nums[0]
    current_min = nums[0]
    answer = nums[0]

    for num in nums[1:]:

        if num < 0:
            current_max, current_min = (
                current_min,
                current_max
            )

        current_max = max(
            num,
            num * current_max
        )

        current_min = min(
            num,
            num * current_min
        )

        answer = max(
            answer,
            current_max
        )

    return answer
```

This is a good reminder:

> DP state doesn't always mean an array called `dp`.

The variables themselves can represent the states.

---

# Problem 43: Coin Change — Recursive → Memoized → DP

This problem is worth seeing through the complete evolution.

## Recursive

```python
def coin_change_recursive(coins, amount):

    def solve(amount):

        if amount == 0:
            return 0

        if amount < 0:
            return float('inf')

        answer = float('inf')

        for coin in coins:

            answer = min(
                answer,
                1 + solve(amount - coin)
            )

        return answer

    result = solve(amount)

    return (
        -1
        if result == float('inf')
        else result
    )
```

---

## Memoized

```python
from functools import lru_cache

def coin_change_memo(coins, amount):

    @lru_cache(None)
    def solve(amount):

        if amount == 0:
            return 0

        if amount < 0:
            return float('inf')

        answer = float('inf')

        for coin in coins:

            answer = min(
                answer,
                1 + solve(amount - coin)
            )

        return answer

    result = solve(amount)

    return (
        -1
        if result == float('inf')
        else result
    )
```

---

## Bottom-Up

```python
def coin_change_dp(coins, amount):

    dp = [float('inf')] * (amount + 1)

    dp[0] = 0

    for current in range(1, amount + 1):

        for coin in coins:

            if coin <= current:

                dp[current] = min(
                    dp[current],
                    1 + dp[current - coin]
                )

    return (
        -1
        if dp[amount] == float('inf')
        else dp[amount]
    )
```

The transformation is:

```text
solve(amount)
       ↓
dp[amount]

solve(amount - coin)
       ↓
dp[amount - coin]
```

This is exactly how you should learn to convert recursion into tabulation.

---

# The Complete DP Interview Problem Map

Here is the problem set to practice.

## 1D DP

```text
□ Climbing Stairs
□ Min Cost Climbing Stairs
□ House Robber
□ House Robber II
□ Decode Ways
□ Word Break
□ Maximum Product Subarray
```

---

## 0/1 Knapsack

```text
□ 0/1 Knapsack
□ Subset Sum
□ Partition Equal Subset Sum
□ Count Subsets With Sum K
□ Minimum Subset Sum Difference
□ Target Sum
```

---

## Unbounded Knapsack

```text
□ Coin Change
□ Coin Change II
□ Rod Cutting
□ Unbounded Knapsack
```

---

## LCS / String DP

```text
□ Longest Common Subsequence
□ Longest Common Substring
□ Edit Distance
□ Shortest Common Supersequence
□ Longest Palindromic Subsequence
□ Minimum Insertions to Palindrome
□ Minimum Deletions to Palindrome
```

---

## Grid DP

```text
□ Unique Paths
□ Unique Paths II
□ Minimum Path Sum
□ Maximum Path Sum
□ Dungeon Game
```

---

## LIS

```text
□ Longest Increasing Subsequence
□ Longest Decreasing Subsequence
□ Maximum Length Chain
□ Russian Doll Envelopes
```

---

## State Machine DP

```text
□ Best Time to Buy/Sell Stock II
□ Stock With Cooldown
□ Stock With Transaction Fee
□ Stock With At Most K Transactions
```

---

## Interval DP

```text
□ Matrix Chain Multiplication
□ Palindrome Partitioning
□ Burst Balloons
□ Boolean Parenthesization
□ Optimal Binary Search Tree
```

---

## Tree DP

```text
□ Binary Tree Diameter
□ Maximum Path Sum
□ House Robber III
□ Binary Tree Cameras
□ Maximum Independent Set on Tree
```

---

## Graph / DAG DP

```text
□ Longest Path in DAG
□ Number of Paths in DAG
□ Minimum Cost Path in DAG
```

---

## Bitmask DP

```text
□ Traveling Salesman
□ Assignment Problem
□ Minimum Cost to Visit All Nodes
```

---

## Digit DP

```text
□ Count Numbers With Digit Sum
□ Count Numbers Without Repeated Digits
□ Count Numbers Containing Specific Digits
```

---

# Final DP Cheat Sheet

When you get a DP problem in an interview:

```text
                 START
                   │
                   ↓
        What are we optimizing?
       max / min / count / bool
                   │
                   ↓
          What changes over time?
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
      index      i,j       state
        │          │          │
        ↓          ↓          ↓
      1D DP     LCS/Grid    State DP
```

Then check the structure:

```text
Take / Skip?
    → 0/1 Knapsack

Take / Skip + Reuse?
    → Unbounded Knapsack

Two sequences?
    → LCS

Grid?
    → Grid DP

Increasing subsequence?
    → LIS

Buy / Sell / Hold?
    → State Machine DP

[i, j] + split k?
    → Interval DP

Children → Parent?
    → Tree DP

DAG dependencies?
    → Graph DP

Used subset?
    → Bitmask DP

Digits + range?
    → Digit DP
```

And finally:

```text
                    DP PROBLEM
                        │
                        ↓
                  Define State
                        │
                        ↓
                    Choices
                        │
                        ↓
                    Recursion
                        │
                        ↓
                  Memoization
                        │
                        ↓
                   Tabulation
                        │
                        ↓
                 Space Optimize
```

The objective is **not** to memorize these 40+ solutions.

The objective is to recognize that:

```text
Climbing Stairs ──────┐
House Robber ─────────┤
Decode Ways ──────────┤
                       ├── 1D DP
Word Break ───────────┘

Subset Sum ───────────┐
Target Sum ───────────┤
Partition ────────────┤
                       ├── 0/1 Knapsack
Count Subsets ────────┘

Coin Change ──────────┐
Rod Cutting ──────────┤
                       ├── Unbounded Knapsack
Coin Change II ───────┘

LCS ──────────────────┐
Edit Distance ────────┤
SCS ──────────────────┤
                       ├── LCS Family
LPS ──────────────────┘
```

Once you see the **family**, you already know most of the solution.

That's the level of DP pattern recognition you should aim for in interviews.
