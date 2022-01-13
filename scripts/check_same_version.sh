#! /bin/sh

package_json_version=`jq ".version" package.json`
package_lock_json_version=`jq ".version" package-lock.json`
module_json_version=`jq ".version" module.json`

if [ "$package_json_version" != "$package_lock_json_version" ]
then
    echo "Version number in package.json ($package_json_version) and package-lock.json ($package_lock_json_version)." >&2
    exit 1
fi

if [ "$package_json_version" != "$module_json_version" ]
then
    echo "Version number in package.json ($package_json_version) and module.json ($module_json_version)." >&2
    exit 2
fi

if [ "$package_lock_json_version" != "$module_json_version" ]
then
    echo "Version number in package-lock.json ($package_lock_json_version) and module.json ($module_json_version)." >&2
    exit 3
fi