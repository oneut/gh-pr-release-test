#!/bin/bash

set -euo pipefail

if [ $# -ne 3 ]; then
    echo "Usage: $0 <base_branch> <head_branch> <pr_number>"
    exit 1
fi

base_branch=$1
head_branch=$2
pr_number=$3

echo "Base branch: $base_branch"
echo "Head branch: $head_branch"
echo "Pull Request number: $pr_number"

git fetch
commit_hashes=$(git --no-pager log origin/"$base_branch"..origin/"$head_branch" --merges --oneline --format="%H" --first-parent)

# ユニークなラベルを格納する配列
declare -A unique_labels

# バッチ処理
for hash in $commit_hashes; do
    echo "Processing commit: $hash"

    # GitHub CLIを使用してプルリクエストを検索し、ラベルを含める
    # head ブランチにマージされたプルリクエストを検索
    pr_data=$(gh pr list --state merged --base "$head_branch" --search "hash:$hash" --json number,title,url,mergeCommit,labels,mergedAt)
    # プルリクのタイトルを表示
    title=$(echo "$pr_data" | jq -r '.[].title')
    echo "  PR title: $title"

    # jqを使用してラベルを抽出し、ユニークなラベルを追加
    labels=$(echo "$pr_data" | jq -r '.[].labels[].name')

    # ラベルが見つかった場合は、
    echo "  Labels:"

    if [ -n "$labels" ]; then
        while read -r label; do
            if [ -n "$label" ]; then
                unique_labels["$label"]=1
                echo "    - $label"
            fi
        done <<< "$labels"
    else
        echo "    - No labels found for this PR"
    fi

    # APIレート制限を考慮して少し待機
    sleep 1
done

labels=""
for label in "${!unique_labels[@]}"; do
    if [ -z "$labels" ]; then
        labels="$label"
    else
        labels="$labels,$label"
    fi
done

if [ -n "$labels" ]; then
    echo "Adding labels: $labels to PR #$pr_number"
    gh pr edit "$pr_number" --add-label "$labels"
else
    echo "No labels to add"
fi
