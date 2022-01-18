#! /bin/sh

version="$1"
module_json_path="$2"

jq --arg version "$version" '(.version, .download, .manifest) |= gsub("{{version}}"; $version)' "$module_json_path"