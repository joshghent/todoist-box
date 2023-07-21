require("dotenv").config();
const { getOctokit } = require("@actions/github");
const humanize = require("humanize-number");
const fetch = require("node-fetch");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  TODOIST_API_KEY: todoistApiKey,
} = process.env;

const octokit = getOctokit(githubToken);

async function main() {
  const response = await fetch(
    `https://api.todoist.com/sync/v9/completed/get_stats`,
    {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${todoistApiKey}`,
      },
    }
  );

  const stats = await response.json();
  await updateGist(stats);
}

async function updateGist(data) {
  let gist;
  try {
    gist = await octokit.rest.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];
  const { karma, completed_count, days_items, week_items, goals } = data;

  const karmaPoint = [`🏆 ${humanize(karma)} Karma Points`];
  lines.push(karmaPoint.join(" "));

  const dailyGoal = [
    `🌞 Completed ${days_items[0].total_completed.toString()} tasks today`,
  ];
  lines.push(dailyGoal.join(" "));

  const weeklyGoal = [
    `📅 Completed ${week_items[0].total_completed.toString()} tasks this week`,
  ];
  lines.push(weeklyGoal.join(" "));

  const totalTasks = [`✅ Completed ${humanize(completed_count)} tasks so far`];
  lines.push(totalTasks.join(" "));

  const longestStreak = [
    `⌛ Current streak is ${humanize(goals.last_daily_streak.count)} days`,
  ];
  lines.push(longestStreak.join(" "));

  if (lines.length == 0) return;

  try {
    console.log(lines.join("\n"));
    console.log(gist);
    if (gist) {
      // Get original filename to update that same file
      const filename = Object.keys(gist.data.files)[0];
      await octokit.rest.gists.update({
        gist_id: gistId,
        files: {
          [filename]: {
            filename: `✅ Todoist Stats`,
            content: lines.join("\n"),
          },
        },
      });
    }
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

(async () => {
  await main();
})();
