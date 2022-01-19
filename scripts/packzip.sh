#! /bin/sh

no_check_opt=""
no_check_env=0

# TODO make a loop to read the arguments, this code needs a specific order for the arguments which doesn't really makes sense

if [ "$1" = "--nocheck" ]
then
    no_check_opt="--nocheck"
    no_check_env=1
    echo "Disable checks"
    shift
elif [ "$NO_CHECK" = "1" ]
then
    no_check_opt="--nocheck"
    no_check_env=1
fi

if [ "$1" = "--set-version" ]
then
    echo "version set to" $2
    version="$2"
    shift
    shift
else
    version="$npm_package_version"
fi

if [ ! "$npm_package_name" -a ! $version ]
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

if [ "$1" = "--set-shortname" ]
then
    echo "shortname set to" $2
    shortname="$2"
    shift
    shift
else
    shortname=v"$version"
fi

NO_CHECK=$no_check_env npm pack

pack_archive_name="$npm_package_name-$npm_package_version.tgz"

if [ -f "$pack_archive_name" ]
then
    echo "Pack archive ($pack_archive_name) detected."
    mkdir -p "releases/$shortname/"
    tar xzf "$pack_archive_name" -C "releases/$shortname/"
    # Create updated module.json (with version number taken from package.json)
    ./scripts/replace_version.sh "$version" "$shortname" "module.json" > "releases/$shortname/module.json"
    cd "releases/$shortname/"
    # Rename the directory
    mv "package" "$npm_package_name-$shortname"
    # Copy updated module.json
    cp module.json "$npm_package_name-$shortname"
    git log --pretty=format:'%H' -n 1 > "$npm_package_name-$shortname/hash.txt"
    zip -r "$npm_package_name-$shortname.zip" "$npm_package_name-$shortname"
    cd ../..
    rm -r "releases/$shortname/$npm_package_name-$shortname"
else
    echo "Pack archive ($pack_archive_name) not found. Will not do anything."
    exit 1
fi

rm "$pack_archive_name"