---
name: craft-cms-scenarios
description: Write and run webship-js scenarios for a Craft CMS site of the Webship Workspace with the Craft CMS step pack (`@webship-js/craft-cms-steps`) — the phrases of the pack that a fresh site of the free Solo edition answers to (the control panel session, its navigation, its settings pages, what the admin may open, the public site), the one handle of the users registry, and the workspace command that runs them in the site's container. Use when asked to "write a scenario for this Craft site", "test the control panel login", "which step is there for the control panel navigation", "add a feature for the settings pages", or when a `.feature` file of a Craft CMS project is being written or fixed.
argument-hint: '<site> [what to cover]'
---

# craft-cms-scenarios

Scenarios for a Craft CMS site of a Webship Workspace (`~/workspace`, container-based, DDEV by
default), written from the steps of [`@webship-js/craft-cms-steps`](https://github.com/webship/craft-cms-steps)
and of [webship-js](https://github.com/webship/webship-js) itself, and run in the site's container
by the workspace's own command. It comes with the Craft CMS plugin
(`@webship.co/workspace-craft-cms`), like the builder (`cmd-craft-cms-project.sh`), the console
tool (`cmd-tools-craft-cms-cli.sh`) and the agents `craft-cms-site-builder` and
`craft-cms-tester`.

## Where everything is

| What | Where |
| --- | --- |
| The site | `~/workspace/<folder>/<site>`, at `https://<site>.ddev.site`, the control panel at `/admin` (`<folder>` is a sites folder: `dev`, `test`, `sandboxes`, `demos`) |
| The suite's configuration | `<site>/cucumber.js`: the step definitions it loads and the users registry (`worldParameters.users`) |
| The features | `<site>/tests/features/*.feature` (`site.feature` is the first one the setup wrote) |
| The pack's steps | `<site>/node_modules/@webship-js/craft-cms-steps/tests/step-definitions/*.steps.js` |
| webship-js's steps | `<site>/node_modules/webship-js/tests/step-definitions/*.js` |
| The reports | `<site>/tests/reports/` |

## The order of work

1. **Make sure the testing stack is there.** From the sites folder:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <site>
   ```
   It adds webship-js, the step pack, the users registry and `tests/features/site.feature`. It is
   safe to run again: it adds what is missing and keeps what was changed.
2. **Read the installed steps before writing a phrase.** They are the source of truth: the pack
   moves, and a phrase from memory is a guess.
   ```bash
   cd ~/workspace/<folder>/<site>
   grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/craft-cms-steps/tests/step-definitions/*.steps.js
   ```
   Every step carries a comment block with examples above it; open the file when a phrase is not
   obvious.
3. **Look at the page first** (the Playwright MCP browser, a tab of your own) when the scenario
   is about a screen you have not seen. A scenario written without having seen the page asserts
   what you imagine.
4. **Write the feature** in `<site>/tests/features/`, from phrases that exist (the lists below).
5. **Match every step without a browser**, then run the feature, then the suite:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <site> --dry-run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <site> --run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <site> --run --tags "@critical"
   bash cmd-tools-testing.sh <site> --run
   ```
   A dry run says `Undefined` for a phrase no definition matches: fix the phrase, do not write a
   step for it.

## The account: one handle, never a password

A site built by the plugin is on the free Solo edition, which has one account, an admin, and no
user groups. The users registry has one handle for it:

| Handle | Account | Role |
| --- | --- | --- |
| `admin` | `administrator` | admin, the only account of the site |

```gherkin
Given I am logged in to the control panel as "admin"
Then I should be logged in to the control panel as "admin"
```

`bash cmd-tools-craft-cms-cli.sh <site> --add-users` says whether the one account of the site is
that default account; it creates none.

## The phrases, by area

Each line is a phrase the pack defines, and each one passed on a site built with
`bash cmd-craft-cms-project.sh <site> --install --add-users` (Craft CMS 5, the Solo edition; the
names in quotes are that site's).

### The control panel session

```gherkin
Given I am logged in to the control panel as "admin"
When I log in to the control panel with the username "nobody" and the password "wrong-password"
When I log out of the control panel
Then I should be logged in to the control panel as "admin"
Then I should not be logged in to the control panel
Then I should see the control panel login form
Then I should see the login error "Invalid username or password."
When I ask for a password reset for "nobody@example.com"
Then I should see the password reset confirmation
```

The wrong login above is the one place a password stands in a scenario: it is the subject, and it
is nobody's.

### The control panel: navigation, pages, settings

```gherkin
Then the control panel heading should be "Dashboard"
Then the control panel navigation item "Dashboard" should be selected
Then I should see "Settings" in the control panel navigation
Then I should not see "Entries" in the control panel navigation
When I click "Settings" in the control panel navigation
When I go to the control panel page "settings/sections"
Then the control panel breadcrumb should be "Settings"
Then I should be allowed to open the control panel page "utilities"
Then I should not see an error notification
```

### The public site

`I am an anonymous user`, `I am on the homepage`, `I go to "<path>"`,
`the page should have a title` and `the response status code should be 200` (or `404`) are
webship-js's own steps; its status codes, classes, landmarks and accessibility audits are used as
they are and never redefined for this platform.

## Traps found on a real site

- **A fresh site has no content model.** No section, no entry type, no field, no volume: the
  control panel navigation has no `Entries`, and the pack's steps for entries, indexes, the edit
  form, fields and assets have nothing to work on. They are not listed above because they were
  not run on a site as built. The content model is made first, in Settings, by a person; the
  console does not make one unattended:
  `bash cmd-tools-craft-cms-cli.sh <site> --run "sections/create --name=Notes --handle=notes --type=channel"`
  answers `Entry Types cannot be blank`.
- **One account.** The Solo edition has no second account and no user group: there is no `Users`
  item in the navigation, no role to be refused a page, and a scenario about permissions has
  nothing to log in as. The `should not be allowed to open` form of the step needs an edition
  this plugin does not build.
- **The system name is `<folder> <site>`** after a build (`dev mysite`), not the site's name
  alone: `the "System Name" field should have the value "mysite"` fails.
- **A password reset answers the same for any address**: the confirmation is shown for an address
  nobody has, and no account is touched.
- A page of the control panel is named by its path after `/admin/` (`"settings/sections"`,
  `"myaccount"`), and the breadcrumb is the trail above the page (`Settings`), without the page
  itself.

## Rules

- **No account is created in a suite**, and on the Solo edition none can be. A second account is
  asked for (it needs another edition), not made.
- **Never the workspace account in a feature.** With `--add-users` the one account of the site is
  the default account, and its password is in no feature file.
- **No password in a feature file**, except where a wrong password is the subject.
- **No platform name in a step phrase**: `I am logged in to the control panel as "admin"`, never
  a phrase that names the platform. The same holds for a custom step.
- **No selector when a step says it**: `the control panel heading`, `the control panel
  navigation`, not their classes.
- **What a scenario creates, it removes** in the same scenario, under a title nobody else uses.
- **No licence, no paid edition, no plugin store** in a scenario: the site stays on the free Solo
  edition.
- **A custom step is the last resort**: look in the pack and in webship-js first, write it in
  `<site>/tests/step-definitions/` with a comment block and examples, and say it may belong in
  the pack.
- **Everything runs in the container**, through `cmd-tools-testing.sh`. Never `npx cucumber-js`
  or `npx playwright` on the host.
- **A failing scenario is a result.** No `@wip`, no longer timeout, no looser assertion to turn a
  run green: say what the site did.

## Examples that run

`examples/` holds three features that pass on a site built with
`bash cmd-craft-cms-project.sh <site> --install --add-users`. Copy one into the suite and run it:

```bash
cp ~/workspace/ai-skills/craft-cms-scenarios/examples/control-panel-session.feature ~/workspace/<folder>/<site>/tests/features/
cd ~/workspace/<folder>
bash cmd-tools-testing.sh <site> --run --path tests/features/control-panel-session.feature
```

| Feature | What it shows |
| --- | --- |
| `examples/control-panel-session.feature` | The admin logging in and out, a wrong login refused, a password reset, a visitor sent to the login form |
| `examples/control-panel-navigation.feature` | The navigation of a fresh Solo site, the settings pages with their heading and breadcrumb, the pages an admin may open |
| `examples/front-page.feature` | The front page served to a visitor, and an unknown address answered with 404 |
