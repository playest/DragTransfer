#! /bin/sh

package_json_version=`jq -r ".version" package.json`
package_lock_json_version=`jq -r ".version" package-lock.json`
module_json_version=`jq -r ".version" module.json`
module_json_manifest=`jq -r ".manifest" module.json`
module_json_download=`jq -r ".download" module.json`

err=0

if [ "$package_json_version" != "$package_lock_json_version" ]
then
    echo "Different version number in package.json ($package_json_version) and package-lock.json ($package_lock_json_version)." >&2
    err=1
fi

if [ "$package_json_version" != "$module_json_version" ]
then
    echo "Different version number in package.json ($package_json_version) and module.json ($module_json_version)." >&2
    err=2
fi

module_json_manifest_version=`echo $module_json_manifest | grep -o '/releases/download/v[0-9]\+\.[0-9]\+\.[1-9]\+/' | cut -d "/" -f 4 | cut -c 2-`
if [ "$module_json_manifest_version" != "$package_json_version" ]
then
    echo "Different version number in package.json ($package_json_version) and module.json/manifest ($module_json_manifest_version)." >&2
    err=3
fi

module_json_download_version=`echo $module_json_download | grep -o '/releases/download/v[0-9]\+\.[0-9]\+\.[1-9]\+/' | cut -d "/" -f 4 | cut -c 2-`
if [ "$module_json_download_version" != "$package_json_version" ]
then
    echo "Different version number in package.json ($package_json_version) and module.json/download ($module_json_download_version)." >&2
    err=4
fi

if [ "$err" -ne 0 ]
then
    exit "$err"
fi