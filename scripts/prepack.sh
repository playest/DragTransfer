#! /bin/sh

if [ "$1" = "--nocheck" -o "$NO_CHECK" = "1" ]
then
    exit 0
fi

err=0

./scripts/check_same_version.sh
if [ "$?" -ne 0 ]
then
    err=1
fi

./scripts/check_version_tag.sh
if [ "$?" -ne 0 ]
then
    err=2
fi

./scripts/check_uncommited_changes.sh
if [ "$?" -ne 0 ]
then
    err=3
fi

tsc -p .

if [ "$err" -ne 0 ]
then
    echo "Aborting."
    exit "$err"
fi