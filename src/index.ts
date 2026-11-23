/**
 * Craft CMS for Webship Workspace: a platform plugin.
 *
 * What the package carries is placed by the installer from the manifest: the builder and the
 * craft console tool in the sites folders, their functions and argparse under core/scripts/plugins/craft-cms/,
 * its AI items (ai/ in this package) in the folder of their kind:
 * the agents in AI Agents, the skill in AI Skills, the command in AI Commands, the prompt in AI Prompts.
 * The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the AI items are listed
 * like any other. What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name: what --activate and --install take, and the folder under core/scripts/plugins/. */
export const PLATFORM = 'craft-cms';

/** The DDEV project type of a Craft CMS project, which the functions and the user list are named after. */
export const PROJECT_TYPE = 'craftcms';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-craft-cms-project.sh', 'cmd-tools-craft-cms-cli.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['craft-cms-site-builder', 'craft-cms-tester'];

/** The skill the installer places in the AI Skills folder (a folder each, with its SKILL.md). */
export const SKILLS = ['craft-cms-scenarios'];

/** The slash command the installer places in the AI Commands folder. */
export const AI_COMMANDS = ['craft-cms-test'];

/** The prompt the installer places in the AI Prompts folder: each a whole launch command for a new session. */
export const PROMPTS = ['craft-cms-build-and-test'];

/** What the assistant is told about Craft CMS in this workspace. */
export function assistantContext(): string {
  return [
    'Craft CMS (a plugin, @webship.co/workspace-craft-cms): a Craft CMS 5 site is built with',
    '`bash cmd-craft-cms-project.sh <name> --install` from a sites folder (dev, test, sandboxes, demos),',
    'in a container like every other project: on DDEV by default, at https://<name>.ddev.site, or with `--runtime docker|podman|kubernetes|lando|docksal` on that runtime, at the address the build prints, (the control panel at /admin).',
    'It is the free Solo edition and stays on it: one account, an admin, and no user groups; never a licence, a paid edition, a trial, or a sign-in to any account or store.',
    'That one account is the workspace account; with --add-users it is the default account instead, the one the test scenarios log in as.',
    '`bash cmd-tools-craft-cms-cli.sh <name>` says what the site is; `--run "<command>"` runs the craft console (php craft) in it,',
    '`--update` updates Craft CMS and its plugins, `--flush` clears the caches.',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the Craft CMS step pack; `--run` runs the suite.',
    `For Craft CMS work, hand over to the agents ${AGENTS.map((a) => `\`${a}\``).join(' and ')}.`,
    `The plugin also places the skill ${SKILLS.map((a) => `\`${a}\``).join(', ')} (the step pack's phrases, by area) in ai-skills/,`,
    `the command ${AI_COMMANDS.map((a) => `\`/${a} <site>\``).join(', ')} in ai-commands/ and the prompt ${PROMPTS.map((a) => `\`${a}\``).join(' and ')} in ai-prompts/.`,
    'Never run php, composer, npm or mysql on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
