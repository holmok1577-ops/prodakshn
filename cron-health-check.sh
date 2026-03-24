#!/bin/bash

cd "$(dirname "$0")"

node health-check.js >> logs/health-check.log 2>&1
