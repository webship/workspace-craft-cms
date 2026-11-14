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
