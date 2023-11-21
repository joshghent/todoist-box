<p align="center">
  <img width="400" src="screenshot.png">
  <h3 align="center">todoist-box</h3>
  <p align="center">⚡️📌 Update a pinned gist to contain your Todoist stats</p>
</p>

---

> 📌✨ For more pinned-gist projects like this one, check out: https://github.com/matchai/awesome-pinned-gists

## Setup

### Prep work

1. Create a new public GitHub Gist (https://gist.github.com/)
1. Create a token with the `gist` scope and copy it. (https://github.com/settings/tokens/new)
1. Create a Todoist account (https://todoist.com/users/showregister)
1. In your account settings, copy the existing Todoist API Token (https://beta.todoist.com/prefs/integrations)

### Project setup

1. Generate a repo from this template by clicking [here](https://github.com/joshghent/todoist-box/generate)
1. Fill in the details and click `Create repository from template`
1. Go to the repo **Settings > Secrets**
1. Add the following environment variables:
   - **GH_TOKEN:** The GitHub token generated above.
   - **GIST_ID:** The ID portion from your gist url: `https://gist.github.com/joshghent/`**`a582ad10a45dc17815feea6018223880`**.
   - **TODOIST_API_KEY:** The API token for your Todoist account.

## License

Originally created by: [Yogi](LICENSE)
Maintained by: [joshghent](https://joshghent.com)
