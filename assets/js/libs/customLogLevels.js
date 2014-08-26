/*
 * npm-config.js: Config that conform to npm logging levels.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 *
 */

var gcsConfig = exports;

gcsConfig.levels = {
  heartbeat: 0, // for periodic events like heartbeats
  silly: 1,
  debug: 2,
  verbose: 3,
  info: 4,
  warn: 5,
  error: 6
};

gcsConfig.colors = {
  heartbeat: 'grey',
  silly: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  info: 'green',
  warn: 'yellow',
  error: 'red'
};