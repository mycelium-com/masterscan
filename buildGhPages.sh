#!/bin/bash

git diff-index --quiet HEAD -- || { echo "Commit all changes" && exit 1; }

commitId=`git rev-parse --verify master`

rm -rf public/*
brunch build

git worktree add pages gh-pages

cp -r public/* pages
cd pages
git add *
git commit --m "Pages build for $commitId"

cd ..
rm -rf pages && git worktree prune