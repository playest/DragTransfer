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

`/scripts/check_same_version.sh` checks that all version number.