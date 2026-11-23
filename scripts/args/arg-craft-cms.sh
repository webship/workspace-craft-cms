#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The name of the project: its folder, and its name on the container runtime (on DDEV its host name too).')
parser.add_argument('--runtime',
                    dest='RUNTIME',
                    default="_none_",
                    choices=['ddev', 'docker', 'podman', 'kubernetes', 'lando', 'docksal'],
                    help='The container runtime to build on: ddev (the default, or container.runtime of settings.yml), docker (Docker Compose), podman, kubernetes, lando or docksal.')
parser.add_argument('-v', '--version',
                    default="${site_version}",
                    help='The Craft CMS release, as a Composer constraint of craftcms/cms. Example: --version 5.8.0 [default %(default)s]')
parser.add_argument('-i', '--install',
                    action='store_true',
                    default=False,
                    help='Install Craft CMS on the free Solo edition, with the workspace account as its one account, an admin.')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='With --install, make the one account of the site the default account instead: the one the test scenarios log in as. The Solo edition has no second account.')
parser.add_argument('-l', '--launch',
                    action='store_true',
                    default=False,
                    help='Open the site in a browser when it is ready.')
parser.add_argument('--php-version',
                    default="8.3",
                    choices=['8.4', '8.3', '8.2'],
                    help='PHP version for the project container. Example: --php-version 8.4 [default %(default)s]')
ARGEOF
