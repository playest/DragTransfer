# Common tasks

This section contains some pointer about how to do some common tasks.

## Change version number

Version number must be updated in:
- /module.json
    - version field
    - url in the manifest field
    - url in the download field
- /package.json
    - version field
- /package-lock.json
    - version field (should probably be updated by running `npm install`)

`/scripts/check_same_version.sh` checks that all version numbers are identical.

## Make a release

`npm run packzip` will put all the files you need for a release in "/releases/vx.y.z". If will run a lot of checks so know that you need to:

- have all version number be identical everywhere
- have no uncommited work
- have the last commit tagged with the current version number ("v1.2.3" if package.json says `version: "1.2.3"` for example)
