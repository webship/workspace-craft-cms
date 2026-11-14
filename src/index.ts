/**
 * Craft CMS for Webship Workspace: a platform plugin.
 *
 * What the package carries is placed by the installer from the manifest: the builder and the
 * craft console tool in the sites folders, their functions and argparse under core/scripts/plugins/craft-cms/,
 * the agents in the AI Agents folder. The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the agents are listed
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

/** What the assistant is told about Craft CMS in this workspace. */
export function assistantContext(): string {
  return [
    'Craft CMS (a plugin, @webship.co/workspace-craft-cms): a Craft CMS 5 site is built with',
    '`bash cmd-craft-cms-project.sh <name> --install` from a sites folder (dev, test, sandboxes, demos),',
    'in a container like every other project, at https://<name>.ddev.site (the control panel at /admin).',
    'It is the free Solo edition and stays on it: one account, an admin, and no user groups; never a licence, a paid edition, a trial, or a sign-in to any account or store.',
    'That one account is the workspace account; with --add-users it is the default account instead, the one the test scenarios log in as.',
    '`bash cmd-tools-craft-cms-cli.sh <name>` says what the site is; `--run "<command>"` runs the craft console (php craft) in it,',
    '`--update` updates Craft CMS and its plugins, `--flush` clears the caches.',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the Craft CMS step pack; `--run` runs the suite.',
    `For Craft CMS work, hand over to the agents ${AGENTS.map((a) => `\`${a}\``).join(' and ')}.`,
    'Never run php, composer, npm or mysql on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
