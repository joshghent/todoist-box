require("dotenv").config({ quiet: true });
const { getOctokit } = require("@actions/github");
const humanize = require("humanize-number");

const {
  GIST_ID: gistId,
  GH_TOKEN: githubToken,
  TODOIST_ACCESS_TOKEN: todoistAccessToken,
  TODOIST_API_KEY: todoistApiKey,
  TODOIST_PERSONAL_TOKEN: todoistPersonalToken,
  TODOIST_CLIENT_ID: clientId,
  TODOIST_CLIENT_SECRET: clientSecret,
} = process.env;
const personalToken = todoistApiKey || todoistPersonalToken;

function assertRequiredEnv() {
  const missing = [];
  if (!gistId) missing.push("GIST_ID");
  if (!githubToken) missing.push("GH_TOKEN");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

async function migrateToken() {
  const response = await fetch(
    "https://api.todoist.com/api/v1/access_tokens/migrate_personal_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        personal_token: personalToken,
        scope: "data:read",
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to migrate token (${response.status}): ${JSON.stringify(data)}`
    );
  }
  return data.access_token;
}

async function getTodoistAccessToken() {
  if (todoistAccessToken) {
    return todoistAccessToken;
  }

  if (personalToken) {
    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing TODOIST_CLIENT_ID or TODOIST_CLIENT_SECRET for legacy personal token migration."
      );
    }
    return migrateToken();
  }

  throw new Error(
    "Missing Todoist auth. Set TODOIST_ACCESS_TOKEN (preferred) or provide TODOIST_API_KEY/TODOIST_PERSONAL_TOKEN with TODOIST_CLIENT_ID and TODOIST_CLIENT_SECRET."
  );
}

async function fetchData(accessToken) {
  const [syncRes, streakDays] = await Promise.all([
    fetch("https://api.todoist.com/api/v1/sync", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: 'sync_token=*&resource_types=["user","stats"]',
    }),
    fetchStreakDays(accessToken),
  ]);

  const syncData = await syncRes.json();
  if (!syncRes.ok) {
    throw new Error(
      `Failed to fetch sync data (${syncRes.status}): ${JSON.stringify(syncData)}`
    );
  }

  return {
    karma: syncData.user.karma,
    completed_count: syncData.stats.completed_count,
    days_items: syncData.stats.days_items,
    week_items: syncData.stats.week_items,
    streak: streakDays,
  };
}

async function fetchStreakDays(accessToken) {
  const dates = new Set();
  let cursor = null;

  while (true) {
    const url = cursor
      ? `https://api.todoist.com/api/v1/activities?event_type=completed&limit=100&cursor=${cursor}`
      : "https://api.todoist.com/api/v1/activities?event_type=completed&limit=100";

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) break;

    for (const event of data.results) {
      dates.add(event.event_date.substring(0, 10));
    }

    // Check if the streak is broken by looking at consecutive days
    const sortedDates = [...dates].sort().reverse();
    const today = new Date().toISOString().substring(0, 10);

    // If the most recent completion isn't today or yesterday, streak is 0
    if (sortedDates.length > 0) {
      const diffFromToday = daysBetween(sortedDates[0], today);
      if (diffFromToday > 1) return 0;
    }

    // Find where the streak breaks
    let streakBroken = false;
    for (let i = 1; i < sortedDates.length; i++) {
      if (daysBetween(sortedDates[i], sortedDates[i - 1]) > 1) {
        streakBroken = true;
        break;
      }
    }

    // If streak is unbroken and there are more pages, keep fetching
    if (streakBroken || !data.next_cursor) {
      return calculateStreak(sortedDates);
    }

    cursor = data.next_cursor;
  }

  return 0;
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function calculateStreak(sortedDates) {
  if (sortedDates.length === 0) return 0;

  const today = new Date().toISOString().substring(0, 10);
  const diffFromToday = daysBetween(sortedDates[0], today);
  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    if (daysBetween(sortedDates[i], sortedDates[i - 1]) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

async function main() {
  assertRequiredEnv();
  const accessToken = await getTodoistAccessToken();
  const data = await fetchData(accessToken);
  await updateGist(data);
}

async function updateGist(data) {
  const octokit = getOctokit(githubToken);
  let gist;
  try {
    gist = await octokit.rest.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
    throw new Error('Unable to get gist');
  }

  const lines = [];
  const { karma, completed_count, days_items, week_items, streak } = data;

  lines.push(`🏆 ${humanize(karma)} Karma Points`);
  lines.push(
    `🌞 Completed ${days_items[0].total_completed.toString()} tasks today`
  );
  lines.push(
    `📅 Completed ${week_items[0].total_completed.toString()} tasks this week`
  );
  lines.push(`✅ Completed ${humanize(completed_count)} tasks so far`);
  lines.push(`⌛ Current streak is ${humanize(streak)} days`);

  if (lines.length == 0) return;

  try {
    console.log(lines.join("\n"));
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
    throw new Error('Unable to update gist');
  }
}

(async () => {
  await main();
})();
