import { Octokit } from "@octokit/rest";
import * as github from "@actions/github";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function run() {
  const context = github.context;
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request.number;
  const headBranch = context.payload.pull_request.head.ref;
  console.log(`headBranch: ${headBranch}`);

  // 作成されたブランチにマージされたプルリクエストを取得
  const { data: pulls } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'closed',
    base: headBranch,
  });

  console.log(`Merged PR numbers: ${pulls.map(pr => pr.number).join(', ')}`);

  // マージされたプルリクエストのラベルを取得
  const mergedPRs = pulls.filter(pr => pr.merged_at);
  const labels = new Set();
  mergedPRs.forEach(pr => {
    pr.labels.forEach(label => labels.add(label.name));
  });

  console.log(`Labels: ${Array.from(labels).join(', ')}`);

  // 新しいプルリクエストにラベルを付与
  if (labels.size > 0) {
    console.log(`Adding labels ${Array.from(labels).join(', ')} to PR ${prNumber}`);
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: Array.from(labels),
    });
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
