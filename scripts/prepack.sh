#! /bin/sh

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

if [ "$err" -ne 0 ]
then
    echo "Aborting."
    exit "$err"
fi