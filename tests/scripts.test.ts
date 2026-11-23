import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(PKG, 'scripts', 'functions', 'fun-craft-cms.sh');

// The cucumber.js webship-js scaffolds, as far as the testing hook reads it.
const SCAFFOLD = `module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8080',
    },
  },
};
`;

/** A project folder with the testing stack scaffolded, and the tooling folder the installer would have filled. */
function project(type: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'craft-plugin-'));
  const dir = path.join(root, 'dev', 'site1');
  fs.mkdirSync(path.join(dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ddev', 'config.yaml'), `name: site1\ntype: ${type}\ndocroot: web\n`);
  // An installed site has its project config, which names the edition.
  fs.mkdirSync(path.join(dir, 'config', 'project'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'config', 'project', 'project.yaml'), 'system:\n  edition: solo\n  name: site1\n');
  fs.writeFileSync(path.join(dir, 'cucumber.js'), SCAFFOLD);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'site1', devDependencies: { 'webship-js': '^2.0.6' } }, null, 2));
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'craft-cms'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'testing', 'site.feature'), path.join(scripts, 'plugins', 'craft-cms', 'site.feature'));
  return { root, dir, scripts };
}

/** Run bash with the plugin's functions sourced and `ddev` replaced by a recorder; `craft users/list-admins` answers with DDEV_ADMINS. */
function bash(script: string, env: Record<string, string> = {}) {
  const fake = `ddev() { echo "ddev $*" >> "\${DDEV_LOG:-/dev/null}" ; case "$*" in *users/list-admins*) printf '%b' "\${DDEV_ADMINS:-}" ;; esac ; return 0 ; }`;
  const r = spawnSync('bash', ['-c', `${fake}\nsource ${FUNCTIONS}\n${script}`],
    { encoding: 'utf8', env: { ...process.env, ...env } });
  return r;
}

const THE_DEFAULT = ' - administrator (administrator@example.com)\\n';
const ANOTHER = ' - webmaster (webmaster@example.com)\\n';

test('the default account is one admin, with an example address: the Solo edition has one account', () => {
  const r = bash('set_craftcms_users ; for u in "${users[@]}" ; do n="user_${u}_name" ; m="user_${u}_mail" ; p="user_${u}_password" ; l="user_${u}_role" ; echo "${!n}|${!m}|${!p}|${!l}" ; done');
  assert.strictEqual(r.status, 0, r.stderr);
  const rows = r.stdout.trim().split('\n').map((l) => l.split('|'));
  assert.strictEqual(rows.length, 1);
  const [name, mail, password, role] = rows[0];
  assert.strictEqual(name, 'administrator');
  assert.strictEqual(mail, 'administrator@example.com');
  assert.strictEqual(role, 'admin');
  assert.ok(password.length >= 6, 'the password passes the rule of the platform');
});

test('the testing hook adds the step pack, the one-handle users registry and a first feature to a Craft CMS project, once', () => {
  const p = project('craftcms');
  const log = path.join(p.root, 'ddev.log');
  const run = () => bash(`cd ${p.dir} && testing_configure_craftcms ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log, DDEV_ADMINS: THE_DEFAULT });
  const r = run();
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const pkg = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.devDependencies['@webship-js/craft-cms-steps'], '^2.0.0');
  assert.strictEqual(pkg.devDependencies['webship-js'], '^2.0.6', 'what was there stays');
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const core = lines.findIndex((l) => l.includes('node_modules/webship-js/tests/step-definitions'));
  assert.strictEqual(lines[core + 1], "      'node_modules/@webship-js/craft-cms-steps/tests/step-definitions/**/*.js',", 'the pack is listed right after webship-js');
  assert.match(cucumber, /admin: \{ username: process\.env\.ADMIN_USER \|\| 'administrator', password: process\.env\.ADMIN_PASSWORD \|\| '[^']+' \},/);
  assert.doesNotMatch(cucumber, /process\.env\._ADMIN/, 'the variables have nothing in front, as the pack reads them');
  // Still a module node can load, with the registry where webship-js reads it.
  const loaded = spawnSync(process.execPath, ['-e', `const c = require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default; console.log(JSON.stringify([c.require, Object.keys(c.worldParameters.users)]))`], { encoding: 'utf8' });
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  const [requires, handles] = JSON.parse(loaded.stdout);
  assert.strictEqual(requires.length, 3);
  assert.deepStrictEqual(handles, ['admin']);
  assert.ok(fs.existsSync(path.join(p.dir, 'tests', 'features', 'site.feature')));
  assert.match(r.stdout, /the default account is the site's account \(administrator\)/);
  assert.doesNotMatch(fs.readFileSync(log, 'utf8'), /users\/create/, 'no account is ever created');
  // Again, after a person changed the feature: nothing is doubled, nothing is reset.
  fs.writeFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'Feature: mine\n');
  assert.strictEqual(run().status, 0);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), cucumber);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), 'Feature: mine\n');
});

test('the testing hook leaves a project of another platform alone', () => {
  const p = project('drupal11');
  const r = bash(`cd ${p.dir} && testing_configure_craftcms ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), SCAFFOLD);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests')));
});

test('the CLI tool refuses a project that is not Craft CMS', () => {
  const p = project('drupal11');
  const r = bash('PROJECT_NAME=site1 ; RUN="help" ; trim_project_name() { :; } ; craftcms_cli_tool', { WORKSPACE_ROOT: p.root, doc_name: 'dev' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /is not a Craft CMS project/);
});

test('the testing hook says so when the one account of the site is not the default account', () => {
  const p = project('craftcms');
  const r = bash(`cd ${p.dir} && testing_configure_craftcms ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_ADMINS: ANOTHER });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /one account is not the default account \(administrator\)/);
  assert.match(r.stdout, /ADMIN_USER and ADMIN_PASSWORD/);
});

test('adding the default account creates nothing: it is there, or the one account is another', () => {
  const p = project('craftcms');
  const log = path.join(p.root, 'ddev.log');
  const there = bash('PROJECT_NAME=site1 ; set_craftcms_users ; add_craftcms_users', { WORKSPACE_ROOT: p.root, doc_name: 'dev', DDEV_LOG: log, DDEV_ADMINS: THE_DEFAULT });
  assert.strictEqual(there.status, 0, there.stderr);
  assert.match(there.stdout, /administrator is already there/);
  const other = bash('PROJECT_NAME=site1 ; set_craftcms_users ; add_craftcms_users', { WORKSPACE_ROOT: p.root, doc_name: 'dev', DDEV_LOG: log, DDEV_ADMINS: ANOTHER });
  assert.strictEqual(other.status, 1, 'a tool that could not do what it was asked says so');
  assert.match(other.stdout, /Solo edition has one account, and this site's is not administrator/);
  assert.doesNotMatch(other.stdout, /dD\./, 'a password that was not used is not printed');
  assert.doesNotMatch(fs.readFileSync(log, 'utf8'), /users\/create|edition/);
});

test('cancelling the default account deletes nothing', () => {
  const p = project('craftcms');
  const log = path.join(p.root, 'ddev.log');
  const r = bash('PROJECT_NAME=site1 ; set_craftcms_users ; cancel_craftcms_users', { WORKSPACE_ROOT: p.root, doc_name: 'dev', DDEV_LOG: log, DDEV_ADMINS: THE_DEFAULT });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /administrator stays/);
  assert.doesNotMatch(fs.readFileSync(log, 'utf8'), /users\/delete|DELETE/);
});

test('the first feature names no platform in a step, and no password', () => {
  const feature = fs.readFileSync(path.join(PKG, 'testing', 'site.feature'), 'utf8');
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  assert.ok(steps.length >= 10);
  assert.doesNotMatch(feature, /as "(?!admin")[a-z]+"/, 'the one handle is admin');
  for (const s of steps) assert.doesNotMatch(s, /craft/i, s);
  assert.doesNotMatch(feature, /password "/);
  assert.doesNotMatch(feature, /user create|I register/i, 'a suite never creates an account');
});

// ---- The runtimes: DDEV as before, and Docker Compose, Podman, Kubernetes, Lando and Docksal through the core's layer ----

const ADDRESSES: Record<string, string> = {
  docker: 'http://127.0.0.1:41234', podman: 'http://127.0.0.1:41234', lando: 'http://127.0.0.1:41234',
  kubernetes: 'http://172.18.0.2:30080', docksal: 'http://site1.docksal.site',
};

/**
 * Run the builder in a throwaway workspace with `ddev` replaced by a recorder, and the core's layer by stand-ins:
 * `layer` is the runtime it answers with (runtime_of, rt_url), or '' for a core that has no layer yet. The recorder
 * makes what the starter project's create-project would have made, as far as the builder reads it.
 */
function build(layer: string, env: Record<string, string> = {}) {
  const p = project('craftcms');
  fs.rmSync(p.dir, { recursive: true });
  const log = path.join(p.root, 'ddev.log');
  const address = ADDRESSES[layer] || '';
  const prelude = [
    'ddev() { echo "ddev $*" >> "' + log + '" ; case "$*" in "composer create-project craftcms/craft"*) printf "CRAFT_ENVIRONMENT=dev\\nCRAFT_SECURITY_KEY=\\n" > .env.example.dev ; echo "{}" > composer.json ; echo "{}" > composer.json.default ;; esac ; return 0 ; }',
    'trim_project_name() { :; } ; drop_database() { :; } ; ddev_nodejs_version() { echo 24 ; } ; ddev_up() { ddev "$@" ; }',
    layer ? `runtime_of() { echo "\${RUNTIME_ANSWER}" ; } ; rt_url() { [ "\${RUNTIME_ANSWER}" == ddev ] && echo "https://\${PROJECT_NAME}.ddev.site" || echo "${address}" ; }` : '',
    `source ${FUNCTIONS}`,
    'craftcms_build',
  ].join('\n');
  const r = spawnSync('bash', ['-c', prelude], { encoding: 'utf8', input: '', env: { ...process.env, WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1',
    INSTALL: 'yes', ADD_USERS: 'no', LAUNCH: 'no', VERSION: '^5', PHP_VERSION: '8.3', distribution_webroot: 'web', project_template: 'craftcms/craft',
    RUNTIME: '_none_', RUNTIME_ANSWER: layer || 'ddev', account_name: 'webmaster', account_pass: 'Change_Me.123123', account_mail: 'webmaster@example.com', ...env } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').filter((c) => c.startsWith('ddev ')) : [];
  return { r, calls, dir: path.join(p.root, 'dev', 'site1') };
}

test('on DDEV the build is what it was: the same commands with the layer and without it, and no database setting written', () => {
  const without = build('');
  const withLayer = build('ddev');
  for (const b of [without, withLayer]) {
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    assert.match(b.r.stdout, /Go to https:\/\/site1\.ddev\.site\/admin and log in as webmaster/);
    assert.doesNotMatch(fs.readFileSync(path.join(b.dir, '.env'), 'utf8'), /CRAFT_DB_/, 'DDEV\'s craftcms type gives the database');
  }
  assert.deepStrictEqual(withLayer.calls, without.calls);
  assert.ok(without.calls.includes('ddev composer create-project craftcms/craft --no-scripts --no-interaction'));
  assert.ok(without.calls.some((c) => c.includes('install/craft') && c.includes('--site-url=https://site1.ddev.site')));
});

test('on Docker Compose, Podman, Kubernetes, Lando and Docksal the site gets the database of its stack in .env, and the runtime\'s address', () => {
  const ddev = build('ddev').calls;
  for (const runtime of Object.keys(ADDRESSES)) {
    const address = ADDRESSES[runtime];
    const b = build(runtime, { RUNTIME: runtime });
    assert.strictEqual(b.r.status, 0, runtime + ': ' + b.r.stderr + b.r.stdout);
    // The same commands, with the project root named and the runtime's address as the site's URL.
    const expected = ddev.map((c) => c.replace('ddev composer create-project craftcms/craft --no-scripts', 'ddev composer create-project craftcms/craft . --no-scripts')
      .replace('--site-url=https://site1.ddev.site', `--site-url=${address}`));
    assert.deepStrictEqual(b.calls, expected, runtime);
    const dotenv = fs.readFileSync(path.join(b.dir, '.env'), 'utf8');
    for (const line of ['CRAFT_ENVIRONMENT=dev', 'CRAFT_DB_DRIVER=mysql', 'CRAFT_DB_SERVER=db', 'CRAFT_DB_PORT=3306', 'CRAFT_DB_DATABASE=db', 'CRAFT_DB_USER=db', 'CRAFT_DB_PASSWORD=db']) {
      assert.match(dotenv, new RegExp(`^${line}$`, 'm'), `${runtime}: ${line}`);
    }
    assert.ok(!fs.existsSync(path.join(b.dir, '.ddev')), `${runtime}: nothing of DDEV's is written`);
    assert.match(b.r.stdout, new RegExp(`Go to ${address.replace(/[.]/g, '\\.')}/admin and log in as webmaster`), runtime);
    assert.doesNotMatch(b.r.stdout + dotenv, /ddev\.site/, runtime);
  }
});

test('--runtime on a workspace without the runtime layer is refused, never built on DDEV in silence', () => {
  const b = build('', { RUNTIME: 'docker' });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /--runtime docker needs a Webship Workspace with the container runtimes/);
  assert.deepStrictEqual(b.calls, []);
  assert.ok(!fs.existsSync(b.dir), 'no folder was made');
  assert.strictEqual(build('', { RUNTIME: 'ddev' }).r.status, 0);
});

test('the builder takes --runtime, with the runtimes of the core\'s own builders', () => {
  const args = fs.readFileSync(path.join(PKG, 'scripts', 'args', 'arg-craft-cms.sh'), 'utf8');
  assert.match(args, /parser\.add_argument\('--runtime',\s+dest='RUNTIME',\s+default="_none_",\s+choices=\['ddev', 'docker', 'podman', 'kubernetes', 'lando', 'docksal'\],/);
});

/** A site of another runtime: compose.yaml with its type, no .ddev folder. */
function runtimeSite() {
  const p = project('craftcms');
  fs.rmSync(path.join(p.dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(p.dir, 'compose.yaml'), 'name: site1\nx-webship:\n  runtime: docker\n  type: craftcms\n  port: 41234\n');
  return p;
}
const LAYER = 'runtime_of() { echo docker ; } ; rt_is_platform() { grep -q "^  type: $2$" "$1/compose.yaml" 2>/dev/null ; } ; rt_url() { echo http://127.0.0.1:41234 ; } ; ';

test('a site is known on every runtime: the layer reads its type', () => {
  const rt = runtimeSite();
  assert.strictEqual(bash(`${LAYER} craftcms_is_project ${rt.dir}`).status, 0);
  assert.notStrictEqual(bash(`craftcms_is_project ${rt.dir}`).status, 0, 'an older core reads no compose.yaml');
  assert.strictEqual(bash(`craftcms_is_project ${project('craftcms').dir}`).status, 0, 'DDEV as before');
  assert.notStrictEqual(bash(`${LAYER} craftcms_is_project ${project('drupal11').dir}`).status, 0);
});

test('the console tool works on a site of a runtime, and says its address', () => {
  const rt = runtimeSite();
  const log = path.join(rt.root, 'ddev.log');
  const env = { WORKSPACE_ROOT: rt.root, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log };
  const what = bash(`${LAYER} trim_project_name() { :; } ; RUN=_none_ ; UPDATE=no ; FLUSH=no ; ADD_USERS=no ; CANCEL_USERS=no ; craftcms_cli_tool`, env);
  assert.strictEqual(what.status, 0, what.stdout + what.stderr);
  assert.match(what.stdout, /^dev\/site1: Craft CMS .* at http:\/\/127\.0\.0\.1:41234$/m);
  assert.doesNotMatch(what.stdout, /ddev\.site/);
});

test('the feature of the runtimes drives a site of the platform, and names no platform in a step', () => {
  const feature = fs.readFileSync(path.join(PKG, 'features', 'craft-cms-runtimes.feature'), 'utf8');
  const scenarios = feature.split(/\n(?=  @needs-runtime-)/).slice(1);
  assert.strictEqual(scenarios.length, 6);
  for (const s of scenarios) assert.match(s, /^  @needs-runtime-(docker|kubernetes) @needs-platform-craftcms\n  Scenario: /);
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  for (const s of steps) assert.doesNotMatch(s, /craft/i, s);
  assert.doesNotMatch(feature, /ddev\.site|127\.0\.0\.1/);
  const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;
  assert.ok(manifest.features.includes('features/craft-cms-runtimes.feature'));
  assert.match(manifest.featuresSite, /^cmd-craft-cms-project\.sh ci-craft-cms( [A-Za-z0-9._=-]+)* --runtime docker$/);
});

test('the testing hook gives the suite the mailbox: MAIL_URL on a runtime other than DDEV, port 8026 of the site on DDEV, once', () => {
  const p = project('craftcms');
  const run = () => bash(`cd ${p.dir} && testing_configure_craftcms ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_ADMINS: THE_DEFAULT });
  const r = run();
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /cucumber\.js: the mailbox/);
  const file = path.join(p.dir, 'cucumber.js');
  const cucumber = fs.readFileSync(file, 'utf8');
  assert.strictEqual((cucumber.match(/^\s*mailUrl:/gm) || []).length, 1);
  const mail = (env: Record<string, string>) => {
    const loaded = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(file)}).default.worldParameters.mailUrl)`], { encoding: 'utf8', env: { ...process.env, MAIL_URL: '', LAUNCH_URL: '', ...env } });
    assert.strictEqual(loaded.status, 0, loaded.stderr);
    return loaded.stdout.trim();
  };
  // DDEV: the tests run with the site's address, and its Mailpit answers on port 8026 of it.
  assert.strictEqual(mail({ LAUNCH_URL: 'https://site1.ddev.site/' }), 'https://site1.ddev.site:8026');
  // Another runtime: the tests container hands the suite the mailbox (the core's rt_mail_url).
  assert.strictEqual(mail({ LAUNCH_URL: 'http://127.0.0.1:41234', MAIL_URL: 'http://127.0.0.1:41235' }), 'http://127.0.0.1:41235');
  // Again: not twice, and a mailbox a person set stays.
  assert.strictEqual(run().status, 0);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), cucumber);
});
