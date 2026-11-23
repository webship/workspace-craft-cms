#!/usr/bin/env bash

# Craft CMS for the Webship Workspace: build a site, run the craft console on it, name its one
# account, and wire its step pack into the testing setup.
#
# Placed by `plugins.sh --install craft-cms` in core/scripts/plugins/craft-cms/functions/, where
# bootstrap sources it after the core's own functions. Everything runs in the project's container
# (DDEV by default: `ddev composer …`, `ddev exec php craft …`), never on the host. On DDEV the
# container tool gives the project its database settings; nothing here writes any.
#
# The runtimes: a site is built on DDEV, or with --runtime on Docker Compose, Podman, Kubernetes, Lando
# or Docksal. The commands are the same on each: `ddev <verb>` is DDEV itself on a DDEV project, and on
# another runtime the core's layer (fun-runtime.sh) gives the verb its meaning there. What differs is
# behind craftcms_runtime: the address (craftcms_url), the folder `composer create-project` makes the
# project in (DDEV takes the project root, the layer is told "."), and what DDEV's craftcms type gives
# the site and the other runtimes do not (craftcms_runtime_config: the database of the project's own
# stack, db/db/db on the host db, in the site's .env).
#
# The site is the free Solo edition and stays on it: it has ONE account, an admin, and no user
# groups. Nothing here enters a licence, switches a paid edition on (not even as a trial), or signs
# in to any account or store. So the list of default accounts has one entry, and it cannot be
# added to a site whose one account is somebody else's.
#
# Four names are the ones the core's tools look for, under the DDEV project type `craftcms`:
#   set_craftcms_users        the default account           (cmd-tools-add-users.sh <project> craftcms)
#   add_craftcms_users        say whether it is on the site (the same tool, and --add-users of the builder)
#   cancel_craftcms_users     say why it stays              (cmd-tools-cancel-users.sh <project> craftcms)
#   testing_configure_craftcms  the step pack in the testing stack (cmd-tools-testing.sh <project>)

# The step pack a Craft CMS project is tested with, and the release line it is required at.
readonly CRAFT_STEPS_PACKAGE='@webship-js/craft-cms-steps';
readonly CRAFT_STEPS_VERSION='^2.0.0';

# The default account: the one a scenario logs in as. The Solo edition has one account, so the
# list has one entry. Accounts are configuration; a test suite never creates or deletes one.
function set_craftcms_users() {
  users=(administrator);
  printf -v "user_administrator_name" '%s' 'administrator' ;
  printf -v "user_administrator_mail" '%s' 'administrator@example.com' ;
  printf -v "user_administrator_password" '%s' 'dD.123123ddd' ;
  printf -v "user_administrator_role" '%s' 'admin' ;
}

# The runtime of the project in this folder, or of a new build (--runtime, else the workspace's
# setting, else DDEV). A core without the runtime layer has DDEV only.
function craftcms_runtime() {
  if declare -f runtime_of > /dev/null ; then runtime_of ; else echo 'ddev' ; fi
}

# The address of the site in this folder: https://<name>.ddev.site on DDEV, http://127.0.0.1:<port> on
# Docker Compose, Podman and Lando, the node's address and a port on Kubernetes, http://<name>.docksal.site
# on Docksal. Asked after `ddev config`.
function craftcms_url() {
  if declare -f rt_url > /dev/null ; then rt_url ; else echo "https://${PROJECT_NAME}.ddev.site" ; fi
}

# Set keys of the site's .env: each where the file has it (commented out or not), else at the end.
# Only on a runtime that is not DDEV: there DDEV's craftcms type gives the container the values.
function craftcms_dotenv_set() {
  python3 - "$@" <<'PYEOF'
import re, sys
path, pairs = sys.argv[1], []
for arg in sys.argv[2:]:
    key, _, value = arg.partition('=')
    if not re.match(r'^[A-Z][A-Z0-9_]*$', key):
        sys.exit('craftcms_dotenv_set: KEY=value, not ' + arg)
    if re.search(r'[\s#"\'$\\]', value):
        value = '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'
    pairs.append((key, value))
try:
    lines = open(path).read().split('\n')
except FileNotFoundError:
    lines = []
if lines and lines[-1] == '':
    lines.pop()
for key, value in pairs:
    found = [i for i, l in enumerate(lines) if re.match(r'^\s*' + re.escape(key) + r'\s*=', l)] \
        or [i for i, l in enumerate(lines) if re.match(r'^\s*#\s*' + re.escape(key) + r'\s*=', l)]
    if found:
        lines[found[0]] = key + '=' + value
    else:
        lines.append(key + '=' + value)
open(path, 'w').write('\n'.join(lines) + '\n')
PYEOF
}

# What DDEV's craftcms project type gives the site, and the other runtimes do not: the database of the
# project's own stack (db, db, db on the host db, as on every runtime), in the site's .env. Only on a
# runtime that is not DDEV, in the project folder.
function craftcms_runtime_config() {
  craftcms_dotenv_set .env CRAFT_DB_DRIVER=mysql CRAFT_DB_SERVER=db CRAFT_DB_PORT=3306 \
    CRAFT_DB_DATABASE=db CRAFT_DB_USER=db CRAFT_DB_PASSWORD=db CRAFT_DB_SCHEMA= CRAFT_DB_TABLE_PREFIX= ;
}

# Is this folder a Craft CMS project? Its project type says so: on DDEV in .ddev/config.yaml, on another
# runtime in the x-webship block, both read by the core's rt_is_platform.
function craftcms_is_project() {
  local project_path="$1";
  if declare -f rt_is_platform > /dev/null ; then
    rt_is_platform "${project_path}" craftcms ;
    return $? ;
  fi
  grep -qE '^type:[[:space:]]*"?craftcms"?[[:space:]]*$' "${project_path}/.ddev/config.yaml" 2>/dev/null ;
}

# Is the site installed? The installer writes the project config, and nothing else does.
function craftcms_is_installed() {
  [ -f "$1/config/project/project.yaml" ] ;
}

# Go to the project a tool was asked about, or say why not.
function craftcms_enter_project() {
  local project_path="${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}";
  if [ ! -d "${project_path}" ] ; then
    echo "No project ${PROJECT_NAME} in ${WORKSPACE_ROOT}/${doc_name}." ;
    return 1 ;
  fi
  if ! craftcms_is_project "${project_path}" ; then
    echo "${doc_name}/${PROJECT_NAME} is not a Craft CMS project (its project type is not craftcms)." ;
    return 1 ;
  fi
  cd "${project_path}" || return 1 ;
}

# Run the craft console in the container of the project the shell is in. Every argument is
# quoted for the container's shell, so a site name of two words arrives as one argument.
function craftcms_cli() {
  local line="php craft" arg ;
  for arg in "$@" ; do
    line="${line} $(printf '%q' "${arg}")" ;
  done
  ddev exec "${line}" ;
}

# Is the admin of this username the site's account?
function craftcms_user_exists() {
  craftcms_cli users/list-admins 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep -qE "(^|[^A-Za-z0-9._-])$1([^A-Za-z0-9._@-]|$)" ;
}

# The release of Craft CMS in the project the shell is in.
function craftcms_version() {
  ddev composer show craftcms/cms 2>/dev/null | awk '/^versions/ {print $NF}' | tr -d '\r' ;
}

# The edition the site is on, from its project config.
function craftcms_edition() {
  sed -nE 's/^[[:space:]]+edition:[[:space:]]*([a-z]+).*$/\1/p' "$1/config/project/project.yaml" 2>/dev/null | head -1 ;
}

# Build a Craft CMS site from nothing: the container, the code, and with --install the site itself.
function craftcms_build() {
  trim_project_name ;
  local base_url runtime ;
  runtime="$(craftcms_runtime)" ;
  if [ "${RUNTIME:-_none_}" != '_none_' ] && [ "${RUNTIME}" != "${runtime}" ] ; then
    echo "--runtime ${RUNTIME} needs a Webship Workspace with the container runtimes (webship/workspace#694): update the workspace, or build on DDEV." ;
    exit 1 ;
  fi
  local version="${VERSION:-${site_version:-^5}}" ;
  local php_version="${PHP_VERSION:-${site_php_version:-8.3}}" ;
  local admin_name="${account_name}" admin_pass="${account_pass}" admin_mail="${account_mail}" ;

  cd ${WORKSPACE_ROOT}/${doc_name} || exit 1 ;

  drop_database ;
  rm -rf "${PROJECT_NAME}" ;
  mkdir -p "${PROJECT_NAME}" ;
  cd ${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME} || exit 1 ;

  ddev config --project-type=craftcms --docroot="${distribution_webroot}" --project-name=${PROJECT_NAME} \
    --php-version=${php_version} --nodejs-version=$(ddev_nodejs_version) || exit 1 ;
  # The address is the runtime's to say, once the project is configured: never a written ddev.site.
  base_url="$(craftcms_url)" ;
  ddev_up start -y || exit 1 ;

  # The starter project. Its post-create script opens an installer that asks questions, so the
  # scripts are skipped and their steps are done here: the environment file and the project's own
  # composer.json.
  # DDEV makes it in the project root; the layer of another runtime is told so (".").
  local into='' ;
  [ "${runtime}" != 'ddev' ] && into='.' ;
  ddev composer create-project "${project_template}" ${into} --no-scripts --no-interaction \
    || { echo "composer create-project ${project_template} failed." ; exit 1 ; } ;
  cp .env.example.dev .env || exit 1 ;
  if [ "${runtime}" != 'ddev' ] ; then
    # What DDEV's craftcms type gives the container: the database of the project's own stack.
    craftcms_runtime_config || { echo "The .env of the site could not be written." ; exit 1 ; } ;
  fi
  rm -f composer.json && mv composer.json.default composer.json || exit 1 ;
  if [ ! "${version}" == '^5' ] ; then
    ddev composer require "craftcms/cms:${version}" --no-interaction --with-all-dependencies \
      || { echo "composer require craftcms/cms:${version} failed." ; exit 1 ; } ;
  fi

  craftcms_cli setup/keys || exit 1 ;

  if [ "${INSTALL}" == 'yes' ] ; then
    if [ "${ADD_USERS}" == 'yes' ] ; then
      # The Solo edition has one account. With --add-users it is the default account, so that a
      # scenario logs in with an account made for tests and never with the workspace account.
      set_craftcms_users ;
      admin_name="${user_administrator_name}" ; admin_pass="${user_administrator_password}" ; admin_mail="${user_administrator_mail}" ;
      echo "The free Solo edition has one account: it is the default account, ${admin_name}." ;
    fi

    craftcms_cli install/craft --interactive=0 \
      --username="${admin_name}" --password="${admin_pass}" --email="${admin_mail}" \
      --site-name="${doc_name} ${PROJECT_NAME}" --site-url="${base_url}" --language=en-US \
      || { echo "craft install/craft failed. Craft CMS asks for a password of 6 characters or more: see account: pass in core/config/settings.yml." ; exit 1 ; } ;

    echo "${doc_name} ${PROJECT_NAME} has been installed: Craft CMS $(craftcms_version), the $(craftcms_edition "$(pwd)") edition.";
    echo "Go to ${base_url}/admin and log in as ${admin_name}";
  else
    [ "${ADD_USERS}" == 'yes' ] && echo "--add-users needs --install: there is no site to give an account to yet." ;
    echo "${doc_name} ${PROJECT_NAME} is ready to install.";
    echo "Go to ${base_url}/admin/install";
  fi

  if [ "${LAUNCH}" == 'yes' ] ; then
    ddev launch ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The default account on a site that is already there. The Solo edition has one account and the
# installer made it, so there is nothing to create: this says whether that account is the
# default one, and what to do when it is not.
# The list is loaded by the caller (set_craftcms_users): the core's add_users, the builder, the CLI tool.
function add_craftcms_users() {
  craftcms_enter_project || return 1 ;
  local user user_name user_mail user_role status=0 ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_mail="user_${user}_mail"; user_role="user_${user}_role";

    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo "      User mail: ${!user_mail}";
    echo "      User role: ${!user_role}";
    echo " ================================================================= ";

    if craftcms_user_exists "${!user_name}" ; then
      echo "   ${!user_name} is already there: it is the site's account." ;
    else
      echo "   The free Solo edition has one account, and this site's is not ${!user_name}." ;
      echo "   A second account needs a paid edition, which this workspace does not switch on." ;
      echo "   Build the site again with --install --add-users to make its one account the default account." ;
      status=1 ;
    fi
  done
  cd ${WORKSPACE_ROOT}/${doc_name};
  return ${status} ;
}

# The default account cannot be taken away: it is the site's only account.
function cancel_craftcms_users() {
  craftcms_enter_project || return 1 ;
  local user user_name ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name";
    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo " ================================================================= ";
    if craftcms_user_exists "${!user_name}" ; then
      echo "   ${!user_name} stays: the free Solo edition has one account, and a site cannot be without it." ;
      echo "   Build the site again with --install, and without --add-users, to give that account to the workspace account." ;
    else
      echo "   ${!user_name} is not there." ;
    fi
  done
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# What cmd-tools-craft-cms-cli.sh does: the first of --run, --update, --flush, --add-users,
# --cancel-users that was asked for; with none of them, what the site is.
function craftcms_cli_tool() {
  trim_project_name ;
  craftcms_enter_project || exit 1 ;

  if ! ddev describe -j 2>/dev/null | grep -q '"status":"running"' ; then
    ddev start -y || exit 1 ;
  fi

  if [ ! "${RUN}" == '_none_' ] ; then
    # One string on purpose: --run "project-config/apply --force" is a command and its arguments.
    ddev exec "php craft ${RUN}" ;
    exit $? ;
  fi

  if [ "${UPDATE}" == 'yes' ] ; then
    craftcms_cli update all --interactive=0 && craftcms_cli clear-caches/all ;
  elif [ "${FLUSH}" == 'yes' ] ; then
    craftcms_cli clear-caches/all ;
  elif [ "${ADD_USERS}" == 'yes' ] ; then
    set_craftcms_users ;
    add_craftcms_users ;
  elif [ "${CANCEL_USERS}" == 'yes' ] ; then
    set_craftcms_users ;
    cancel_craftcms_users ;
  else
    echo "${doc_name}/${PROJECT_NAME}: Craft CMS $(craftcms_version) at $(craftcms_url)" ;
    if craftcms_is_installed "$(pwd)" ; then
      echo "Edition: $(craftcms_edition "$(pwd)")" ;
      echo "" ; echo "The account:" ; craftcms_cli users/list-admins ;
      echo "" ; echo "Plugins:" ; craftcms_cli plugin/list ;
    else
      echo "The site is not installed yet: open its address at /admin/install, or build it again with --install." ;
    fi
  fi
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The step pack in the testing stack of a Craft CMS project. The core's testing_configure calls
# this in the project folder once webship-js is scaffolded and before the dependencies are
# installed; for a project that is not Craft CMS it changes nothing.
#
# It adds the pack to package.json, lists its step definitions in cucumber.js after webship-js's
# own, gives cucumber.js the users registry of the default account (a handle a scenario reads,
# mapped to an account; never the workspace account), and writes a first feature when the project
# has none of its own. Every part is skipped when it is already there, so a second run adds what
# the first missed and never resets a suite.
function testing_configure_craftcms() {
  local project_path="$1";
  craftcms_is_project "${project_path}" || return 0 ;
  if [ ! -f "${project_path}/cucumber.js" ] || [ ! -f "${project_path}/package.json" ] ; then
    echo "  Craft CMS: cucumber.js is not here yet — run the testing setup again once webship-js is scaffolded." ;
    return 1 ;
  fi

  echo "Adding the Craft CMS step pack (${CRAFT_STEPS_PACKAGE} ${CRAFT_STEPS_VERSION}).";
  set_craftcms_users ;
  local registry="" user user_name user_password handle ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_password="user_${user}_password";
    # The pack's features call the admin "admin".
    handle="${user}" ; [ "${user}" == 'administrator' ] && handle="admin" ;
    registry="${registry}${handle}|${!user_name}|${!user_password}"$'\n' ;
  done

  # The pack reads ADMIN_USER and ADMIN_PASSWORD, with nothing in front: the registry keeps its names.
  python3 - "${project_path}" "${CRAFT_STEPS_PACKAGE}" "${CRAFT_STEPS_VERSION}" '' 'PASSWORD' "${registry}" <<'PYEOF' || return 1
import json, re, sys

project, pack, version, prefix, secret, registry = sys.argv[1:7]

# package.json: the pack as a dev dependency, at the release line this plugin was proven on.
pkg_file = project + '/package.json'
pkg = json.load(open(pkg_file))
if pack not in pkg.get('dependencies', {}) and pack not in pkg.get('devDependencies', {}):
    pkg.setdefault('devDependencies', {})[pack] = version
    open(pkg_file, 'w').write(json.dumps(pkg, indent=2) + '\n')
    print('  package.json: %s %s' % (pack, version))

# cucumber.js: the pack's step definitions after webship-js's own, and the users registry.
cucumber_file = project + '/cucumber.js'
src = open(cucumber_file).read()
before = src

if ('node_modules/%s/' % pack) not in src:
    line = "'node_modules/%s/tests/step-definitions/**/*.js'," % pack
    core = re.search(r"^([ \t]*)'node_modules/webship-js/tests/step-definitions/[^']*',.*$", src, re.M)
    opening = re.search(r"^([ \t]*)require:[ \t]*\[[ \t]*$", src, re.M)
    if core:
        src = src[:core.end()] + '\n' + core.group(1) + line + src[core.end():]
    elif opening:
        src = src[:opening.end()] + '\n' + opening.group(1) + '  ' + line + src[opening.end():]
    else:
        sys.exit("  cucumber.js has no require list this can add to. Add this line to it:\n    " + line)
    print('  cucumber.js: the step definitions of %s' % pack)

if not re.search(r"^[ \t]*mailUrl:", src, re.M):
    world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)
    if not world:
        sys.exit("  cucumber.js has no worldParameters block to add the mailbox to.")
    pad = world.group(1) + '  '
    block = [
        pad + "// The mailbox that catches the mail of the site (the password reset steps read it): MAIL_URL, which",
        pad + "// the tests container gives on a runtime other than DDEV, else DDEV's Mailpit, the site's address on port 8026.",
        pad + "mailUrl: process.env.MAIL_URL || (process.env.LAUNCH_URL || '').replace(/\\/+$/, '') + ':8026',",
    ]
    src = src[:world.end()] + '\n' + '\n'.join(block) + src[world.end():]
    print('  cucumber.js: the mailbox')

if not re.search(r"^[ \t]*users:[ \t]*\{", src, re.M):
    world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)
    if not world:
        sys.exit("  cucumber.js has no worldParameters block to add the users registry to.")
    pad = world.group(1) + '  '
    lead = '%s_' % prefix if prefix else ''
    rows = [r.split('|') for r in registry.splitlines() if r.strip()]
    block = [
        pad + "// The users registry: a handle a scenario reads, mapped to an account of this site (the default",
        pad + "// accounts: cmd-tools-add-users.sh). Override one with %s<HANDLE>_USER and %s<HANDLE>_%s." % (lead, lead, secret),
        pad + "users: {",
    ]
    for handle, name, password in rows:
        env = ('%s_' % prefix if prefix else '') + handle.upper()
        block.append(pad + "  %s: { username: process.env.%s_USER || '%s', password: process.env.%s_%s || '%s' }," % (handle, env, name, env, secret, password))
    block.append(pad + "},")
    src = src[:world.end()] + '\n' + '\n'.join(block) + src[world.end():]
    print('  cucumber.js: the users registry (%s)' % ', '.join(r[0] for r in rows))

if src != before:
    open(cucumber_file, 'w').write(src)
PYEOF

  # A first feature, when the project has none for the site yet: the front page, the login form,
  # the admin account.
  local feature="${WORKSPACE_SCRIPTS}/plugins/craft-cms/site.feature" ;
  if [ -f "${feature}" ] && [ ! -f "${project_path}/tests/features/site.feature" ] ; then
    mkdir -p "${project_path}/tests/features" && cp "${feature}" "${project_path}/tests/features/site.feature" \
      && echo "  tests/features/site.feature: a first feature for the site" ;
  fi

  # The scenarios log in as the default account. A site has one account: say when it is another.
  if craftcms_is_installed "${project_path}" ; then
    if craftcms_user_exists "${user_administrator_name}" ; then
      echo "  the default account is the site's account (${user_administrator_name})" ;
    else
      echo "  The site's one account is not the default account (${user_administrator_name}): the free Solo edition has no room for a second." ;
      echo "  Give a run the site's own account with ADMIN_USER and ADMIN_PASSWORD in its environment, or build the site again with --install --add-users." ;
    fi
  fi
}
