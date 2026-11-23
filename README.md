# @webship.co/workspace-craft-cms

Craft CMS for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder
that makes a real Craft CMS site in a container, a craft console tool for the sites it built, the
default account, the [Craft CMS step pack](https://github.com/webship/craft-cms-steps) wired into
the workspace's testing setup, and its AI items — two agents, a skill, a command and a prompt —
each listed in the workspace folder of its kind.

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
bash core/scripts/plugins.sh --install craft-cms                             # commands, functions, args, AI items
bash core/scripts/plugins.sh --configure craft-cms                           # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is
idempotent. `--uninstall` removes what it placed; an AI item you edited stays.

Everything the plugin carries lands in the folder it belongs to, when that folder is an active
workspace folder:

| What | Lands in |
| --- | --- |
| `cmd-craft-cms-project.sh`, `cmd-tools-craft-cms-cli.sh` | every active sites folder: `dev/`, `test/`, `sandboxes/`, `demos/` |
| The agents `craft-cms-site-builder`, `craft-cms-tester` | `ai-agents/` |
| The skill `craft-cms-scenarios` | `ai-skills/` |
| The command `/craft-cms-test` | `ai-commands/` |
| The prompt `craft-cms-build-and-test` | `ai-prompts/` |

There they are listed like any other item of the folder, and installed into Claude Code from there.

It needs a Webship Workspace 1.0.7 or later.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder and the tool: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`: the AI folders its agents, its skill, its command and its prompt are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is missing first:

```bash
bash core/scripts/plugins.sh --activate craft-cms --with-needs   # dev and the four AI folders are required, activated and installed first
bash core/scripts/plugins.sh --install craft-cms
```

Everything the builder runs for a site runs in the site's own container, through the container tool the workspace already needs; the plugin asks for no command of its own on the machine.

A workspace that knows none of this (Webship Workspace 1.0.8 and older) ignores the keys: add a sites folder and the AI folders yourself, then `--install craft-cms` again. A kind whose folder is not there is skipped, and the install says so.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-craft-cms-project.sh` | The builder, in the Build list as **Craft CMS (5, Solo)**, installed into every sites folder |
| `commands/cmd-tools-craft-cms-cli.sh` | The craft console for one project: what the site is, a command, updates, caches, the default account |
| `scripts/functions/fun-craft-cms.sh` | The bash functions behind both, sourced by bootstrap once installed; the names the core's tools look for (`set_craftcms_users`, `add_craftcms_users`, `cancel_craftcms_users`, `testing_configure_craftcms`, named after the DDEV project type `craftcms`) |
| `scripts/args/arg-craft-cms.sh`, `arg-craft-cms-cli.sh` | Their argparse; the Build form draws the builder's flags from the first |
| `testing/site.feature` | The first feature a Craft CMS project gets when testing is set up: the front page, the login form, the admin |
| `ai/agents/craft-cms-site-builder.md` | The agent that builds and maintains Craft CMS sites with these commands |
| `ai/agents/craft-cms-tester.md` | The agent that writes and runs scenarios with the Craft CMS step pack |
| `ai/skills/craft-cms-scenarios/` | The skill: the step pack's phrases a fresh Solo site answers to, the traps found on a real site, three example features |
| `ai/commands/craft-cms-test.md` | The slash command `/craft-cms-test <site>`: set up, match every step, run, report |
| `ai/prompts/craft-cms-build-and-test.md` | The prompt: a whole launch command for a new session |
| `docs/plugin-items-pattern.md` | How a plugin carries its own commands and AI items, and how to prove it |
| `src/index.ts` | `register(api)`: what the assistant is told about Craft CMS here |
| `features/craft-cms.feature` | Scenarios for the dashboard's own browser suite |
| `features/craft-cms-runtimes.feature` | The row, the test users and two pages of a site built on Docker Compose and on Kubernetes |

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
| `--runtime <name>` | The container runtime to build on: `ddev` (the default), `docker`, `kubernetes`, `podman`, `lando` or `docksal`. See [Runtimes](#runtimes) |
| `--launch` | Open the site when it is ready |

On DDEV the site answers at `https://mysite.ddev.site`, the control panel at `/admin`. The build runs
`ddev config --project-type=craftcms` with the docroot `web` and the Node.js of the workspace (24),
creates the project with Composer in the container from the starter `craftcms/craft`, and installs
it with Craft's own `install/craft` command, which asks no question. The container tool gives the
project its database settings: the plugin writes none. A project of the same name is deleted first.


### Runtimes

```bash
bash cmd-craft-cms-project.sh mysite --install --add-users                        # DDEV, the default
bash cmd-craft-cms-project.sh mysite --install --add-users --runtime docker       # Docker Compose
bash cmd-craft-cms-project.sh mysite --install --add-users --runtime kubernetes   # a Kubernetes cluster
bash cmd-craft-cms-project.sh mysite --install --add-users --runtime lando        # Lando
bash cmd-craft-cms-project.sh mysite --install --add-users --runtime docksal      # Docksal
```

Without `--runtime` a build takes `container.runtime` of the workspace's `settings.yml`, then DDEV.
It needs a Webship Workspace with the container runtimes
([webship/workspace#694](https://github.com/webship/workspace/issues/694)); on an older one the
builder refuses `--runtime` and builds on DDEV only. Lando and Docksal need a Workspace whose runtime
layer has them ([webship/workspace#729](https://github.com/webship/workspace/issues/729),
[#730](https://github.com/webship/workspace/issues/730)).

| | DDEV | Docker Compose | Kubernetes | Podman | Lando | Docksal |
| --- | --- | --- | --- | --- | --- | --- |
| Build with `--install --add-users` (the Solo edition, its one account) | Yes | Yes | Yes | Not yet run | Yes | Yes |
| The front page and the control panel's login | Yes | Yes | Yes | Not yet run | Yes | Yes |
| `cmd-tools-craft-cms-cli.sh`: status, `--run`, the account | Yes | Yes | Yes | Not yet run | Yes | Yes |
| The test account, said to be there and kept | Yes | Yes | Yes | Not yet run | Yes | Yes |
| Mail caught by Mailpit (`--run "mailer/test …"`) | Yes | Yes | Yes | Not yet run | Yes | Yes |
| The testing setup and the first feature | Yes | Yes | Yes | Not yet run | Yes | Yes |
| The step pack's examples, with its content (99 scenarios) | 95 of 99 (*) | 95 of 99 (*) | 95 of 99 (*) | Not yet run | 95 of 99 (*) | 95 of 99 (*) |
| Export and import the database | Yes | Yes | Yes | Not yet run | Yes | Yes |
| The row in the dashboard, and remove | Yes | Yes | Yes | Not yet run | Yes | Yes |

"Yes" means it was run on a real site of that runtime. Podman runs the same code as Docker Compose
and was not run yet. (*) With the content of the step pack's README (its editor field, templates and
seed), on every runtime, DDEV included: the four are the ones its README names for a site of this
plugin, which read the account and the site name of the pack's own test site (`admin`,
`admin@example.com`, "Webship Test Site").

| Runtime | The site's address | What the project carries |
| --- | --- | --- |
| DDEV | `https://mysite.ddev.site` | `.ddev/config.yaml` |
| Docker Compose | `http://127.0.0.1:<port>`, printed by the build | `compose.yaml`, `.webship/runtime/Dockerfile` |
| Kubernetes | `http://<node address>:<port>`, printed by the build | The same, and `k8s/` (the namespace `ws-mysite`) |
| Lando | `http://127.0.0.1:<port>`, printed by the build | `.lando.yml` (Lando's proxy stays off) |
| Docksal | `http://mysite.docksal.site`, on Docksal's own proxy | `.docksal/docksal.env`, `.docksal/docksal.yml` |

What differs on Docker Compose, Kubernetes, Lando and Docksal:

- **`.env`** gets the database DDEV's `craftcms` type gives the container: `CRAFT_DB_DRIVER=mysql`, `CRAFT_DB_SERVER=db`, `CRAFT_DB_PORT=3306`, `CRAFT_DB_DATABASE=db`, `CRAFT_DB_USER=db`, `CRAFT_DB_PASSWORD=db`. Nothing personal; on DDEV the builder still writes none.
- **The site URL** the install records (`PRIMARY_SITE_URL`) is the runtime's address.
- **Mail:** Craft's own Sendmail transport goes through the container's `sendmail`, which each runtime hands to its mail catcher.
- **`composer create-project`** is told the project root (`.`), as DDEV takes it.
- **HTTPS and a host name** are DDEV's: a runtime's address is plain HTTP.

The same commands work on every runtime: `cmd-tools-craft-cms-cli.sh`, `cmd-tools-add-users.sh`,
`cmd-tools-testing.sh`. The pattern is the Workspace's
[`core/docs/plugins-on-runtimes.md`](https://github.com/webship/workspace/blob/1.0.x/core/docs/plugins-on-runtimes.md).

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
`ADMIN_PASSWORD`) and the mailbox the pack's mail steps read (`mailUrl`: port 8026 of the site's
address on DDEV, the `MAIL_URL` the tests container is given on another runtime), places
`tests/features/site.feature` when the project has none, and says whether the site's account is the
default account. Run it again and it adds what is missing and keeps what
you changed.

The first feature covers the front page, the login form and the admin: logging in, the pages an
admin may open, logging out. On a site whose one account is the workspace account, give a run that
account in its environment (`ADMIN_USER`, `ADMIN_PASSWORD`) or build the site again with
`--add-users`.

## The AI items

`ai/` in the package holds one folder per kind, the manifest's `ai` block names each item, and
`--install` places it in the workspace folder of that kind.

| Kind | Item | Use it to |
| --- | --- | --- |
| Agent | `craft-cms-site-builder` | Build, update, maintain or remove a Craft CMS site with the commands above, in containers only and on the Solo edition only |
| Agent | `craft-cms-tester` | Set the testing stack up, look at the site in the Playwright MCP browser first, write scenarios from the pack's steps and run them; it never creates an account in a suite and never writes a platform name into a step phrase |
| Skill | `craft-cms-scenarios` | Write a scenario from phrases that exist: the pack's steps for the control panel session, its navigation and its settings pages, the one handle of the users registry, the traps found on a real site (no content model on a fresh site, one account), and three features that pass on a fresh site |
| Command | `/craft-cms-test <site> [feature or @tag]` | Run the suite of a site from inside a session: set up when missing, match every step, run, report what failed and why |
| Prompt | `craft-cms-build-and-test` | Start a session that builds a site on the free Solo edition, says what it is, sets the testing stack up and runs the first feature |

After `--install` each is in its folder on the dashboard. **Install** there puts an agent, a skill
or a command into Claude Code (`~/.claude/agents`, `~/.claude/skills`, `~/.claude/commands`), or
from the command line:

```bash
cd ~/workspace/ai-agents   && bash cmd-tools-ai-items.sh craft-cms-tester --install
cd ~/workspace/ai-skills   && bash cmd-tools-ai-items.sh craft-cms-scenarios --install
cd ~/workspace/ai-commands && bash cmd-tools-ai-items.sh craft-cms-test --install
```

A prompt is not installed: it is the whole `claude …` launch command of a new session, and the
dashboard's **New screen** form lists it as a template. By hand, fill the placeholders in and run
the command of the file from the folder it names.

The items are written for any AI CLI, with Claude Code as the default shape: the frontmatter and
the file layout are Claude Code's, the body of each item is plain Markdown that names no tool or
feature of one CLI, a command says in words what its arguments are, and the text between the
triple quotes of a prompt can be given to another AI CLI as it is.

Every step phrase the items show is checked against the definitions of the step pack and of
webship-js (`tests/fixtures/step-definitions.txt`), and every command and flag against the
plugin's own. The shape is the reference's: [`docs/plugin-items-pattern.md`](docs/plugin-items-pattern.md).

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the commands, the AI items, the functions against a scaffolded project
```
