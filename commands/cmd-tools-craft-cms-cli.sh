#!/usr/bin/env bash

# Installed by the Craft CMS plugin (plugins.sh --install craft-cms); __WORKSPACE__ is the workspace it was installed into.
#
# The craft console (php craft) for one Craft CMS project of this workspace, in its container: say
# what the site is, run a console command, update Craft CMS and its plugins, clear the caches, say
# whether the default account is the site's. Nothing here runs on the host.

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Distribution: the name is the DDEV project type, which the user list is named after.
distribution_name="craftcms";

ARGPARSE_DESCRIPTION="Run the craft console on a Craft CMS project of __WORKSPACE__: status, a command, updates, caches, the default account"
# The args file comes with the plugin: core/scripts/plugins/craft-cms/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/craft-cms/args/arg-craft-cms-cli.sh || exit 1 ;

shift $#;

craftcms_cli_tool ;
