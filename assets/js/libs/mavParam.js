'use strict';
/*globals require, module */
/**
Module for loading/saving sets of mavlink parameters.
This is a Javascript translation from the mavlink/pymavlink/mavparm.py script in the main mavlink repository.

To deal with this in an async/nonblocking way gracefully, we do this in terms of expecting acks:

1- GCS sends param set request
2- The expected ack is added to an array of outstanding acks
3 - And event bound a single time to the PARAM_VALUE message will unset any matching param_ids
4- when the event is sent, after (retries) attempts, it throws an error
TBD make #4 work

**/
var _ = require('underscore'),
    Q = require('q'),
    Qretry = require('qretry'),
    EventEmitter = require('events').EventEmitter,
    mavlink = require('mavlink_ardupilotmega_v1.0');

// Logger, passed in object constructor for common logging
var log;

// Collection of promise objects.
var promises = {};

// Deferred objects that can be resolved.
var deferreds = {};

// Reference to the active mavlink parser/link object in use
var mavlinkParser;

// Log object is assumed to be a winston object.
function MavParam(mavlinkParserObject, logger) {

    log = logger;
    mavlinkParser = mavlinkParserObject;

}

MavParam.prototype.set = function(name, value) {

    // Guard if active promise for the given key.
    // Todo: enhance to also match key/value?
    if (_.has(promises, name)) {
        log.warn('Duplicate parameter set request sent for [' + name + '], currently active and unresolved.');
        return;
    }

    log.debug('Requesting parameter [' + name + '] be set to [' + value + ']...');

    // Build PARAM_SET message to send.
    var paramSetter = function() {
        var deferred = deferreds[name] = Q.defer();
        var param_set = new mavlink.messages.param_set(mavlinkParser.srcSystem, mavlinkParser.srcComponent, name, value, 0); // extra zero = don't care about type
        mavlinkParser.send(param_set);
        return deferred.promise;
    };

    // Listen for verified parameters.
    var paramVerifier = _.bind(function(message) {
        if (name == message.param_id) {
            deferreds[name].resolve();
            delete deferreds[name];
            delete promises[name];
            log.debug('Verified parameter [' + name + '] set to [' + value + ']');
            mavlinkParser.removeListener('PARAM_VALUE', paramVerifier);
        }
    }, this);

    promises[name] = new Qretry(paramSetter, {
        maxRetry: 5,
        interval: 100,
        intervalMultiplicator: 1.1
    });

    mavlinkParser.on('PARAM_VALUE', paramVerifier);
    return promises[name].promise;

};

MavParam.prototype.get = function(name) {
    var deferred = Q.defer();

    var parameterVerifier = _.bind(function(msg) {
        log.silly('Verifying parameter match between requested [%s] and received [%s]', name, msg.param_id);
        if (name === msg.param_id) {
            mavlinkParser.removeListener('PARAM_VALUE', parameterVerifier);
            log.silly('Removing paramVerifier listener, [%d] remaining listeners on PARAM_VALUE...', EventEmitter.listenerCount(mavlinkParser, 'PARAM_VALUE'));
            deferred.resolve(msg.param_value);
        }
    }, this);

    log.silly('Adding paramVerifier listener from single GET instance for [%s]...', name);
    mavlinkParser.on('PARAM_VALUE', parameterVerifier);

    var index = -1; // this will use the name as the lookup method
    var param_request_read = new mavlink.messages.param_request_read(mavlinkParser.srcSystem, mavlinkParser.srcComponent, name, index);
    mavlinkParser.send(param_request_read);

    return deferred.promise;
};

// Load a group of parameters.  Parameters is an array of arrays:
// [
//   [ param_name, value], ...
// ]
MavParam.prototype.loadParameters = function(parameters) {

    if (_.isEmpty(parameters)) {
        log.error('Empty param list provided to loadParameters()');
        throw new Error('Empty param list provided to loadParameters()');
    }

    var promises = [];

    _.each(parameters, function(e) {
        promises.push(this.set(e[0], e[1]));
    }, this);

    return promises;

};

MavParam.prototype.getAll = function() {
    var param_request_list = new mavlink.messages.param_request_list(mavlinkParser.srcSystem, mavlinkParser.srcComponent);
    mavlinkParser.send(param_request_list);
};

module.exports = MavParam;
