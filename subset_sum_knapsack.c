/*
 * 简单的背包 / 子集和问题：从 n 件物品中选若干件，使重量之和恰好等于容量。
 * 只需任意一组解；无解输出 NO ANSWER。
 * 输入：第一行 n、容量 w；第二行 n 个正整数重量。
 * 输出：number:下标(1-based) weight:重量，每行一件；或 NO ANSWER。
 */

#include <stdio.h>
#include <string.h>

#define MAXN 100

static int n;
static int cap;
static int w[MAXN];
static int chosen[MAXN];
static int found;

static void print_solution(void) {
    for (int i = 0; i < n; i++) {
        if (chosen[i]) {
            printf("number:%d weight:%d\n", i + 1, w[i]);
        }
    }
}

/* 从第 idx 件开始决策，当前已选重量为 sum */
static void dfs(int idx, int sum) {
    if (found) {
        return;
    }
    if (sum == cap) {
        found = 1;
        print_solution();
        return;
    }
    if (idx >= n || sum > cap) {
        return;
    }

    chosen[idx] = 1;
    dfs(idx + 1, sum + w[idx]);
    if (found) {
        return;
    }
    chosen[idx] = 0;
    dfs(idx + 1, sum);
}

int main(void) {
    if (scanf("%d %d", &n, &cap) != 2) {
        return 1;
    }
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &w[i]) != 1) {
            return 1;
        }
    }

    memset(chosen, 0, sizeof(chosen));
    found = 0;
    dfs(0, 0);

    if (!found) {
        printf("NO ANSWER\n");
    }
    return 0;
}
