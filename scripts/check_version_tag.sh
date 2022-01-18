#! /bin/sh

if [ "$1" = "--nocheck" -o "$NO_CHECK" = "1" ]
then
    exit 0
fi

module_json_version=`jq -r ".version" module.json`
current_tag=`git tag --points-at HEAD`

if [ "v$module_json_version" != "$current_tag" ]
then
    echo "Trying to pack the app but the current commit has no tag ($current_tag) matching the current version ($module_json_version)." >&2
    exit 1
fi
