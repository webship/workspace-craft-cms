#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The Craft CMS project in this workspace.')
parser.add_argument('-r', '--run',
                    default="_none_",
                    help='A craft console command to run in the project, without the leading php craft. Example: --run "project-config/apply"')
parser.add_argument('-u', '--update',
                    action='store_true',
                    default=False,
                    help='Update Craft CMS and the plugins of the project to their latest releases, and clear the caches. The edition stays what it is.')
parser.add_argument('-f', '--flush',
                    action='store_true',
                    default=False,
                    help='Clear every cache, and nothing else.')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='Say whether the one account of the site is the default account. The Solo edition has one account, so none is created.')
parser.add_argument('-c', '--cancel-users',
                    action='store_true',
                    default=False,
                    help='Say why the default account stays: it is the only account of the site.')
ARGEOF
