#! /bin/sh

version="$1"
shortname="$2"
module_json_path="$3"

jq --arg version "$version" --arg shortname "$shortname" '(.version, .download, .manifest) |= gsub("{{version}}" ; $version) | (.version, .download, .manifest) |= gsub("{{shortname}}"; $shortname)' "$module_json_path"