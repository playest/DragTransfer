#! /bin/sh

version="$1"
shortname="$2"
module_json_path="$2"

jq --arg version "$version" '(.version, .download, .manifest) |= gsub("{{version}}"; $version)' "$module_json_path"