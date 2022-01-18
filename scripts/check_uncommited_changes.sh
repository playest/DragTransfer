#! /bin/sh

if [ "$1" = "--nocheck" -o "$NO_CHECK" = "1" ]
then
    exit 0
fi

git diff-index --quiet HEAD --

if [ "$?" -ne 0 ]
then
    echo "There is some uncommited changes." >&2
    exit 1
fi
