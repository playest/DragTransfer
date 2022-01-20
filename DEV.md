# Common tasks

This section contains some pointer about how to do some common tasks.

## Build

- `npm install`
- `./scripts/build.sh`

## Change version number

Version number must be updated in:
- /package.json
    - version field
- /package-lock.json
    - version field (should probably be updated by running `npm install`)

`/scripts/check_same_version_light.sh` checks that all version numbers are identical.

Version number in module.json is set to `{{version}}` which is a special string that the release workflow automatically replace when a release is made. The same is true for `{{shortname}}`

## Make a release

`npm run packzip` will put all the files you need for a release in "/releases/vx.y.z". If will run a lot of checks so know that you need to:

- have all version number be identical everywhere
- have no uncommited work
- have the last commit tagged with the current version number ("v1.2.3" if package.json says `version: "1.2.3"` for example)
