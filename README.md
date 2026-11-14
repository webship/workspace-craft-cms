# @webship.co/workspace-craft-cms

Craft CMS for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder
that makes a real Craft CMS site in a container, a craft console tool for the sites it built, the
default account, the [Craft CMS step pack](https://github.com/webship/craft-cms-steps) wired into
the workspace's testing setup, and two AI agents that know all of it.

The workspace is container-based (DDEV by default): a Craft CMS project is a row like any other, so
the row menus the core draws (start, stop, launch, backup, clone, remove, tests) work on it unchanged.

## The free Solo edition, and one account

A site built by this plugin is on the **free Solo edition** of Craft CMS and stays on it. No licence
is entered, no paid edition is switched on (not even as a trial), and nothing signs in to any
account or to the plugin store.

The Solo edition has **one account, an admin, and no user groups**. So, unlike the plugins of the
other platforms, this one has a single default account, and its first test feature covers the admin
only: there is no second account to log in as, and no role to be refused a page.

It is made from the reference platform plugin,
[`@webship.co/workspace-wordpress`](https://github.com/webship/workspace-wordpress).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-craft-cms   # npm install into the dashboard
bash core/scripts/plugins.sh --activate craft-cms                            # plugins.craft-cms in settings.yml
bash core/scripts/plugins.sh --install craft-cms                             # commands, functions, args, agents
bash core/scripts/plugins.sh --configure craft-cms                           # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is
idempotent. `--uninstall` removes what it placed; an agent you edited stays.

The commands land in the sites folders that are in the workspace (`dev`, `test`, `sandboxes`,
`demos`); the agents land in the AI Agents folder (`ai-agents/`) when the workspace has one, and are
installed into `~/.claude/agents` from there like any other agent.

It needs a Webship Workspace 1.0.7 or later.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-craft-cms-project.sh` | The builder, in the Build list as **Craft CMS (5, Solo)**, installed into every sites folder |
| `commands/cmd-tools-craft-cms-cli.sh` | The craft console for one project: what the site is, a command, updates, caches, the default account |
| `scripts/functions/fun-craft-cms.sh` | The bash functions behind both, sourced by bootstrap once installed; the names the core's tools look for (`set_craftcms_users`, `add_craftcms_users`, `cancel_craftcms_users`, `testing_configure_craftcms`, named after the DDEV project type `craftcms`) |
| `scripts/args/arg-craft-cms.sh`, `arg-craft-cms-cli.sh` | Their argparse; the Build form draws the builder's flags from the first |
| `testing/site.feature` | The first feature a Craft CMS project gets when testing is set up: the front page, the login form, the admin |
| `agents/craft-cms-site-builder.md` | The agent that builds and maintains Craft CMS sites with these commands |
| `agents/craft-cms-tester.md` | The agent that writes and runs scenarios with the Craft CMS step pack |
| `src/index.ts` | `register(api)`: what the assistant is told about Craft CMS here |
| `features/craft-cms.feature` | Scenarios for the dashboard's own browser suite |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## The commands

Run them from a sites folder. `--help` is safe on both.

### Build a site

```bash
cd ~/workspace/dev
bash cmd-craft-cms-project.sh mysite --install                # the one account is the workspace account
bash cmd-craft-cms-project.sh mysite --install --add-users    # the one account is the default account, for a site to test
```

| Flag | What it does |
| --- | --- |
| `--version <x>` | The release, as a Composer constraint of `craftcms/cms`: `^5` (the default, the current release of Craft CMS 5), or a number such as `5.8.0` |
| `--install` | Install the site on the Solo edition, with the workspace account as its one account |
| `--add-users` | With `--install`: the one account is the default account `administrator` instead, the one the test scenarios log in as |
| `--php-version <x>` | The PHP of the project container (`8.3`) |
| `--launch` | Open the site when it is ready |

The site answers at `https://mysite.ddev.site`, the control panel at `/admin`. The build runs
`ddev config --project-type=craftcms` with the docroot `web` and the Node.js of the workspace (24),
creates the project with Composer in the container from the starter `craftcms/craft`, and installs
it with Craft's own `install/craft` command, which asks no question. The container tool gives the
project its database settings: the plugin writes none. A project of the same name is deleted first.

### Work on a site

```bash
bash cmd-tools-craft-cms-cli.sh mysite                                    # version, address, edition, the account, plugins
bash cmd-tools-craft-cms-cli.sh mysite --run "project-config/apply"
bash cmd-tools-craft-cms-cli.sh mysite --run "help"                       # every command of the console
bash cmd-tools-craft-cms-cli.sh mysite --flush                            # clear every cache
bash cmd-tools-craft-cms-cli.sh mysite --update                           # Craft CMS and its plugins; the edition stays
bash cmd-tools-craft-cms-cli.sh mysite --add-users                        # is the site's account the default account?
bash cmd-tools-craft-cms-cli.sh mysite --cancel-users                     # says why it stays
```

A plugin is a Composer package (`ddev composer require <vendor>/<package>`, then
`--run "plugin/install <handle>"`): free, open-source plugins only, and never through a sign-in to
the plugin store.

### The default account

| Account | Role | Handle in the tests |
| --- | --- | --- |
| `administrator` | admin: the one account of the site | `admin` |

It has the address `administrator@example.com` and the password of the workspace's other default
lists. It is for local sites and for tests.

Because the edition has one account, it cannot be added to a site afterwards, and it cannot be taken
away:

- `--install` alone gives the one account to the workspace account. That site has no default
  account; `--add-users` on the CLI tool, `bash cmd-tools-add-users.sh mysite craftcms` and the row's
  Users menu say so, and create nothing.
- `--install --add-users` gives the one account to `administrator`. A scenario then logs in with an
  account made for tests, and the workspace account is in no test.
- `bash cmd-tools-cancel-users.sh mysite craftcms` deletes nothing: a site cannot be without its
  account. Build the site again to change whose it is.

### Test a site

```bash
bash cmd-tools-testing.sh mysite                 # webship-js, the step pack, the users registry, a first feature
bash cmd-tools-testing.sh mysite --run           # run the suite in the container
bash cmd-tools-testing.sh mysite --run --path tests/features/site.feature
```

`cmd-tools-testing.sh` is the workspace's own. For a Craft CMS project it also adds
`@webship-js/craft-cms-steps` to `package.json`, lists its step definitions in `cucumber.js` after
webship-js's own, writes the users registry (the handle `admin`, overridable with `ADMIN_USER` and
`ADMIN_PASSWORD`), places `tests/features/site.feature` when the project has none, and says whether
the site's account is the default account. Run it again and it adds what is missing and keeps what
you changed.

The first feature covers the front page, the login form and the admin: logging in, the pages an
admin may open, logging out. On a site whose one account is the workspace account, give a run that
account in its environment (`ADMIN_USER`, `ADMIN_PASSWORD`) or build the site again with
`--add-users`.

## The agents

| Agent | Use it to |
| --- | --- |
| `craft-cms-site-builder` | Build, update, maintain or remove a Craft CMS site with the commands above, in containers only and on the Solo edition only |
| `craft-cms-tester` | Set the testing stack up, look at the site in the Playwright MCP browser first, write scenarios from the pack's steps and run them; it never creates an account in a suite and never writes a platform name into a step phrase |

After `--install` they are in the AI Agents folder of the dashboard; **Install** there puts one into
`~/.claude/agents`, or from the command line:

```bash
cd ~/workspace/ai-agents
bash cmd-tools-ai-items.sh craft-cms-tester --install
```

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the commands, the agents, the functions against a scaffolded project
```
