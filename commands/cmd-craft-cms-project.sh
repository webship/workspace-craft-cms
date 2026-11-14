#!/usr/bin/env bash

# workspace-name: Craft CMS (5, Solo)

# Installed by the Craft CMS plugin (plugins.sh --install craft-cms); __WORKSPACE__ is the workspace it was installed into.
#
# Build a Craft CMS site in a container: the current release of Craft CMS 5, or the one --version
# names, at https://<name>.ddev.site, on the free Solo edition. With --install the site is
# installed with the workspace account as its one account, an admin; with --add-users that one
# account is the default account instead, the one the test scenarios log in as.

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Set site version.
site_version="^5";

# Distribution: the name is the DDEV project type, which the user list is named after.
distribution_name="craftcms";
distribution_title="Craft CMS";
distribution_webroot="web";
project_template="craftcms/craft";

ARGPARSE_DESCRIPTION="Build a ${distribution_title} project in __WORKSPACE__"
# The args file comes with the plugin: core/scripts/plugins/craft-cms/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/craft-cms/args/arg-craft-cms.sh || exit 1 ;

shift $#;

craftcms_build ;
