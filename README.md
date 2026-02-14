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
1. In your Todoist account settings, copy your existing API Token (https://app.todoist.com/app/settings/integrations/developer)
1. Register a new Todoist app in the [App Management Console](https://developer.todoist.com/appconsole.html) to obtain a **Client ID** and **Client Secret**. These are required because the Todoist API v1 uses OAuth authentication. The app will automatically migrate your personal token on each run.

   <img width="600" src="screenshots/create-app.png" alt="Creating a Todoist app">

### Project setup

1. Generate a repo from this template by clicking [here](https://github.com/joshghent/todoist-box/generate)
1. Fill in the details and click `Create repository from template`
1. Go to the repo **Settings > Secrets**
1. Add the following environment variables:
   - **GH_TOKEN:** The GitHub token generated above.
   - **GIST_ID:** The ID portion from your gist url: `https://gist.github.com/username/`**`a582ad10a45dc17815feea6018223880`**.
   - **TODOIST_API_KEY:** The API token for your Todoist account.
   - **TODOIST_CLIENT_ID:** The Client ID from your registered Todoist app.
   - **TODOIST_CLIENT_SECRET:** The Client Secret from your registered Todoist app.

## License

Originally created by: [Yogi](LICENSE)
Maintained by: [joshghent](https://joshghent.com)
