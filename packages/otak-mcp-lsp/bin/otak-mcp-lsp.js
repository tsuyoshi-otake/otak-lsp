#!/usr/bin/env node
'use strict';

const path = require('path');

const entry = path.resolve(__dirname, '..', 'mcp', 'out', 'main.js');
require(entry);
