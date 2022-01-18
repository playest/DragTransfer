#! /bin/sh

if [ "$1" = "--nocheck" -o "$NO_CHECK" = "1" ]
then
    exit 0
fi

package_json_version=`jq -r ".version" package.json`
package_lock_json_version=`jq -r ".version" package-lock.json`

err=0

if [ "$package_json_version" != "$package_lock_json_version" ]
then
    echo "Different version number in package.json ($package_json_version) and package-lock.json ($package_lock_json_version)." >&2
    err=1
fi

if [ "$err" -ne 0 ]
then
    exit "$err"
fi