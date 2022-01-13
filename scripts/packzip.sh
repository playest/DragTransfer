#! /bin/sh

if [ ! "$npm_package_name" ]
then
    echo "Since \$npm_package_name is empty it probably means that you tan this script from outside of npm. We will try to find values for the needed npm variables." >&2
    npm_package_name=`jq -r '.name' package.json`
    npm_package_version=`jq -r '.version' package.json`
    if [ "$pack_archive_name" = "-.tgz" ]
    then
        echo "Could no find value for the needed npm variables. Aborting." >&2
        exit 1
    fi
fi

npm pack

pack_archive_name="$npm_package_name-$npm_package_version.tgz"

if [ -f "$pack_archive_name" ]
then
    echo "Pack archive ($pack_archive_name) detected."
    mkdir -p "releases/v$npm_package_version/"
    tar xzf "$pack_archive_name" -C "releases/v$npm_package_version/"
    cd "releases/v$npm_package_version/"
    mv "package" "$npm_package_name-$npm_package_version"
    zip -r "$npm_package_name-$npm_package_version.zip" "$npm_package_name-$npm_package_version"
    cd ../..
    rm -r "releases/v$npm_package_version/$npm_package_name-$npm_package_version"
    cp "module.json" "releases/v$npm_package_version/"
else
    echo "Pack archive ($pack_archive_name) not found. Will not do anything."
fi

rm "$pack_archive_name"