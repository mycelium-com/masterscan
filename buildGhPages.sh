#!/bin/bash

git diff-index --quiet HEAD -- || { echo "Commit all changes" && exit 1; }

commitId=`git rev-parse --verify master`

git checkout gh-pages

rm -rf public/*
brunch build

git add --force public/*

git commit --m "Pages build for $commitId"

git checkout master