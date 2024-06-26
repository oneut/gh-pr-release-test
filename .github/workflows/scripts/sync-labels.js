const { Octokit } = require("@octokit/rest");
const github = require("@actions/github");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function run() {
  const context = github.context;
  const { owner, repo } = context.repo;
  const prNumber = context.payload.pull_request.number;
  const baseBranch = context.payload.pull_request.base.ref;
  const headBranch = context.payload.pull_request.head.ref;

  // ベースブランチと作成されたブランチ間のマージされたプルリクエストを取得
  const { data: pulls } = await octokit.pulls.list({
    owner,
    repo,
    state: 'closed',
    base: baseBranch,
    head: headBranch,
  });

  // マージされたプルリクエストのラベルを取得
  const mergedPRs = pulls.filter(pr => pr.merged_at);
  const labels = new Set();
  mergedPRs.forEach(pr => {
    pr.labels.forEach(label => labels.add(label.name));
  });

  // 新しいプルリクエストにラベルを付与
  if (labels.size > 0) {
    await octokit.issues.addLabels({
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
