var global = Function("return this;")();
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var oldRequire = require
    , modules = {}
    ;

  function newRequire(modulename) {
    var err
      , mod
      , metamod
      ;

    try {
      mod = oldRequire(modulename);
    } catch(e) {
      err = e;
    }

    if (mod) {
      return mod;
    }

    metamod = modules[modulename];
    
    if (metamod) {
      mod = metamod();
      return mod;
    }

    // make it possible to require 'process', etc
    mod = global[modulename];

    if (mod) {
      return mod;
    }

    console.error(modulename);
    throw err;
  }

  function provide(modulename, factory) {
    var modReal
      ;

    function metamod() {
      if (modReal) {
        return modReal;
      }

      if (!factory.__pakmanager_factory__) {
        modReal = factory;
        return factory;
      }

      if (factory.__factoryIsResolving) {
        console.error('Your circular dependencies are too powerful!');
        return factory.__moduleExports;
      }

      factory.__factoryIsResolving = true;
      factory.__moduleExports = {};
      modReal = factory(factory.__moduleExports);
      factory.__factoryIsResolving = false;

      return modReal;
    }

    modules[modulename] = metamod;
    // somewhat of a dirty hack since I don't have a plug for loading the "main" module otherwise
    modules['pakmanager.main'] = metamod;
  }

  require = newRequire;
  global.require = newRequire;
  global.provide = provide;
}());

// pakmanager:delayed-stream
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var Stream = require('stream').Stream;
    var util = require('util');
    
    module.exports = DelayedStream;
    function DelayedStream() {
      this.source = null;
      this.dataSize = 0;
      this.maxDataSize = 1024 * 1024;
      this.pauseStream = true;
    
      this._maxDataSizeExceeded = false;
      this._released = false;
      this._bufferedEvents = [];
    }
    util.inherits(DelayedStream, Stream);
    
    DelayedStream.create = function(source, options) {
      var delayedStream = new this();
    
      options = options || {};
      for (var option in options) {
        delayedStream[option] = options[option];
      }
    
      delayedStream.source = source;
    
      var realEmit = source.emit;
      source.emit = function() {
        delayedStream._handleEmit(arguments);
        return realEmit.apply(source, arguments);
      };
    
      source.on('error', function() {});
      if (delayedStream.pauseStream) {
        source.pause();
      }
    
      return delayedStream;
    };
    
    DelayedStream.prototype.__defineGetter__('readable', function() {
      return this.source.readable;
    });
    
    DelayedStream.prototype.setEncoding = function() {
      return this.source.setEncoding.apply(this.source, arguments);
    };
    
    DelayedStream.prototype.resume = function() {
      if (!this._released) {
        this.release();
      }
    
      this.source.resume();
    };
    
    DelayedStream.prototype.pause = function() {
      this.source.pause();
    };
    
    DelayedStream.prototype.release = function() {
      this._released = true;
    
      this._bufferedEvents.forEach(function(args) {
        this.emit.apply(this, args);
      }.bind(this));
      this._bufferedEvents = [];
    };
    
    DelayedStream.prototype.pipe = function() {
      var r = Stream.prototype.pipe.apply(this, arguments);
      this.resume();
      return r;
    };
    
    DelayedStream.prototype._handleEmit = function(args) {
      if (this._released) {
        this.emit.apply(this, args);
        return;
      }
    
      if (args[0] === 'data') {
        this.dataSize += args[1].length;
        this._checkIfMaxDataSizeExceeded();
      }
    
      this._bufferedEvents.push(args);
    };
    
    DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
      if (this._maxDataSizeExceeded) {
        return;
      }
    
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
    
      this._maxDataSizeExceeded = true;
      var message =
        'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.'
      this.emit('error', new Error(message));
    };
    
  provide("delayed-stream", module.exports);
}(global));

// pakmanager:mime-db
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * mime-db
     * Copyright(c) 2014 Jonathan Ong
     * MIT Licensed
     */
    
    /**
     * Module exports.
     */
    
    module.exports = require('./db.json')
    
  provide("mime-db", module.exports);
}(global));

// pakmanager:ms
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /**
     * Helpers.
     */
    
    var s = 1000;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var y = d * 365.25;
    
    /**
     * Parse or format the given `val`.
     *
     * Options:
     *
     *  - `long` verbose formatting [false]
     *
     * @param {String|Number} val
     * @param {Object} options
     * @return {String|Number}
     * @api public
     */
    
    module.exports = function(val, options){
      options = options || {};
      if ('string' == typeof val) return parse(val);
      return options.long
        ? long(val)
        : short(val);
    };
    
    /**
     * Parse the given `str` and return milliseconds.
     *
     * @param {String} str
     * @return {Number}
     * @api private
     */
    
    function parse(str) {
      var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
      if (!match) return;
      var n = parseFloat(match[1]);
      var type = (match[2] || 'ms').toLowerCase();
      switch (type) {
        case 'years':
        case 'year':
        case 'yrs':
        case 'yr':
        case 'y':
          return n * y;
        case 'days':
        case 'day':
        case 'd':
          return n * d;
        case 'hours':
        case 'hour':
        case 'hrs':
        case 'hr':
        case 'h':
          return n * h;
        case 'minutes':
        case 'minute':
        case 'mins':
        case 'min':
        case 'm':
          return n * m;
        case 'seconds':
        case 'second':
        case 'secs':
        case 'sec':
        case 's':
          return n * s;
        case 'milliseconds':
        case 'millisecond':
        case 'msecs':
        case 'msec':
        case 'ms':
          return n;
      }
    }
    
    /**
     * Short format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */
    
    function short(ms) {
      if (ms >= d) return Math.round(ms / d) + 'd';
      if (ms >= h) return Math.round(ms / h) + 'h';
      if (ms >= m) return Math.round(ms / m) + 'm';
      if (ms >= s) return Math.round(ms / s) + 's';
      return ms + 'ms';
    }
    
    /**
     * Long format for `ms`.
     *
     * @param {Number} ms
     * @return {String}
     * @api private
     */
    
    function long(ms) {
      return plural(ms, d, 'day')
        || plural(ms, h, 'hour')
        || plural(ms, m, 'minute')
        || plural(ms, s, 'second')
        || ms + ' ms';
    }
    
    /**
     * Pluralization helper.
     */
    
    function plural(ms, n, name) {
      if (ms < n) return;
      if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
      return Math.ceil(ms / n) + ' ' + name + 's';
    }
    
  provide("ms", module.exports);
}(global));

// pakmanager:async
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*!
     * async
     * https://github.com/caolan/async
     *
     * Copyright 2010-2014 Caolan McMahon
     * Released under the MIT license
     */
    /*jshint onevar: false, indent:4 */
    /*global setImmediate: false, setTimeout: false, console: false */
    (function () {
    
        var async = {};
    
        // global on the server, window in the browser
        var root, previous_async;
    
        root = this;
        if (root != null) {
          previous_async = root.async;
        }
    
        async.noConflict = function () {
            root.async = previous_async;
            return async;
        };
    
        function only_once(fn) {
            var called = false;
            return function() {
                if (called) throw new Error("Callback was already called.");
                called = true;
                fn.apply(root, arguments);
            }
        }
    
        //// cross-browser compatiblity functions ////
    
        var _toString = Object.prototype.toString;
    
        var _isArray = Array.isArray || function (obj) {
            return _toString.call(obj) === '[object Array]';
        };
    
        var _each = function (arr, iterator) {
            if (arr.forEach) {
                return arr.forEach(iterator);
            }
            for (var i = 0; i < arr.length; i += 1) {
                iterator(arr[i], i, arr);
            }
        };
    
        var _map = function (arr, iterator) {
            if (arr.map) {
                return arr.map(iterator);
            }
            var results = [];
            _each(arr, function (x, i, a) {
                results.push(iterator(x, i, a));
            });
            return results;
        };
    
        var _reduce = function (arr, iterator, memo) {
            if (arr.reduce) {
                return arr.reduce(iterator, memo);
            }
            _each(arr, function (x, i, a) {
                memo = iterator(memo, x, i, a);
            });
            return memo;
        };
    
        var _keys = function (obj) {
            if (Object.keys) {
                return Object.keys(obj);
            }
            var keys = [];
            for (var k in obj) {
                if (obj.hasOwnProperty(k)) {
                    keys.push(k);
                }
            }
            return keys;
        };
    
        //// exported async module functions ////
    
        //// nextTick implementation with browser-compatible fallback ////
        if (typeof process === 'undefined' || !(process.nextTick)) {
            if (typeof setImmediate === 'function') {
                async.nextTick = function (fn) {
                    // not a direct alias for IE10 compatibility
                    setImmediate(fn);
                };
                async.setImmediate = async.nextTick;
            }
            else {
                async.nextTick = function (fn) {
                    setTimeout(fn, 0);
                };
                async.setImmediate = async.nextTick;
            }
        }
        else {
            async.nextTick = process.nextTick;
            if (typeof setImmediate !== 'undefined') {
                async.setImmediate = function (fn) {
                  // not a direct alias for IE10 compatibility
                  setImmediate(fn);
                };
            }
            else {
                async.setImmediate = async.nextTick;
            }
        }
    
        async.each = function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length) {
                return callback();
            }
            var completed = 0;
            _each(arr, function (x) {
                iterator(x, only_once(done) );
            });
            function done(err) {
              if (err) {
                  callback(err);
                  callback = function () {};
              }
              else {
                  completed += 1;
                  if (completed >= arr.length) {
                      callback();
                  }
              }
            }
        };
        async.forEach = async.each;
    
        async.eachSeries = function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length) {
                return callback();
            }
            var completed = 0;
            var iterate = function () {
                iterator(arr[completed], function (err) {
                    if (err) {
                        callback(err);
                        callback = function () {};
                    }
                    else {
                        completed += 1;
                        if (completed >= arr.length) {
                            callback();
                        }
                        else {
                            iterate();
                        }
                    }
                });
            };
            iterate();
        };
        async.forEachSeries = async.eachSeries;
    
        async.eachLimit = function (arr, limit, iterator, callback) {
            var fn = _eachLimit(limit);
            fn.apply(null, [arr, iterator, callback]);
        };
        async.forEachLimit = async.eachLimit;
    
        var _eachLimit = function (limit) {
    
            return function (arr, iterator, callback) {
                callback = callback || function () {};
                if (!arr.length || limit <= 0) {
                    return callback();
                }
                var completed = 0;
                var started = 0;
                var running = 0;
    
                (function replenish () {
                    if (completed >= arr.length) {
                        return callback();
                    }
    
                    while (running < limit && started < arr.length) {
                        started += 1;
                        running += 1;
                        iterator(arr[started - 1], function (err) {
                            if (err) {
                                callback(err);
                                callback = function () {};
                            }
                            else {
                                completed += 1;
                                running -= 1;
                                if (completed >= arr.length) {
                                    callback();
                                }
                                else {
                                    replenish();
                                }
                            }
                        });
                    }
                })();
            };
        };
    
    
        var doParallel = function (fn) {
            return function () {
                var args = Array.prototype.slice.call(arguments);
                return fn.apply(null, [async.each].concat(args));
            };
        };
        var doParallelLimit = function(limit, fn) {
            return function () {
                var args = Array.prototype.slice.call(arguments);
                return fn.apply(null, [_eachLimit(limit)].concat(args));
            };
        };
        var doSeries = function (fn) {
            return function () {
                var args = Array.prototype.slice.call(arguments);
                return fn.apply(null, [async.eachSeries].concat(args));
            };
        };
    
    
        var _asyncMap = function (eachfn, arr, iterator, callback) {
            arr = _map(arr, function (x, i) {
                return {index: i, value: x};
            });
            if (!callback) {
                eachfn(arr, function (x, callback) {
                    iterator(x.value, function (err) {
                        callback(err);
                    });
                });
            } else {
                var results = [];
                eachfn(arr, function (x, callback) {
                    iterator(x.value, function (err, v) {
                        results[x.index] = v;
                        callback(err);
                    });
                }, function (err) {
                    callback(err, results);
                });
            }
        };
        async.map = doParallel(_asyncMap);
        async.mapSeries = doSeries(_asyncMap);
        async.mapLimit = function (arr, limit, iterator, callback) {
            return _mapLimit(limit)(arr, iterator, callback);
        };
    
        var _mapLimit = function(limit) {
            return doParallelLimit(limit, _asyncMap);
        };
    
        // reduce only has a series version, as doing reduce in parallel won't
        // work in many situations.
        async.reduce = function (arr, memo, iterator, callback) {
            async.eachSeries(arr, function (x, callback) {
                iterator(memo, x, function (err, v) {
                    memo = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, memo);
            });
        };
        // inject alias
        async.inject = async.reduce;
        // foldl alias
        async.foldl = async.reduce;
    
        async.reduceRight = function (arr, memo, iterator, callback) {
            var reversed = _map(arr, function (x) {
                return x;
            }).reverse();
            async.reduce(reversed, memo, iterator, callback);
        };
        // foldr alias
        async.foldr = async.reduceRight;
    
        var _filter = function (eachfn, arr, iterator, callback) {
            var results = [];
            arr = _map(arr, function (x, i) {
                return {index: i, value: x};
            });
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (v) {
                    if (v) {
                        results.push(x);
                    }
                    callback();
                });
            }, function (err) {
                callback(_map(results.sort(function (a, b) {
                    return a.index - b.index;
                }), function (x) {
                    return x.value;
                }));
            });
        };
        async.filter = doParallel(_filter);
        async.filterSeries = doSeries(_filter);
        // select alias
        async.select = async.filter;
        async.selectSeries = async.filterSeries;
    
        var _reject = function (eachfn, arr, iterator, callback) {
            var results = [];
            arr = _map(arr, function (x, i) {
                return {index: i, value: x};
            });
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (v) {
                    if (!v) {
                        results.push(x);
                    }
                    callback();
                });
            }, function (err) {
                callback(_map(results.sort(function (a, b) {
                    return a.index - b.index;
                }), function (x) {
                    return x.value;
                }));
            });
        };
        async.reject = doParallel(_reject);
        async.rejectSeries = doSeries(_reject);
    
        var _detect = function (eachfn, arr, iterator, main_callback) {
            eachfn(arr, function (x, callback) {
                iterator(x, function (result) {
                    if (result) {
                        main_callback(x);
                        main_callback = function () {};
                    }
                    else {
                        callback();
                    }
                });
            }, function (err) {
                main_callback();
            });
        };
        async.detect = doParallel(_detect);
        async.detectSeries = doSeries(_detect);
    
        async.some = function (arr, iterator, main_callback) {
            async.each(arr, function (x, callback) {
                iterator(x, function (v) {
                    if (v) {
                        main_callback(true);
                        main_callback = function () {};
                    }
                    callback();
                });
            }, function (err) {
                main_callback(false);
            });
        };
        // any alias
        async.any = async.some;
    
        async.every = function (arr, iterator, main_callback) {
            async.each(arr, function (x, callback) {
                iterator(x, function (v) {
                    if (!v) {
                        main_callback(false);
                        main_callback = function () {};
                    }
                    callback();
                });
            }, function (err) {
                main_callback(true);
            });
        };
        // all alias
        async.all = async.every;
    
        async.sortBy = function (arr, iterator, callback) {
            async.map(arr, function (x, callback) {
                iterator(x, function (err, criteria) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        callback(null, {value: x, criteria: criteria});
                    }
                });
            }, function (err, results) {
                if (err) {
                    return callback(err);
                }
                else {
                    var fn = function (left, right) {
                        var a = left.criteria, b = right.criteria;
                        return a < b ? -1 : a > b ? 1 : 0;
                    };
                    callback(null, _map(results.sort(fn), function (x) {
                        return x.value;
                    }));
                }
            });
        };
    
        async.auto = function (tasks, callback) {
            callback = callback || function () {};
            var keys = _keys(tasks);
            var remainingTasks = keys.length
            if (!remainingTasks) {
                return callback();
            }
    
            var results = {};
    
            var listeners = [];
            var addListener = function (fn) {
                listeners.unshift(fn);
            };
            var removeListener = function (fn) {
                for (var i = 0; i < listeners.length; i += 1) {
                    if (listeners[i] === fn) {
                        listeners.splice(i, 1);
                        return;
                    }
                }
            };
            var taskComplete = function () {
                remainingTasks--
                _each(listeners.slice(0), function (fn) {
                    fn();
                });
            };
    
            addListener(function () {
                if (!remainingTasks) {
                    var theCallback = callback;
                    // prevent final callback from calling itself if it errors
                    callback = function () {};
    
                    theCallback(null, results);
                }
            });
    
            _each(keys, function (k) {
                var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
                var taskCallback = function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    if (err) {
                        var safeResults = {};
                        _each(_keys(results), function(rkey) {
                            safeResults[rkey] = results[rkey];
                        });
                        safeResults[k] = args;
                        callback(err, safeResults);
                        // stop subsequent errors hitting callback multiple times
                        callback = function () {};
                    }
                    else {
                        results[k] = args;
                        async.setImmediate(taskComplete);
                    }
                };
                var requires = task.slice(0, Math.abs(task.length - 1)) || [];
                var ready = function () {
                    return _reduce(requires, function (a, x) {
                        return (a && results.hasOwnProperty(x));
                    }, true) && !results.hasOwnProperty(k);
                };
                if (ready()) {
                    task[task.length - 1](taskCallback, results);
                }
                else {
                    var listener = function () {
                        if (ready()) {
                            removeListener(listener);
                            task[task.length - 1](taskCallback, results);
                        }
                    };
                    addListener(listener);
                }
            });
        };
    
        async.retry = function(times, task, callback) {
            var DEFAULT_TIMES = 5;
            var attempts = [];
            // Use defaults if times not passed
            if (typeof times === 'function') {
                callback = task;
                task = times;
                times = DEFAULT_TIMES;
            }
            // Make sure times is a number
            times = parseInt(times, 10) || DEFAULT_TIMES;
            var wrappedTask = function(wrappedCallback, wrappedResults) {
                var retryAttempt = function(task, finalAttempt) {
                    return function(seriesCallback) {
                        task(function(err, result){
                            seriesCallback(!err || finalAttempt, {err: err, result: result});
                        }, wrappedResults);
                    };
                };
                while (times) {
                    attempts.push(retryAttempt(task, !(times-=1)));
                }
                async.series(attempts, function(done, data){
                    data = data[data.length - 1];
                    (wrappedCallback || callback)(data.err, data.result);
                });
            }
            // If a callback is passed, run this as a controll flow
            return callback ? wrappedTask() : wrappedTask
        };
    
        async.waterfall = function (tasks, callback) {
            callback = callback || function () {};
            if (!_isArray(tasks)) {
              var err = new Error('First argument to waterfall must be an array of functions');
              return callback(err);
            }
            if (!tasks.length) {
                return callback();
            }
            var wrapIterator = function (iterator) {
                return function (err) {
                    if (err) {
                        callback.apply(null, arguments);
                        callback = function () {};
                    }
                    else {
                        var args = Array.prototype.slice.call(arguments, 1);
                        var next = iterator.next();
                        if (next) {
                            args.push(wrapIterator(next));
                        }
                        else {
                            args.push(callback);
                        }
                        async.setImmediate(function () {
                            iterator.apply(null, args);
                        });
                    }
                };
            };
            wrapIterator(async.iterator(tasks))();
        };
    
        var _parallel = function(eachfn, tasks, callback) {
            callback = callback || function () {};
            if (_isArray(tasks)) {
                eachfn.map(tasks, function (fn, callback) {
                    if (fn) {
                        fn(function (err) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            if (args.length <= 1) {
                                args = args[0];
                            }
                            callback.call(null, err, args);
                        });
                    }
                }, callback);
            }
            else {
                var results = {};
                eachfn.each(_keys(tasks), function (k, callback) {
                    tasks[k](function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        results[k] = args;
                        callback(err);
                    });
                }, function (err) {
                    callback(err, results);
                });
            }
        };
    
        async.parallel = function (tasks, callback) {
            _parallel({ map: async.map, each: async.each }, tasks, callback);
        };
    
        async.parallelLimit = function(tasks, limit, callback) {
            _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
        };
    
        async.series = function (tasks, callback) {
            callback = callback || function () {};
            if (_isArray(tasks)) {
                async.mapSeries(tasks, function (fn, callback) {
                    if (fn) {
                        fn(function (err) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            if (args.length <= 1) {
                                args = args[0];
                            }
                            callback.call(null, err, args);
                        });
                    }
                }, callback);
            }
            else {
                var results = {};
                async.eachSeries(_keys(tasks), function (k, callback) {
                    tasks[k](function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        results[k] = args;
                        callback(err);
                    });
                }, function (err) {
                    callback(err, results);
                });
            }
        };
    
        async.iterator = function (tasks) {
            var makeCallback = function (index) {
                var fn = function () {
                    if (tasks.length) {
                        tasks[index].apply(null, arguments);
                    }
                    return fn.next();
                };
                fn.next = function () {
                    return (index < tasks.length - 1) ? makeCallback(index + 1): null;
                };
                return fn;
            };
            return makeCallback(0);
        };
    
        async.apply = function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            return function () {
                return fn.apply(
                    null, args.concat(Array.prototype.slice.call(arguments))
                );
            };
        };
    
        var _concat = function (eachfn, arr, fn, callback) {
            var r = [];
            eachfn(arr, function (x, cb) {
                fn(x, function (err, y) {
                    r = r.concat(y || []);
                    cb(err);
                });
            }, function (err) {
                callback(err, r);
            });
        };
        async.concat = doParallel(_concat);
        async.concatSeries = doSeries(_concat);
    
        async.whilst = function (test, iterator, callback) {
            if (test()) {
                iterator(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    async.whilst(test, iterator, callback);
                });
            }
            else {
                callback();
            }
        };
    
        async.doWhilst = function (iterator, test, callback) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                var args = Array.prototype.slice.call(arguments, 1);
                if (test.apply(null, args)) {
                    async.doWhilst(iterator, test, callback);
                }
                else {
                    callback();
                }
            });
        };
    
        async.until = function (test, iterator, callback) {
            if (!test()) {
                iterator(function (err) {
                    if (err) {
                        return callback(err);
                    }
                    async.until(test, iterator, callback);
                });
            }
            else {
                callback();
            }
        };
    
        async.doUntil = function (iterator, test, callback) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                var args = Array.prototype.slice.call(arguments, 1);
                if (!test.apply(null, args)) {
                    async.doUntil(iterator, test, callback);
                }
                else {
                    callback();
                }
            });
        };
    
        async.queue = function (worker, concurrency) {
            if (concurrency === undefined) {
                concurrency = 1;
            }
            function _insert(q, data, pos, callback) {
              if (!q.started){
                q.started = true;
              }
              if (!_isArray(data)) {
                  data = [data];
              }
              if(data.length == 0) {
                 // call drain immediately if there are no tasks
                 return async.setImmediate(function() {
                     if (q.drain) {
                         q.drain();
                     }
                 });
              }
              _each(data, function(task) {
                  var item = {
                      data: task,
                      callback: typeof callback === 'function' ? callback : null
                  };
    
                  if (pos) {
                    q.tasks.unshift(item);
                  } else {
                    q.tasks.push(item);
                  }
    
                  if (q.saturated && q.tasks.length === q.concurrency) {
                      q.saturated();
                  }
                  async.setImmediate(q.process);
              });
            }
    
            var workers = 0;
            var q = {
                tasks: [],
                concurrency: concurrency,
                saturated: null,
                empty: null,
                drain: null,
                started: false,
                paused: false,
                push: function (data, callback) {
                  _insert(q, data, false, callback);
                },
                kill: function () {
                  q.drain = null;
                  q.tasks = [];
                },
                unshift: function (data, callback) {
                  _insert(q, data, true, callback);
                },
                process: function () {
                    if (!q.paused && workers < q.concurrency && q.tasks.length) {
                        var task = q.tasks.shift();
                        if (q.empty && q.tasks.length === 0) {
                            q.empty();
                        }
                        workers += 1;
                        var next = function () {
                            workers -= 1;
                            if (task.callback) {
                                task.callback.apply(task, arguments);
                            }
                            if (q.drain && q.tasks.length + workers === 0) {
                                q.drain();
                            }
                            q.process();
                        };
                        var cb = only_once(next);
                        worker(task.data, cb);
                    }
                },
                length: function () {
                    return q.tasks.length;
                },
                running: function () {
                    return workers;
                },
                idle: function() {
                    return q.tasks.length + workers === 0;
                },
                pause: function () {
                    if (q.paused === true) { return; }
                    q.paused = true;
                    q.process();
                },
                resume: function () {
                    if (q.paused === false) { return; }
                    q.paused = false;
                    q.process();
                }
            };
            return q;
        };
        
        async.priorityQueue = function (worker, concurrency) {
            
            function _compareTasks(a, b){
              return a.priority - b.priority;
            };
            
            function _binarySearch(sequence, item, compare) {
              var beg = -1,
                  end = sequence.length - 1;
              while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                  beg = mid;
                } else {
                  end = mid - 1;
                }
              }
              return beg;
            }
            
            function _insert(q, data, priority, callback) {
              if (!q.started){
                q.started = true;
              }
              if (!_isArray(data)) {
                  data = [data];
              }
              if(data.length == 0) {
                 // call drain immediately if there are no tasks
                 return async.setImmediate(function() {
                     if (q.drain) {
                         q.drain();
                     }
                 });
              }
              _each(data, function(task) {
                  var item = {
                      data: task,
                      priority: priority,
                      callback: typeof callback === 'function' ? callback : null
                  };
                  
                  q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);
    
                  if (q.saturated && q.tasks.length === q.concurrency) {
                      q.saturated();
                  }
                  async.setImmediate(q.process);
              });
            }
            
            // Start with a normal queue
            var q = async.queue(worker, concurrency);
            
            // Override push to accept second parameter representing priority
            q.push = function (data, priority, callback) {
              _insert(q, data, priority, callback);
            };
            
            // Remove unshift function
            delete q.unshift;
    
            return q;
        };
    
        async.cargo = function (worker, payload) {
            var working     = false,
                tasks       = [];
    
            var cargo = {
                tasks: tasks,
                payload: payload,
                saturated: null,
                empty: null,
                drain: null,
                drained: true,
                push: function (data, callback) {
                    if (!_isArray(data)) {
                        data = [data];
                    }
                    _each(data, function(task) {
                        tasks.push({
                            data: task,
                            callback: typeof callback === 'function' ? callback : null
                        });
                        cargo.drained = false;
                        if (cargo.saturated && tasks.length === payload) {
                            cargo.saturated();
                        }
                    });
                    async.setImmediate(cargo.process);
                },
                process: function process() {
                    if (working) return;
                    if (tasks.length === 0) {
                        if(cargo.drain && !cargo.drained) cargo.drain();
                        cargo.drained = true;
                        return;
                    }
    
                    var ts = typeof payload === 'number'
                                ? tasks.splice(0, payload)
                                : tasks.splice(0, tasks.length);
    
                    var ds = _map(ts, function (task) {
                        return task.data;
                    });
    
                    if(cargo.empty) cargo.empty();
                    working = true;
                    worker(ds, function () {
                        working = false;
    
                        var args = arguments;
                        _each(ts, function (data) {
                            if (data.callback) {
                                data.callback.apply(null, args);
                            }
                        });
    
                        process();
                    });
                },
                length: function () {
                    return tasks.length;
                },
                running: function () {
                    return working;
                }
            };
            return cargo;
        };
    
        var _console_fn = function (name) {
            return function (fn) {
                var args = Array.prototype.slice.call(arguments, 1);
                fn.apply(null, args.concat([function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (typeof console !== 'undefined') {
                        if (err) {
                            if (console.error) {
                                console.error(err);
                            }
                        }
                        else if (console[name]) {
                            _each(args, function (x) {
                                console[name](x);
                            });
                        }
                    }
                }]));
            };
        };
        async.log = _console_fn('log');
        async.dir = _console_fn('dir');
        /*async.info = _console_fn('info');
        async.warn = _console_fn('warn');
        async.error = _console_fn('error');*/
    
        async.memoize = function (fn, hasher) {
            var memo = {};
            var queues = {};
            hasher = hasher || function (x) {
                return x;
            };
            var memoized = function () {
                var args = Array.prototype.slice.call(arguments);
                var callback = args.pop();
                var key = hasher.apply(null, args);
                if (key in memo) {
                    async.nextTick(function () {
                        callback.apply(null, memo[key]);
                    });
                }
                else if (key in queues) {
                    queues[key].push(callback);
                }
                else {
                    queues[key] = [callback];
                    fn.apply(null, args.concat([function () {
                        memo[key] = arguments;
                        var q = queues[key];
                        delete queues[key];
                        for (var i = 0, l = q.length; i < l; i++) {
                          q[i].apply(null, arguments);
                        }
                    }]));
                }
            };
            memoized.memo = memo;
            memoized.unmemoized = fn;
            return memoized;
        };
    
        async.unmemoize = function (fn) {
          return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
          };
        };
    
        async.times = function (count, iterator, callback) {
            var counter = [];
            for (var i = 0; i < count; i++) {
                counter.push(i);
            }
            return async.map(counter, iterator, callback);
        };
    
        async.timesSeries = function (count, iterator, callback) {
            var counter = [];
            for (var i = 0; i < count; i++) {
                counter.push(i);
            }
            return async.mapSeries(counter, iterator, callback);
        };
    
        async.seq = function (/* functions... */) {
            var fns = arguments;
            return function () {
                var that = this;
                var args = Array.prototype.slice.call(arguments);
                var callback = args.pop();
                async.reduce(fns, args, function (newargs, fn, cb) {
                    fn.apply(that, newargs.concat([function () {
                        var err = arguments[0];
                        var nextargs = Array.prototype.slice.call(arguments, 1);
                        cb(err, nextargs);
                    }]))
                },
                function (err, results) {
                    callback.apply(that, [err].concat(results));
                });
            };
        };
    
        async.compose = function (/* functions... */) {
          return async.seq.apply(null, Array.prototype.reverse.call(arguments));
        };
    
        var _applyEach = function (eachfn, fns /*args...*/) {
            var go = function () {
                var that = this;
                var args = Array.prototype.slice.call(arguments);
                var callback = args.pop();
                return eachfn(fns, function (fn, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            };
            if (arguments.length > 2) {
                var args = Array.prototype.slice.call(arguments, 2);
                return go.apply(this, args);
            }
            else {
                return go;
            }
        };
        async.applyEach = doParallel(_applyEach);
        async.applyEachSeries = doSeries(_applyEach);
    
        async.forever = function (fn, callback) {
            function next(err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    }
                    throw err;
                }
                fn(next);
            }
            next();
        };
    
        // Node.js
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = async;
        }
        // AMD / RequireJS
        else if (typeof define !== 'undefined' && define.amd) {
            define([], function () {
                return async;
            });
        }
        // included directly via <script> tag
        else {
            root.async = async;
        }
    
    }());
    
  provide("async", module.exports);
}(global));

// pakmanager:combined-stream
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var util = require('util');
    var Stream = require('stream').Stream;
    var DelayedStream = require('delayed-stream');
    
    module.exports = CombinedStream;
    function CombinedStream() {
      this.writable = false;
      this.readable = true;
      this.dataSize = 0;
      this.maxDataSize = 2 * 1024 * 1024;
      this.pauseStreams = true;
    
      this._released = false;
      this._streams = [];
      this._currentStream = null;
    }
    util.inherits(CombinedStream, Stream);
    
    CombinedStream.create = function(options) {
      var combinedStream = new this();
    
      options = options || {};
      for (var option in options) {
        combinedStream[option] = options[option];
      }
    
      return combinedStream;
    };
    
    CombinedStream.isStreamLike = function(stream) {
      return (typeof stream !== 'function')
        && (typeof stream !== 'string')
        && (typeof stream !== 'boolean')
        && (typeof stream !== 'number')
        && (!Buffer.isBuffer(stream));
    };
    
    CombinedStream.prototype.append = function(stream) {
      var isStreamLike = CombinedStream.isStreamLike(stream);
    
      if (isStreamLike) {
        if (!(stream instanceof DelayedStream)) {
          var newStream = DelayedStream.create(stream, {
            maxDataSize: Infinity,
            pauseStream: this.pauseStreams,
          });
          stream.on('data', this._checkDataSize.bind(this));
          stream = newStream;
        }
    
        this._handleErrors(stream);
    
        if (this.pauseStreams) {
          stream.pause();
        }
      }
    
      this._streams.push(stream);
      return this;
    };
    
    CombinedStream.prototype.pipe = function(dest, options) {
      Stream.prototype.pipe.call(this, dest, options);
      this.resume();
      return dest;
    };
    
    CombinedStream.prototype._getNext = function() {
      this._currentStream = null;
      var stream = this._streams.shift();
    
    
      if (typeof stream == 'undefined') {
        this.end();
        return;
      }
    
      if (typeof stream !== 'function') {
        this._pipeNext(stream);
        return;
      }
    
      var getStream = stream;
      getStream(function(stream) {
        var isStreamLike = CombinedStream.isStreamLike(stream);
        if (isStreamLike) {
          stream.on('data', this._checkDataSize.bind(this));
          this._handleErrors(stream);
        }
    
        this._pipeNext(stream);
      }.bind(this));
    };
    
    CombinedStream.prototype._pipeNext = function(stream) {
      this._currentStream = stream;
    
      var isStreamLike = CombinedStream.isStreamLike(stream);
      if (isStreamLike) {
        stream.on('end', this._getNext.bind(this));
        stream.pipe(this, {end: false});
        return;
      }
    
      var value = stream;
      this.write(value);
      this._getNext();
    };
    
    CombinedStream.prototype._handleErrors = function(stream) {
      var self = this;
      stream.on('error', function(err) {
        self._emitError(err);
      });
    };
    
    CombinedStream.prototype.write = function(data) {
      this.emit('data', data);
    };
    
    CombinedStream.prototype.pause = function() {
      if (!this.pauseStreams) {
        return;
      }
    
      if(this.pauseStreams && this._currentStream && typeof(this._currentStream.pause) == 'function') this._currentStream.pause();
      this.emit('pause');
    };
    
    CombinedStream.prototype.resume = function() {
      if (!this._released) {
        this._released = true;
        this.writable = true;
        this._getNext();
      }
    
      if(this.pauseStreams && this._currentStream && typeof(this._currentStream.resume) == 'function') this._currentStream.resume();
      this.emit('resume');
    };
    
    CombinedStream.prototype.end = function() {
      this._reset();
      this.emit('end');
    };
    
    CombinedStream.prototype.destroy = function() {
      this._reset();
      this.emit('close');
    };
    
    CombinedStream.prototype._reset = function() {
      this.writable = false;
      this._streams = [];
      this._currentStream = null;
    };
    
    CombinedStream.prototype._checkDataSize = function() {
      this._updateDataSize();
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
    
      var message =
        'DelayedStream#maxDataSize of ' + this.maxDataSize + ' bytes exceeded.';
      this._emitError(new Error(message));
    };
    
    CombinedStream.prototype._updateDataSize = function() {
      this.dataSize = 0;
    
      var self = this;
      this._streams.forEach(function(stream) {
        if (!stream.dataSize) {
          return;
        }
    
        self.dataSize += stream.dataSize;
      });
    
      if (this._currentStream && this._currentStream.dataSize) {
        this.dataSize += this._currentStream.dataSize;
      }
    };
    
    CombinedStream.prototype._emitError = function(err) {
      this._reset();
      this.emit('error', err);
    };
    
  provide("combined-stream", module.exports);
}(global));

// pakmanager:mime-types
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    var db = require('mime-db')
    
    // types[extension] = type
    exports.types = Object.create(null)
    // extensions[type] = [extensions]
    exports.extensions = Object.create(null)
    
    Object.keys(db).forEach(function (name) {
      var mime = db[name]
      var exts = mime.extensions
      if (!exts || !exts.length) return
      exports.extensions[name] = exts
      exts.forEach(function (ext) {
        exports.types[ext] = name
      })
    })
    
    exports.lookup = function (string) {
      if (!string || typeof string !== "string") return false
      // remove any leading paths, though we should just use path.basename
      string = string.replace(/.*[\.\/\\]/, '').toLowerCase()
      if (!string) return false
      return exports.types[string] || false
    }
    
    exports.extension = function (type) {
      if (!type || typeof type !== "string") return false
      // to do: use media-typer
      type = type.match(/^\s*([^;\s]*)(?:;|\s|$)/)
      if (!type) return false
      var exts = exports.extensions[type[1].toLowerCase()]
      if (!exts || !exts.length) return false
      return exts[0]
    }
    
    // type has to be an exact mime type
    exports.charset = function (type) {
      var mime = db[type]
      if (mime && mime.charset) return mime.charset
    
      // default text/* to utf-8
      if (/^text\//.test(type)) return 'UTF-8'
    
      return false
    }
    
    // backwards compatibility
    exports.charsets = {
      lookup: exports.charset
    }
    
    // to do: maybe use set-type module or something
    exports.contentType = function (type) {
      if (!type || typeof type !== "string") return false
      if (!~type.indexOf('/')) type = exports.lookup(type)
      if (!type) return false
      if (!~type.indexOf('charset')) {
        var charset = exports.charset(type)
        if (charset) type += '; charset=' + charset.toLowerCase()
      }
      return type
    }
    
  provide("mime-types", module.exports);
}(global));

// pakmanager:core-util-is
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray(ar) {
      return Array.isArray(ar);
    }
    exports.isArray = isArray;
    
    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }
    exports.isBoolean = isBoolean;
    
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    
    function isNumber(arg) {
      return typeof arg === 'number';
    }
    exports.isNumber = isNumber;
    
    function isString(arg) {
      return typeof arg === 'string';
    }
    exports.isString = isString;
    
    function isSymbol(arg) {
      return typeof arg === 'symbol';
    }
    exports.isSymbol = isSymbol;
    
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    
    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }
    exports.isRegExp = isRegExp;
    
    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }
    exports.isObject = isObject;
    
    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }
    exports.isDate = isDate;
    
    function isError(e) {
      return isObject(e) &&
          (objectToString(e) === '[object Error]' || e instanceof Error);
    }
    exports.isError = isError;
    
    function isFunction(arg) {
      return typeof arg === 'function';
    }
    exports.isFunction = isFunction;
    
    function isPrimitive(arg) {
      return arg === null ||
             typeof arg === 'boolean' ||
             typeof arg === 'number' ||
             typeof arg === 'string' ||
             typeof arg === 'symbol' ||  // ES6 symbol
             typeof arg === 'undefined';
    }
    exports.isPrimitive = isPrimitive;
    
    function isBuffer(arg) {
      return Buffer.isBuffer(arg);
    }
    exports.isBuffer = isBuffer;
    
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  provide("core-util-is", module.exports);
}(global));

// pakmanager:isarray
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = Array.isArray || function (arr) {
      return Object.prototype.toString.call(arr) == '[object Array]';
    };
    
  provide("isarray", module.exports);
}(global));

// pakmanager:inherits
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = require('util').inherits
    
  provide("inherits", module.exports);
}(global));

// pakmanager:qs
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = require('./lib/');
    
  provide("qs", module.exports);
}(global));

// pakmanager:formidable/file
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  if (global.GENTLY) require = GENTLY.hijack(require);
    
    var util = require('util'),
        WriteStream = require('fs').WriteStream,
        EventEmitter = require('events').EventEmitter,
        crypto = require('crypto');
    
    function File(properties) {
      EventEmitter.call(this);
    
      this.size = 0;
      this.path = null;
      this.name = null;
      this.type = null;
      this.hash = null;
      this.lastModifiedDate = null;
    
      this._writeStream = null;
      
      for (var key in properties) {
        this[key] = properties[key];
      }
    
      if(typeof this.hash === 'string') {
        this.hash = crypto.createHash(properties.hash);
      } else {
        this.hash = null;
      }
    }
    module.exports = File;
    util.inherits(File, EventEmitter);
    
    File.prototype.open = function() {
      this._writeStream = new WriteStream(this.path);
    };
    
    File.prototype.toJSON = function() {
      return {
        size: this.size,
        path: this.path,
        name: this.name,
        type: this.type,
        mtime: this.lastModifiedDate,
        length: this.length,
        filename: this.filename,
        mime: this.mime
      };
    };
    
    File.prototype.write = function(buffer, cb) {
      var self = this;
      if (self.hash) {
        self.hash.update(buffer);
      }
      this._writeStream.write(buffer, function() {
        self.lastModifiedDate = new Date();
        self.size += buffer.length;
        self.emit('progress', self.size);
        cb();
      });
    };
    
    File.prototype.end = function(cb) {
      var self = this;
      if (self.hash) {
        self.hash = self.hash.digest('hex');
      }
      this._writeStream.end(function() {
        self.emit('end');
        cb();
      });
    };
    
  provide("formidable/file", module.exports);
}(global));

// pakmanager:formidable/multipart_parser
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var Buffer = require('buffer').Buffer,
        s = 0,
        S =
        { PARSER_UNINITIALIZED: s++,
          START: s++,
          START_BOUNDARY: s++,
          HEADER_FIELD_START: s++,
          HEADER_FIELD: s++,
          HEADER_VALUE_START: s++,
          HEADER_VALUE: s++,
          HEADER_VALUE_ALMOST_DONE: s++,
          HEADERS_ALMOST_DONE: s++,
          PART_DATA_START: s++,
          PART_DATA: s++,
          PART_END: s++,
          END: s++
        },
    
        f = 1,
        F =
        { PART_BOUNDARY: f,
          LAST_BOUNDARY: f *= 2
        },
    
        LF = 10,
        CR = 13,
        SPACE = 32,
        HYPHEN = 45,
        COLON = 58,
        A = 97,
        Z = 122,
    
        lower = function(c) {
          return c | 0x20;
        };
    
    for (s in S) {
      exports[s] = S[s];
    }
    
    function MultipartParser() {
      this.boundary = null;
      this.boundaryChars = null;
      this.lookbehind = null;
      this.state = S.PARSER_UNINITIALIZED;
    
      this.index = null;
      this.flags = 0;
    }
    exports.MultipartParser = MultipartParser;
    
    MultipartParser.stateToString = function(stateNumber) {
      for (var state in S) {
        var number = S[state];
        if (number === stateNumber) return state;
      }
    };
    
    MultipartParser.prototype.initWithBoundary = function(str) {
      this.boundary = new Buffer(str.length+4);
      this.boundary.write('\r\n--', 0);
      this.boundary.write(str, 4);
      this.lookbehind = new Buffer(this.boundary.length+8);
      this.state = S.START;
    
      this.boundaryChars = {};
      for (var i = 0; i < this.boundary.length; i++) {
        this.boundaryChars[this.boundary[i]] = true;
      }
    };
    
    MultipartParser.prototype.write = function(buffer) {
      var self = this,
          i = 0,
          len = buffer.length,
          prevIndex = this.index,
          index = this.index,
          state = this.state,
          flags = this.flags,
          lookbehind = this.lookbehind,
          boundary = this.boundary,
          boundaryChars = this.boundaryChars,
          boundaryLength = this.boundary.length,
          boundaryEnd = boundaryLength - 1,
          bufferLength = buffer.length,
          c,
          cl,
    
          mark = function(name) {
            self[name+'Mark'] = i;
          },
          clear = function(name) {
            delete self[name+'Mark'];
          },
          callback = function(name, buffer, start, end) {
            if (start !== undefined && start === end) {
              return;
            }
    
            var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
            if (callbackSymbol in self) {
              self[callbackSymbol](buffer, start, end);
            }
          },
          dataCallback = function(name, clear) {
            var markSymbol = name+'Mark';
            if (!(markSymbol in self)) {
              return;
            }
    
            if (!clear) {
              callback(name, buffer, self[markSymbol], buffer.length);
              self[markSymbol] = 0;
            } else {
              callback(name, buffer, self[markSymbol], i);
              delete self[markSymbol];
            }
          };
    
      for (i = 0; i < len; i++) {
        c = buffer[i];
        switch (state) {
          case S.PARSER_UNINITIALIZED:
            return i;
          case S.START:
            index = 0;
            state = S.START_BOUNDARY;
          case S.START_BOUNDARY:
            if (index == boundary.length - 2) {
              if (c == HYPHEN) {
                flags |= F.LAST_BOUNDARY;
              } else if (c != CR) {
                return i;
              }
              index++;
              break;
            } else if (index - 1 == boundary.length - 2) {
              if (flags & F.LAST_BOUNDARY && c == HYPHEN){
                callback('end');
                state = S.END;
                flags = 0;
              } else if (!(flags & F.LAST_BOUNDARY) && c == LF) {
                index = 0;
                callback('partBegin');
                state = S.HEADER_FIELD_START;
              } else {
                return i;
              }
              break;
            }
    
            if (c != boundary[index+2]) {
              index = -2;
            }
            if (c == boundary[index+2]) {
              index++;
            }
            break;
          case S.HEADER_FIELD_START:
            state = S.HEADER_FIELD;
            mark('headerField');
            index = 0;
          case S.HEADER_FIELD:
            if (c == CR) {
              clear('headerField');
              state = S.HEADERS_ALMOST_DONE;
              break;
            }
    
            index++;
            if (c == HYPHEN) {
              break;
            }
    
            if (c == COLON) {
              if (index == 1) {
                // empty header field
                return i;
              }
              dataCallback('headerField', true);
              state = S.HEADER_VALUE_START;
              break;
            }
    
            cl = lower(c);
            if (cl < A || cl > Z) {
              return i;
            }
            break;
          case S.HEADER_VALUE_START:
            if (c == SPACE) {
              break;
            }
    
            mark('headerValue');
            state = S.HEADER_VALUE;
          case S.HEADER_VALUE:
            if (c == CR) {
              dataCallback('headerValue', true);
              callback('headerEnd');
              state = S.HEADER_VALUE_ALMOST_DONE;
            }
            break;
          case S.HEADER_VALUE_ALMOST_DONE:
            if (c != LF) {
              return i;
            }
            state = S.HEADER_FIELD_START;
            break;
          case S.HEADERS_ALMOST_DONE:
            if (c != LF) {
              return i;
            }
    
            callback('headersEnd');
            state = S.PART_DATA_START;
            break;
          case S.PART_DATA_START:
            state = S.PART_DATA;
            mark('partData');
          case S.PART_DATA:
            prevIndex = index;
    
            if (index === 0) {
              // boyer-moore derrived algorithm to safely skip non-boundary data
              i += boundaryEnd;
              while (i < bufferLength && !(buffer[i] in boundaryChars)) {
                i += boundaryLength;
              }
              i -= boundaryEnd;
              c = buffer[i];
            }
    
            if (index < boundary.length) {
              if (boundary[index] == c) {
                if (index === 0) {
                  dataCallback('partData', true);
                }
                index++;
              } else {
                index = 0;
              }
            } else if (index == boundary.length) {
              index++;
              if (c == CR) {
                // CR = part boundary
                flags |= F.PART_BOUNDARY;
              } else if (c == HYPHEN) {
                // HYPHEN = end boundary
                flags |= F.LAST_BOUNDARY;
              } else {
                index = 0;
              }
            } else if (index - 1 == boundary.length)  {
              if (flags & F.PART_BOUNDARY) {
                index = 0;
                if (c == LF) {
                  // unset the PART_BOUNDARY flag
                  flags &= ~F.PART_BOUNDARY;
                  callback('partEnd');
                  callback('partBegin');
                  state = S.HEADER_FIELD_START;
                  break;
                }
              } else if (flags & F.LAST_BOUNDARY) {
                if (c == HYPHEN) {
                  callback('partEnd');
                  callback('end');
                  state = S.END;
                  flags = 0;
                } else {
                  index = 0;
                }
              } else {
                index = 0;
              }
            }
    
            if (index > 0) {
              // when matching a possible boundary, keep a lookbehind reference
              // in case it turns out to be a false lead
              lookbehind[index-1] = c;
            } else if (prevIndex > 0) {
              // if our boundary turned out to be rubbish, the captured lookbehind
              // belongs to partData
              callback('partData', lookbehind, 0, prevIndex);
              prevIndex = 0;
              mark('partData');
    
              // reconsider the current character even so it interrupted the sequence
              // it could be the beginning of a new sequence
              i--;
            }
    
            break;
          case S.END:
            break;
          default:
            return i;
        }
      }
    
      dataCallback('headerField');
      dataCallback('headerValue');
      dataCallback('partData');
    
      this.index = index;
      this.state = state;
      this.flags = flags;
    
      return len;
    };
    
    MultipartParser.prototype.end = function() {
      var callback = function(self, name) {
        var callbackSymbol = 'on'+name.substr(0, 1).toUpperCase()+name.substr(1);
        if (callbackSymbol in self) {
          self[callbackSymbol]();
        }
      };
      if ((this.state == S.HEADER_FIELD_START && this.index === 0) ||
          (this.state == S.PART_DATA && this.index == this.boundary.length)) {
        callback(this, 'partEnd');
        callback(this, 'end');
      } else if (this.state != S.END) {
        return new Error('MultipartParser.end(): stream ended unexpectedly: ' + this.explain());
      }
    };
    
    MultipartParser.prototype.explain = function() {
      return 'state = ' + MultipartParser.stateToString(this.state);
    };
    
  provide("formidable/multipart_parser", module.exports);
}(global));

// pakmanager:formidable/querystring_parser
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  if (global.GENTLY) require = GENTLY.hijack(require);
    
    // This is a buffering parser, not quite as nice as the multipart one.
    // If I find time I'll rewrite this to be fully streaming as well
    var querystring = require('querystring');
    
    function QuerystringParser(maxKeys) {
      this.maxKeys = maxKeys;
      this.buffer = '';
    }
    exports.QuerystringParser = QuerystringParser;
    
    QuerystringParser.prototype.write = function(buffer) {
      this.buffer += buffer.toString('ascii');
      return buffer.length;
    };
    
    QuerystringParser.prototype.end = function() {
      var fields = querystring.parse(this.buffer, '&', '=', { maxKeys: this.maxKeys });
      for (var field in fields) {
        this.onField(field, fields[field]);
      }
      this.buffer = '';
    
      this.onEnd();
    };
    
    
  provide("formidable/querystring_parser", module.exports);
}(global));

// pakmanager:formidable/octet_parser
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var EventEmitter = require('events').EventEmitter
    	, util = require('util');
    
    function OctetParser(options){
    	if(!(this instanceof OctetParser)) return new OctetParser(options);
    	EventEmitter.call(this);
    }
    
    util.inherits(OctetParser, EventEmitter);
    
    exports.OctetParser = OctetParser;
    
    OctetParser.prototype.write = function(buffer) {
        this.emit('data', buffer);
    	return buffer.length;
    };
    
    OctetParser.prototype.end = function() {
    	this.emit('end');
    };
    
  provide("formidable/octet_parser", module.exports);
}(global));

// pakmanager:formidable/json_parser
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  if (global.GENTLY) require = GENTLY.hijack(require);
    
    var Buffer = require('buffer').Buffer;
    
    function JSONParser() {
      this.data = new Buffer('');
      this.bytesWritten = 0;
    }
    exports.JSONParser = JSONParser;
    
    JSONParser.prototype.initWithLength = function(length) {
      this.data = new Buffer(length);
    };
    
    JSONParser.prototype.write = function(buffer) {
      if (this.data.length >= this.bytesWritten + buffer.length) {
        buffer.copy(this.data, this.bytesWritten);
      } else {
        this.data = Buffer.concat([this.data, buffer]);
      }
      this.bytesWritten += buffer.length;
      return buffer.length;
    };
    
    JSONParser.prototype.end = function() {
      try {
        var fields = JSON.parse(this.data.toString('utf8'));
        for (var field in fields) {
          this.onField(field, fields[field]);
        }
      } catch (e) {}
      this.data = null;
    
      this.onEnd();
    };
    
  provide("formidable/json_parser", module.exports);
}(global));

// pakmanager:formidable/incoming_form
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  if (global.GENTLY) require = GENTLY.hijack(require);
    
    var crypto = require('crypto');
    var fs = require('fs');
    var util = require('util'),
        path = require('path'),
        File =  require('formidable/file'),
        MultipartParser =  require('formidable/multipart_parser').MultipartParser,
        QuerystringParser =  require('formidable/querystring_parser').QuerystringParser,
        OctetParser       =  require('formidable/octet_parser').OctetParser,
        JSONParser =  require('formidable/json_parser').JSONParser,
        StringDecoder = require('string_decoder').StringDecoder,
        EventEmitter = require('events').EventEmitter,
        Stream = require('stream').Stream,
        os = require('os');
    
    function IncomingForm(opts) {
      if (!(this instanceof IncomingForm)) return new IncomingForm(opts);
      EventEmitter.call(this);
    
      opts=opts||{};
    
      this.error = null;
      this.ended = false;
    
      this.maxFields = opts.maxFields || 1000;
      this.maxFieldsSize = opts.maxFieldsSize || 2 * 1024 * 1024;
      this.keepExtensions = opts.keepExtensions || false;
      this.uploadDir = opts.uploadDir || os.tmpDir();
      this.encoding = opts.encoding || 'utf-8';
      this.headers = null;
      this.type = null;
      this.hash = opts.hash || false;
      this.multiples = opts.multiples || false;
    
      this.bytesReceived = null;
      this.bytesExpected = null;
    
      this._parser = null;
      this._flushing = 0;
      this._fieldsSize = 0;
      this.openedFiles = [];
    
      return this;
    }
    util.inherits(IncomingForm, EventEmitter);
    exports.IncomingForm = IncomingForm;
    
    IncomingForm.prototype.parse = function(req, cb) {
      this.pause = function() {
        try {
          req.pause();
        } catch (err) {
          // the stream was destroyed
          if (!this.ended) {
            // before it was completed, crash & burn
            this._error(err);
          }
          return false;
        }
        return true;
      };
    
      this.resume = function() {
        try {
          req.resume();
        } catch (err) {
          // the stream was destroyed
          if (!this.ended) {
            // before it was completed, crash & burn
            this._error(err);
          }
          return false;
        }
    
        return true;
      };
    
      // Setup callback first, so we don't miss anything from data events emitted
      // immediately.
      if (cb) {
        var fields = {}, files = {};
        this
          .on('field', function(name, value) {
            fields[name] = value;
          })
          .on('file', function(name, file) {
            if (this.multiples) {
              if (files[name]) {
                if (!Array.isArray(files[name])) {
                  files[name] = [files[name]];
                }
                files[name].push(file);
              } else {
                files[name] = file;
              }
            } else {
              files[name] = file;
            }
          })
          .on('error', function(err) {
            cb(err, fields, files);
          })
          .on('end', function() {
            cb(null, fields, files);
          });
      }
    
      // Parse headers and setup the parser, ready to start listening for data.
      this.writeHeaders(req.headers);
    
      // Start listening for data.
      var self = this;
      req
        .on('error', function(err) {
          self._error(err);
        })
        .on('aborted', function() {
          self.emit('aborted');
          self._error(new Error('Request aborted'));
        })
        .on('data', function(buffer) {
          self.write(buffer);
        })
        .on('end', function() {
          if (self.error) {
            return;
          }
    
          var err = self._parser.end();
          if (err) {
            self._error(err);
          }
        });
    
      return this;
    };
    
    IncomingForm.prototype.writeHeaders = function(headers) {
      this.headers = headers;
      this._parseContentLength();
      this._parseContentType();
    };
    
    IncomingForm.prototype.write = function(buffer) {
      if (this.error) {
        return;
      }
      if (!this._parser) {
        this._error(new Error('uninitialized parser'));
        return;
      }
    
      this.bytesReceived += buffer.length;
      this.emit('progress', this.bytesReceived, this.bytesExpected);
    
      var bytesParsed = this._parser.write(buffer);
      if (bytesParsed !== buffer.length) {
        this._error(new Error('parser error, '+bytesParsed+' of '+buffer.length+' bytes parsed'));
      }
    
      return bytesParsed;
    };
    
    IncomingForm.prototype.pause = function() {
      // this does nothing, unless overwritten in IncomingForm.parse
      return false;
    };
    
    IncomingForm.prototype.resume = function() {
      // this does nothing, unless overwritten in IncomingForm.parse
      return false;
    };
    
    IncomingForm.prototype.onPart = function(part) {
      // this method can be overwritten by the user
      this.handlePart(part);
    };
    
    IncomingForm.prototype.handlePart = function(part) {
      var self = this;
    
      if (part.filename === undefined) {
        var value = ''
          , decoder = new StringDecoder(this.encoding);
    
        part.on('data', function(buffer) {
          self._fieldsSize += buffer.length;
          if (self._fieldsSize > self.maxFieldsSize) {
            self._error(new Error('maxFieldsSize exceeded, received '+self._fieldsSize+' bytes of field data'));
            return;
          }
          value += decoder.write(buffer);
        });
    
        part.on('end', function() {
          self.emit('field', part.name, value);
        });
        return;
      }
    
      this._flushing++;
    
      var file = new File({
        path: this._uploadPath(part.filename),
        name: part.filename,
        type: part.mime,
        hash: self.hash
      });
    
      this.emit('fileBegin', part.name, file);
    
      file.open();
      this.openedFiles.push(file);
    
      part.on('data', function(buffer) {
        if (buffer.length == 0) {
          return;
        }
        self.pause();
        file.write(buffer, function() {
          self.resume();
        });
      });
    
      part.on('end', function() {
        file.end(function() {
          self._flushing--;
          self.emit('file', part.name, file);
          self._maybeEnd();
        });
      });
    };
    
    function dummyParser(self) {
      return {
        end: function () {
          self.ended = true;
          self._maybeEnd();
          return null;
        }
      };
    }
    
    IncomingForm.prototype._parseContentType = function() {
      if (this.bytesExpected === 0) {
        this._parser = dummyParser(this);
        return;
      }
    
      if (!this.headers['content-type']) {
        this._error(new Error('bad content-type header, no content-type'));
        return;
      }
    
      if (this.headers['content-type'].match(/octet-stream/i)) {
        this._initOctetStream();
        return;
      }
    
      if (this.headers['content-type'].match(/urlencoded/i)) {
        this._initUrlencoded();
        return;
      }
    
      if (this.headers['content-type'].match(/multipart/i)) {
        var m = this.headers['content-type'].match(/boundary=(?:"([^"]+)"|([^;]+))/i);
        if (m) {
          this._initMultipart(m[1] || m[2]);
        } else {
          this._error(new Error('bad content-type header, no multipart boundary'));
        }
        return;
      }
    
      if (this.headers['content-type'].match(/json/i)) {
        this._initJSONencoded();
        return;
      }
    
      this._error(new Error('bad content-type header, unknown content-type: '+this.headers['content-type']));
    };
    
    IncomingForm.prototype._error = function(err) {
      if (this.error || this.ended) {
        return;
      }
    
      this.error = err;
      this.emit('error', err);
    
      if (Array.isArray(this.openedFiles)) {
        this.openedFiles.forEach(function(file) {
          file._writeStream.destroy();
          setTimeout(fs.unlink, 0, file.path, function(error) { });
        });
      }
    };
    
    IncomingForm.prototype._parseContentLength = function() {
      this.bytesReceived = 0;
      if (this.headers['content-length']) {
        this.bytesExpected = parseInt(this.headers['content-length'], 10);
      } else if (this.headers['transfer-encoding'] === undefined) {
        this.bytesExpected = 0;
      }
    
      if (this.bytesExpected !== null) {
        this.emit('progress', this.bytesReceived, this.bytesExpected);
      }
    };
    
    IncomingForm.prototype._newParser = function() {
      return new MultipartParser();
    };
    
    IncomingForm.prototype._initMultipart = function(boundary) {
      this.type = 'multipart';
    
      var parser = new MultipartParser(),
          self = this,
          headerField,
          headerValue,
          part;
    
      parser.initWithBoundary(boundary);
    
      parser.onPartBegin = function() {
        part = new Stream();
        part.readable = true;
        part.headers = {};
        part.name = null;
        part.filename = null;
        part.mime = null;
    
        part.transferEncoding = 'binary';
        part.transferBuffer = '';
    
        headerField = '';
        headerValue = '';
      };
    
      parser.onHeaderField = function(b, start, end) {
        headerField += b.toString(self.encoding, start, end);
      };
    
      parser.onHeaderValue = function(b, start, end) {
        headerValue += b.toString(self.encoding, start, end);
      };
    
      parser.onHeaderEnd = function() {
        headerField = headerField.toLowerCase();
        part.headers[headerField] = headerValue;
    
        var m = headerValue.match(/\bname="([^"]+)"/i);
        if (headerField == 'content-disposition') {
          if (m) {
            part.name = m[1];
          }
    
          part.filename = self._fileName(headerValue);
        } else if (headerField == 'content-type') {
          part.mime = headerValue;
        } else if (headerField == 'content-transfer-encoding') {
          part.transferEncoding = headerValue.toLowerCase();
        }
    
        headerField = '';
        headerValue = '';
      };
    
      parser.onHeadersEnd = function() {
        switch(part.transferEncoding){
          case 'binary':
          case '7bit':
          case '8bit':
          parser.onPartData = function(b, start, end) {
            part.emit('data', b.slice(start, end));
          };
    
          parser.onPartEnd = function() {
            part.emit('end');
          };
          break;
    
          case 'base64':
          parser.onPartData = function(b, start, end) {
            part.transferBuffer += b.slice(start, end).toString('ascii');
    
            /*
            four bytes (chars) in base64 converts to three bytes in binary
            encoding. So we should always work with a number of bytes that
            can be divided by 4, it will result in a number of buytes that
            can be divided vy 3.
            */
            var offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
            part.emit('data', new Buffer(part.transferBuffer.substring(0, offset), 'base64'));
            part.transferBuffer = part.transferBuffer.substring(offset);
          };
    
          parser.onPartEnd = function() {
            part.emit('data', new Buffer(part.transferBuffer, 'base64'));
            part.emit('end');
          };
          break;
    
          default:
          return self._error(new Error('unknown transfer-encoding'));
        }
    
        self.onPart(part);
      };
    
    
      parser.onEnd = function() {
        self.ended = true;
        self._maybeEnd();
      };
    
      this._parser = parser;
    };
    
    IncomingForm.prototype._fileName = function(headerValue) {
      var m = headerValue.match(/\bfilename="(.*?)"($|; )/i);
      if (!m) return;
    
      var filename = m[1].substr(m[1].lastIndexOf('\\') + 1);
      filename = filename.replace(/%22/g, '"');
      filename = filename.replace(/&#([\d]{4});/g, function(m, code) {
        return String.fromCharCode(code);
      });
      return filename;
    };
    
    IncomingForm.prototype._initUrlencoded = function() {
      this.type = 'urlencoded';
    
      var parser = new QuerystringParser(this.maxFields)
        , self = this;
    
      parser.onField = function(key, val) {
        self.emit('field', key, val);
      };
    
      parser.onEnd = function() {
        self.ended = true;
        self._maybeEnd();
      };
    
      this._parser = parser;
    };
    
    IncomingForm.prototype._initOctetStream = function() {
      this.type = 'octet-stream';
      var filename = this.headers['x-file-name'];
      var mime = this.headers['content-type'];
    
      var file = new File({
        path: this._uploadPath(filename),
        name: filename,
        type: mime
      });
    
      this.emit('fileBegin', filename, file);
      file.open();
    
      this._flushing++;
    
      var self = this;
    
      self._parser = new OctetParser();
    
      //Keep track of writes that haven't finished so we don't emit the file before it's done being written
      var outstandingWrites = 0;
    
      self._parser.on('data', function(buffer){
        self.pause();
        outstandingWrites++;
    
        file.write(buffer, function() {
          outstandingWrites--;
          self.resume();
    
          if(self.ended){
            self._parser.emit('doneWritingFile');
          }
        });
      });
    
      self._parser.on('end', function(){
        self._flushing--;
        self.ended = true;
    
        var done = function(){
          file.end(function() {
            self.emit('file', 'file', file);
            self._maybeEnd();
          });
        };
    
        if(outstandingWrites === 0){
          done();
        } else {
          self._parser.once('doneWritingFile', done);
        }
      });
    };
    
    IncomingForm.prototype._initJSONencoded = function() {
      this.type = 'json';
    
      var parser = new JSONParser()
        , self = this;
    
      if (this.bytesExpected) {
        parser.initWithLength(this.bytesExpected);
      }
    
      parser.onField = function(key, val) {
        self.emit('field', key, val);
      };
    
      parser.onEnd = function() {
        self.ended = true;
        self._maybeEnd();
      };
    
      this._parser = parser;
    };
    
    IncomingForm.prototype._uploadPath = function(filename) {
      var name = 'upload_';
      var buf = crypto.randomBytes(16);
      for (var i = 0; i < buf.length; ++i) {
        name += ('0' + buf[i].toString(16)).slice(-2);
      }
    
      if (this.keepExtensions) {
        var ext = path.extname(filename);
        ext     = ext.replace(/(\.[a-z0-9]+).*/i, '$1');
    
        name += ext;
      }
    
      return path.join(this.uploadDir, name);
    };
    
    IncomingForm.prototype._maybeEnd = function() {
      if (!this.ended || this._flushing || this.error) {
        return;
      }
    
      this.emit('end');
    };
    
    
  provide("formidable/incoming_form", module.exports);
}(global));

// pakmanager:formidable
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var IncomingForm =  require('formidable/incoming_form').IncomingForm;
    IncomingForm.IncomingForm = IncomingForm;
    module.exports = IncomingForm;
    
  provide("formidable", module.exports);
}(global));

// pakmanager:mime
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var path = require('path');
    var fs = require('fs');
    
    function Mime() {
      // Map of extension -> mime type
      this.types = Object.create(null);
    
      // Map of mime type -> extension
      this.extensions = Object.create(null);
    }
    
    /**
     * Define mimetype -> extension mappings.  Each key is a mime-type that maps
     * to an array of extensions associated with the type.  The first extension is
     * used as the default extension for the type.
     *
     * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
     *
     * @param map (Object) type definitions
     */
    Mime.prototype.define = function (map) {
      for (var type in map) {
        var exts = map[type];
        for (var i = 0; i < exts.length; i++) {
          if (process.env.DEBUG_MIME && this.types[exts]) {
            console.warn(this._loading.replace(/.*\//, ''), 'changes "' + exts[i] + '" extension type from ' +
              this.types[exts] + ' to ' + type);
          }
    
          this.types[exts[i]] = type;
        }
    
        // Default extension is the first one we encounter
        if (!this.extensions[type]) {
          this.extensions[type] = exts[0];
        }
      }
    };
    
    /**
     * Load an Apache2-style ".types" file
     *
     * This may be called multiple times (it's expected).  Where files declare
     * overlapping types/extensions, the last file wins.
     *
     * @param file (String) path of file to load.
     */
    Mime.prototype.load = function(file) {
      this._loading = file;
      // Read file and split into lines
      var map = {},
          content = fs.readFileSync(file, 'ascii'),
          lines = content.split(/[\r\n]+/);
    
      lines.forEach(function(line) {
        // Clean up whitespace/comments, and split into fields
        var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
        map[fields.shift()] = fields;
      });
    
      this.define(map);
    
      this._loading = null;
    };
    
    /**
     * Lookup a mime type based on extension
     */
    Mime.prototype.lookup = function(path, fallback) {
      var ext = path.replace(/.*[\.\/\\]/, '').toLowerCase();
    
      return this.types[ext] || fallback || this.default_type;
    };
    
    /**
     * Return file extension associated with a mime type
     */
    Mime.prototype.extension = function(mimeType) {
      var type = mimeType.match(/^\s*([^;\s]*)(?:;|\s|$)/)[1].toLowerCase();
      return this.extensions[type];
    };
    
    // Default instance
    var mime = new Mime();
    
    // Define built-in types
    mime.define(require('./types.json'));
    
    // Default type
    mime.default_type = mime.lookup('bin');
    
    //
    // Additional API specific to the default instance
    //
    
    mime.Mime = Mime;
    
    /**
     * Lookup a charset based on mime type.
     */
    mime.charsets = {
      lookup: function(mimeType, fallback) {
        // Assume text types are utf8
        return (/^text\//).test(mimeType) ? 'UTF-8' : fallback;
      }
    };
    
    module.exports = mime;
    
  provide("mime", module.exports);
}(global));

// pakmanager:component-emitter
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Expose `Emitter`.
     */
    
    module.exports = Emitter;
    
    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */
    
    function Emitter(obj) {
      if (obj) return mixin(obj);
    };
    
    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */
    
    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }
    
    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
      (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
      return this;
    };
    
    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.once = function(event, fn){
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }
    
      on.fn = fn;
      this.on(event, on);
      return this;
    };
    
    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
      this._callbacks = this._callbacks || {};
    
      // all
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }
    
      // specific event
      var callbacks = this._callbacks['$' + event];
      if (!callbacks) return this;
    
      // remove all handlers
      if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
      }
    
      // remove specific handler
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return this;
    };
    
    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */
    
    Emitter.prototype.emit = function(event){
      this._callbacks = this._callbacks || {};
      var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];
    
      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }
    
      return this;
    };
    
    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */
    
    Emitter.prototype.listeners = function(event){
      this._callbacks = this._callbacks || {};
      return this._callbacks['$' + event] || [];
    };
    
    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */
    
    Emitter.prototype.hasListeners = function(event){
      return !! this.listeners(event).length;
    };
    
  provide("component-emitter", module.exports);
}(global));

// pakmanager:methods
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    var http = require('http');
    
    /* istanbul ignore next: implementation differs on version */
    if (http.METHODS) {
    
      module.exports = http.METHODS.map(function(method){
        return method.toLowerCase();
      });
    
    } else {
    
      module.exports = [
        'get',
        'post',
        'put',
        'head',
        'delete',
        'options',
        'trace',
        'copy',
        'lock',
        'mkcol',
        'move',
        'purge',
        'propfind',
        'proppatch',
        'unlock',
        'report',
        'mkactivity',
        'checkout',
        'merge',
        'm-search',
        'notify',
        'subscribe',
        'unsubscribe',
        'patch',
        'search',
        'connect'
      ];
    
    }
    
  provide("methods", module.exports);
}(global));

// pakmanager:cookiejar
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /* jshint node: true */
    (function () {
        "use strict";
    
        function CookieAccessInfo(domain, path, secure, script) {
            if (this instanceof CookieAccessInfo) {
                this.domain = domain || undefined;
                this.path = path || "/";
                this.secure = !!secure;
                this.script = !!script;
                return this;
            }
            return new CookieAccessInfo(domain, path, secure, script);
        }
        exports.CookieAccessInfo = CookieAccessInfo;
    
        function Cookie(cookiestr, request_domain, request_path) {
            if (cookiestr instanceof Cookie) {
                return cookiestr;
            }
            if (this instanceof Cookie) {
                this.name = null;
                this.value = null;
                this.expiration_date = Infinity;
                this.path = String(request_path || "/");
                this.explicit_path = false;
                this.domain = request_domain || null;
                this.explicit_domain = false;
                this.secure = false; //how to define default?
                this.noscript = false; //httponly
                if (cookiestr) {
                    this.parse(cookiestr, request_domain, request_path);
                }
                return this;
            }
            return new Cookie(cookiestr);
        }
        exports.Cookie = Cookie;
    
        Cookie.prototype.toString = function toString() {
            var str = [this.name + "=" + this.value];
            if (this.expiration_date !== Infinity) {
                str.push("expires=" + (new Date(this.expiration_date)).toGMTString());
            }
            if (this.domain) {
                str.push("domain=" + this.domain);
            }
            if (this.path) {
                str.push("path=" + this.path);
            }
            if (this.secure) {
                str.push("secure");
            }
            if (this.noscript) {
                str.push("httponly");
            }
            return str.join("; ");
        };
    
        Cookie.prototype.toValueString = function toValueString() {
            return this.name + "=" + this.value;
        };
    
        var cookie_str_splitter = /[:](?=\s*[a-zA-Z0-9_\-]+\s*[=])/g;
        Cookie.prototype.parse = function parse(str, request_domain, request_path) {
            if (this instanceof Cookie) {
                var parts = str.split(";").filter(function (value) {
                        return !!value;
                    }),
                    pair = parts[0].match(/([^=]+)=([\s\S]*)/),
                    key = pair[1],
                    value = pair[2],
                    i;
                this.name = key;
                this.value = value;
    
                for (i = 1; i < parts.length; i += 1) {
                    pair = parts[i].match(/([^=]+)(?:=([\s\S]*))?/);
                    key = pair[1].trim().toLowerCase();
                    value = pair[2];
                    switch (key) {
                    case "httponly":
                        this.noscript = true;
                        break;
                    case "expires":
                        this.expiration_date = value ?
                                Number(Date.parse(value)) :
                                Infinity;
                        break;
                    case "path":
                        this.path = value ?
                                value.trim() :
                                "";
                        this.explicit_path = true;
                        break;
                    case "domain":
                        this.domain = value ?
                                value.trim() :
                                "";
                        this.explicit_domain = !!this.domain;
                        break;
                    case "secure":
                        this.secure = true;
                        break;
                    }
                }
    
                if (!this.explicit_path) {
                   this.path = request_path || "/";
                }
                if (!this.explicit_domain) {
                   this.domain = request_domain;
                }
    
                return this;
            }
            return new Cookie().parse(str, request_domain, request_path);
        };
    
        Cookie.prototype.matches = function matches(access_info) {
            if (this.noscript && access_info.script ||
                    this.secure && !access_info.secure ||
                    !this.collidesWith(access_info)) {
                return false;
            }
            return true;
        };
    
        Cookie.prototype.collidesWith = function collidesWith(access_info) {
            if ((this.path && !access_info.path) || (this.domain && !access_info.domain)) {
                return false;
            }
            if (this.path && access_info.path.indexOf(this.path) !== 0) {
                return false;
            }
            if (!this.explicit_path) {
               if (this.path !== access_info.path) {
                   return false;
               }
            }
            var access_domain = access_info.domain && access_info.domain.replace(/^[\.]/,'');
            var cookie_domain = this.domain && this.domain.replace(/^[\.]/,'');
            if (cookie_domain === access_domain) {
                return true;
            }
            if (cookie_domain) {
                if (!this.explicit_domain) {
                    return false; // we already checked if the domains were exactly the same
                }
                var wildcard = access_domain.indexOf(cookie_domain);
                if (wildcard === -1 || wildcard !== access_domain.length - cookie_domain.length) {
                    return false;
                }
                return true;
            }
            return true;
        };
    
        function CookieJar() {
            var cookies, cookies_list, collidable_cookie;
            if (this instanceof CookieJar) {
                cookies = Object.create(null); //name: [Cookie]
    
                this.setCookie = function setCookie(cookie, request_domain, request_path) {
                    var remove, i;
                    cookie = new Cookie(cookie, request_domain, request_path);
                    //Delete the cookie if the set is past the current time
                    remove = cookie.expiration_date <= Date.now();
                    if (cookies[cookie.name] !== undefined) {
                        cookies_list = cookies[cookie.name];
                        for (i = 0; i < cookies_list.length; i += 1) {
                            collidable_cookie = cookies_list[i];
                            if (collidable_cookie.collidesWith(cookie)) {
                                if (remove) {
                                    cookies_list.splice(i, 1);
                                    if (cookies_list.length === 0) {
                                        delete cookies[cookie.name];
                                    }
                                    return false;
                                }
                                cookies_list[i] = cookie;
                                return cookie;
                            }
                        }
                        if (remove) {
                            return false;
                        }
                        cookies_list.push(cookie);
                        return cookie;
                    }
                    if (remove) {
                        return false;
                    }
                    cookies[cookie.name] = [cookie];
                    return cookies[cookie.name];
                };
                //returns a cookie
                this.getCookie = function getCookie(cookie_name, access_info) {
                    var cookie, i;
                    cookies_list = cookies[cookie_name];
                    if (!cookies_list) {
                        return;
                    }
                    for (i = 0; i < cookies_list.length; i += 1) {
                        cookie = cookies_list[i];
                        if (cookie.expiration_date <= Date.now()) {
                            if (cookies_list.length === 0) {
                                delete cookies[cookie.name];
                            }
                            continue;
                        }
                        if (cookie.matches(access_info)) {
                            return cookie;
                        }
                    }
                };
                //returns a list of cookies
                this.getCookies = function getCookies(access_info) {
                    var matches = [], cookie_name, cookie;
                    for (cookie_name in cookies) {
                        cookie = this.getCookie(cookie_name, access_info);
                        if (cookie) {
                            matches.push(cookie);
                        }
                    }
                    matches.toString = function toString() {
                        return matches.join(":");
                    };
                    matches.toValueString = function toValueString() {
                        return matches.map(function (c) {
                            return c.toValueString();
                        }).join(';');
                    };
                    return matches;
                };
    
                return this;
            }
            return new CookieJar();
        }
        exports.CookieJar = CookieJar;
    
        //returns list of cookies that were set correctly. Cookies that are expired and removed are not returned.
        CookieJar.prototype.setCookies = function setCookies(cookies, request_domain, request_path) {
            cookies = Array.isArray(cookies) ?
                    cookies :
                    cookies.split(cookie_str_splitter);
            var successful = [],
                i,
                cookie;
            cookies = cookies.map(Cookie);
            for (i = 0; i < cookies.length; i += 1) {
                cookie = cookies[i];
                if (this.setCookie(cookie, request_domain, request_path)) {
                    successful.push(cookie);
                }
            }
            return successful;
        };
    }());
    
  provide("cookiejar", module.exports);
}(global));

// pakmanager:debug
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var tty = require('tty');
    var util = require('util');
    
    /**
     * This is the Node.js implementation of `debug()`.
     *
     * Expose `debug()` as the module.
     */
    
    exports = module.exports =   require('debug');
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    
    /**
     * Colors.
     */
    
    exports.colors = [6, 2, 3, 4, 5, 1];
    
    /**
     * The file descriptor to write the `debug()` calls to.
     * Set the `DEBUG_FD` env variable to override with another value. i.e.:
     *
     *   $ DEBUG_FD=3 node script.js 3>debug.log
     */
    
    var fd = parseInt(process.env.DEBUG_FD, 10) || 2;
    var stream = 1 === fd ? process.stdout :
                 2 === fd ? process.stderr :
                 createWritableStdioStream(fd);
    
    /**
     * Is stdout a TTY? Colored output is enabled when `true`.
     */
    
    function useColors() {
      var debugColors = (process.env.DEBUG_COLORS || '').trim().toLowerCase();
      if (0 === debugColors.length) {
        return tty.isatty(fd);
      } else {
        return '0' !== debugColors
            && 'no' !== debugColors
            && 'false' !== debugColors
            && 'disabled' !== debugColors;
      }
    }
    
    /**
     * Map %o to `util.inspect()`, since Node doesn't do that out of the box.
     */
    
    var inspect = (4 === util.inspect.length ?
      // node <= 0.8.x
      function (v, colors) {
        return util.inspect(v, void 0, void 0, colors);
      } :
      // node > 0.8.x
      function (v, colors) {
        return util.inspect(v, { colors: colors });
      }
    );
    
    exports.formatters.o = function(v) {
      return inspect(v, this.useColors)
        .replace(/\s*\n\s*/g, ' ');
    };
    
    /**
     * Adds ANSI color escape codes if enabled.
     *
     * @api public
     */
    
    function formatArgs() {
      var args = arguments;
      var useColors = this.useColors;
      var name = this.namespace;
    
      if (useColors) {
        var c = this.color;
    
        args[0] = '  \u001b[3' + c + ';1m' + name + ' '
          + '\u001b[0m'
          + args[0] + '\u001b[3' + c + 'm'
          + ' +' + exports.humanize(this.diff) + '\u001b[0m';
      } else {
        args[0] = new Date().toUTCString()
          + ' ' + name + ' ' + args[0];
      }
      return args;
    }
    
    /**
     * Invokes `console.error()` with the specified arguments.
     */
    
    function log() {
      return stream.write(util.format.apply(this, arguments) + '\n');
    }
    
    /**
     * Save `namespaces`.
     *
     * @param {String} namespaces
     * @api private
     */
    
    function save(namespaces) {
      if (null == namespaces) {
        // If you set a process.env field to null or undefined, it gets cast to the
        // string 'null' or 'undefined'. Just delete instead.
        delete process.env.DEBUG;
      } else {
        process.env.DEBUG = namespaces;
      }
    }
    
    /**
     * Load `namespaces`.
     *
     * @return {String} returns the previously persisted debug modes
     * @api private
     */
    
    function load() {
      return process.env.DEBUG;
    }
    
    /**
     * Copied from `node/src/node.js`.
     *
     * XXX: It's lame that node doesn't expose this API out-of-the-box. It also
     * relies on the undocumented `tty_wrap.guessHandleType()` which is also lame.
     */
    
    function createWritableStdioStream (fd) {
      var stream;
      var tty_wrap = process.binding('tty_wrap');
    
      // Note stream._type is used for test-module-load-list.js
    
      switch (tty_wrap.guessHandleType(fd)) {
        case 'TTY':
          stream = new tty.WriteStream(fd);
          stream._type = 'tty';
    
          // Hack to have stream not keep the event loop alive.
          // See https://github.com/joyent/node/issues/1726
          if (stream._handle && stream._handle.unref) {
            stream._handle.unref();
          }
          break;
    
        case 'FILE':
          var fs = require('fs');
          stream = new fs.SyncWriteStream(fd, { autoClose: false });
          stream._type = 'fs';
          break;
    
        case 'PIPE':
        case 'TCP':
          var net = require('net');
          stream = new net.Socket({
            fd: fd,
            readable: false,
            writable: true
          });
    
          // FIXME Should probably have an option in net.Socket to create a
          // stream from an existing fd which is writable only. But for now
          // we'll just add this hack and set the `readable` member to false.
          // Test: ./node test/fixtures/echo.js < /etc/passwd
          stream.readable = false;
          stream.read = null;
          stream._type = 'pipe';
    
          // FIXME Hack to have stream not keep the event loop alive.
          // See https://github.com/joyent/node/issues/1726
          if (stream._handle && stream._handle.unref) {
            stream._handle.unref();
          }
          break;
    
        default:
          // Probably an error on in uv_guess_handle()
          throw new Error('Implement me. Unknown stream file type!');
      }
    
      // For supporting legacy API we put the FD here.
      stream.fd = fd;
    
      stream._isStdio = true;
    
      return stream;
    }
    
    /**
     * Enable namespaces listed in `process.env.DEBUG` initially.
     */
    
    exports.enable(load());
    
  provide("debug", module.exports);
}(global));

// pakmanager:reduce-component
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Reduce `arr` with `fn`.
     *
     * @param {Array} arr
     * @param {Function} fn
     * @param {Mixed} initial
     *
     * TODO: combatible error handling?
     */
    
    module.exports = function(arr, fn, initial){  
      var idx = 0;
      var len = arr.length;
      var curr = arguments.length == 3
        ? initial
        : arr[idx++];
    
      while (idx < len) {
        curr = fn.call(null, curr, arr[idx], ++idx, arr);
      }
      
      return curr;
    };
  provide("reduce-component", module.exports);
}(global));

// pakmanager:extend
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var hasOwn = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;
    var undefined;
    
    var isPlainObject = function isPlainObject(obj) {
    	'use strict';
    	if (!obj || toString.call(obj) !== '[object Object]') {
    		return false;
    	}
    
    	var has_own_constructor = hasOwn.call(obj, 'constructor');
    	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
    	// Not own constructor property must be Object
    	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
    		return false;
    	}
    
    	// Own properties are enumerated firstly, so to speed up,
    	// if last one is own, then all properties are own.
    	var key;
    	for (key in obj) {}
    
    	return key === undefined || hasOwn.call(obj, key);
    };
    
    module.exports = function extend() {
    	'use strict';
    	var options, name, src, copy, copyIsArray, clone,
    		target = arguments[0],
    		i = 1,
    		length = arguments.length,
    		deep = false;
    
    	// Handle a deep copy situation
    	if (typeof target === 'boolean') {
    		deep = target;
    		target = arguments[1] || {};
    		// skip the boolean and the target
    		i = 2;
    	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
    		target = {};
    	}
    
    	for (; i < length; ++i) {
    		options = arguments[i];
    		// Only deal with non-null/undefined values
    		if (options != null) {
    			// Extend the base object
    			for (name in options) {
    				src = target[name];
    				copy = options[name];
    
    				// Prevent never-ending loop
    				if (target === copy) {
    					continue;
    				}
    
    				// Recurse if we're merging plain objects or arrays
    				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
    					if (copyIsArray) {
    						copyIsArray = false;
    						clone = src && Array.isArray(src) ? src : [];
    					} else {
    						clone = src && isPlainObject(src) ? src : {};
    					}
    
    					// Never move original objects, clone them
    					target[name] = extend(deep, clone, copy);
    
    				// Don't bring in undefined values
    				} else if (copy !== undefined) {
    					target[name] = copy;
    				}
    			}
    		}
    	}
    
    	// Return the modified object
    	return target;
    };
    
    
  provide("extend", module.exports);
}(global));

// pakmanager:form-data
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var CombinedStream = require('combined-stream');
    var util = require('util');
    var path = require('path');
    var http = require('http');
    var https = require('https');
    var parseUrl = require('url').parse;
    var fs = require('fs');
    var mime = require('mime-types');
    var async = require('async');
    
    module.exports = FormData;
    function FormData() {
      this._overheadLength = 0;
      this._valueLength = 0;
      this._lengthRetrievers = [];
    
      CombinedStream.call(this);
    }
    util.inherits(FormData, CombinedStream);
    
    FormData.LINE_BREAK = '\r\n';
    
    FormData.prototype.append = function(field, value, options) {
      options = options || {};
    
      var append = CombinedStream.prototype.append.bind(this);
    
      // all that streamy business can't handle numbers
      if (typeof value == 'number') value = ''+value;
    
      // https://github.com/felixge/node-form-data/issues/38
      if (util.isArray(value)) {
        // Please convert your array into string
        // the way web server expects it
        this._error(new Error('Arrays are not supported.'));
        return;
      }
    
      var header = this._multiPartHeader(field, value, options);
      var footer = this._multiPartFooter(field, value, options);
    
      append(header);
      append(value);
      append(footer);
    
      // pass along options.knownLength
      this._trackLength(header, value, options);
    };
    
    FormData.prototype._trackLength = function(header, value, options) {
      var valueLength = 0;
    
      // used w/ getLengthSync(), when length is known.
      // e.g. for streaming directly from a remote server,
      // w/ a known file a size, and not wanting to wait for
      // incoming file to finish to get its size.
      if (options.knownLength != null) {
        valueLength += +options.knownLength;
      } else if (Buffer.isBuffer(value)) {
        valueLength = value.length;
      } else if (typeof value === 'string') {
        valueLength = Buffer.byteLength(value);
      }
    
      this._valueLength += valueLength;
    
      // @check why add CRLF? does this account for custom/multiple CRLFs?
      this._overheadLength +=
        Buffer.byteLength(header) +
        + FormData.LINE_BREAK.length;
    
      // empty or either doesn't have path or not an http response
      if (!value || ( !value.path && !(value.readable && value.hasOwnProperty('httpVersion')) )) {
        return;
      }
    
      // no need to bother with the length
      if (!options.knownLength)
      this._lengthRetrievers.push(function(next) {
    
        if (value.hasOwnProperty('fd')) {
    
          // take read range into a account
          // `end` = Infinity –> read file till the end
          //
          // TODO: Looks like there is bug in Node fs.createReadStream
          // it doesn't respect `end` options without `start` options
          // Fix it when node fixes it.
          // https://github.com/joyent/node/issues/7819
          if (value.end != undefined && value.end != Infinity && value.start != undefined) {
    
            // when end specified
            // no need to calculate range
            // inclusive, starts with 0
            next(null, value.end+1 - (value.start ? value.start : 0));
    
          // not that fast snoopy
          } else {
            // still need to fetch file size from fs
            fs.stat(value.path, function(err, stat) {
    
              var fileSize;
    
              if (err) {
                next(err);
                return;
              }
    
              // update final size based on the range options
              fileSize = stat.size - (value.start ? value.start : 0);
              next(null, fileSize);
            });
          }
    
        // or http response
        } else if (value.hasOwnProperty('httpVersion')) {
          next(null, +value.headers['content-length']);
    
        // or request stream http://github.com/mikeal/request
        } else if (value.hasOwnProperty('httpModule')) {
          // wait till response come back
          value.on('response', function(response) {
            value.pause();
            next(null, +response.headers['content-length']);
          });
          value.resume();
    
        // something else
        } else {
          next('Unknown stream');
        }
      });
    };
    
    FormData.prototype._multiPartHeader = function(field, value, options) {
      var boundary = this.getBoundary();
      var header = '';
    
      // custom header specified (as string)?
      // it becomes responsible for boundary
      // (e.g. to handle extra CRLFs on .NET servers)
      if (options.header != null) {
        header = options.header;
      } else {
        header += '--' + boundary + FormData.LINE_BREAK +
          'Content-Disposition: form-data; name="' + field + '"';
    
        // fs- and request- streams have path property
        // or use custom filename and/or contentType
        // TODO: Use request's response mime-type
        if (options.filename || value.path) {
          header +=
            '; filename="' + path.basename(options.filename || value.path) + '"' + FormData.LINE_BREAK +
            'Content-Type: ' +  (options.contentType || mime.lookup(options.filename || value.path));
    
        // http response has not
        } else if (value.readable && value.hasOwnProperty('httpVersion')) {
          header +=
            '; filename="' + path.basename(value.client._httpMessage.path) + '"' + FormData.LINE_BREAK +
            'Content-Type: ' + value.headers['content-type'];
        }
    
        header += FormData.LINE_BREAK + FormData.LINE_BREAK;
      }
    
      return header;
    };
    
    FormData.prototype._multiPartFooter = function(field, value, options) {
      return function(next) {
        var footer = FormData.LINE_BREAK;
    
        var lastPart = (this._streams.length === 0);
        if (lastPart) {
          footer += this._lastBoundary();
        }
    
        next(footer);
      }.bind(this);
    };
    
    FormData.prototype._lastBoundary = function() {
      return '--' + this.getBoundary() + '--';
    };
    
    FormData.prototype.getHeaders = function(userHeaders) {
      var formHeaders = {
        'content-type': 'multipart/form-data; boundary=' + this.getBoundary()
      };
    
      for (var header in userHeaders) {
        formHeaders[header.toLowerCase()] = userHeaders[header];
      }
    
      return formHeaders;
    }
    
    FormData.prototype.getCustomHeaders = function(contentType) {
        contentType = contentType ? contentType : 'multipart/form-data';
    
        var formHeaders = {
            'content-type': contentType + '; boundary=' + this.getBoundary(),
            'content-length': this.getLengthSync()
        };
    
        return formHeaders;
    }
    
    FormData.prototype.getBoundary = function() {
      if (!this._boundary) {
        this._generateBoundary();
      }
    
      return this._boundary;
    };
    
    FormData.prototype._generateBoundary = function() {
      // This generates a 50 character boundary similar to those used by Firefox.
      // They are optimized for boyer-moore parsing.
      var boundary = '--------------------------';
      for (var i = 0; i < 24; i++) {
        boundary += Math.floor(Math.random() * 10).toString(16);
      }
    
      this._boundary = boundary;
    };
    
    // Note: getLengthSync DOESN'T calculate streams length
    // As workaround one can calculate file size manually
    // and add it as knownLength option
    FormData.prototype.getLengthSync = function(debug) {
      var knownLength = this._overheadLength + this._valueLength;
    
      // Don't get confused, there are 3 "internal" streams for each keyval pair
      // so it basically checks if there is any value added to the form
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
    
      // https://github.com/felixge/node-form-data/issues/40
      if (this._lengthRetrievers.length) {
        // Some async length retrivers are present
        // therefore synchronous length calculation is false.
        // Please use getLength(callback) to get proper length
        this._error(new Error('Cannot calculate proper length in synchronous way.'));
      }
    
      return knownLength;
    };
    
    FormData.prototype.getLength = function(cb) {
      var knownLength = this._overheadLength + this._valueLength;
    
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
    
      if (!this._lengthRetrievers.length) {
        process.nextTick(cb.bind(this, null, knownLength));
        return;
      }
    
      async.parallel(this._lengthRetrievers, function(err, values) {
        if (err) {
          cb(err);
          return;
        }
    
        values.forEach(function(length) {
          knownLength += length;
        });
    
        cb(null, knownLength);
      });
    };
    
    FormData.prototype.submit = function(params, cb) {
    
      var request
        , options
        , defaults = {
            method : 'post'
        };
    
      // parse provided url if it's string
      // or treat it as options object
      if (typeof params == 'string') {
        params = parseUrl(params);
    
        options = populate({
          port: params.port,
          path: params.pathname,
          host: params.hostname
        }, defaults);
      }
      else // use custom params
      {
        options = populate(params, defaults);
        // if no port provided use default one
        if (!options.port) {
          options.port = options.protocol == 'https:' ? 443 : 80;
        }
      }
    
      // put that good code in getHeaders to some use
      options.headers = this.getHeaders(params.headers);
    
      // https if specified, fallback to http in any other case
      if (params.protocol == 'https:') {
        request = https.request(options);
      } else {
        request = http.request(options);
      }
    
      // get content length and fire away
      this.getLength(function(err, length) {
    
        // TODO: Add chunked encoding when no length (if err)
    
        // add content length
        request.setHeader('Content-Length', length);
    
        this.pipe(request);
        if (cb) {
          request.on('error', cb);
          request.on('response', cb.bind(this, null));
        }
      }.bind(this));
    
      return request;
    };
    
    FormData.prototype._error = function(err) {
      if (this.error) return;
    
      this.error = err;
      this.pause();
      this.emit('error', err);
    };
    
    /*
     * Santa's little helpers
     */
    
    // populates missing values
    function populate(dst, src) {
      for (var prop in src) {
        if (!dst[prop]) dst[prop] = src[prop];
      }
      return dst;
    }
    
  provide("form-data", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_readable
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    module.exports = Readable;
    
    /*<replacement>*/
    var isArray = require('isarray');
    /*</replacement>*/
    
    
    /*<replacement>*/
    var Buffer = require('buffer').Buffer;
    /*</replacement>*/
    
    Readable.ReadableState = ReadableState;
    
    var EE = require('events').EventEmitter;
    
    /*<replacement>*/
    if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
      return emitter.listeners(type).length;
    };
    /*</replacement>*/
    
    var Stream = require('stream');
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var StringDecoder;
    
    util.inherits(Readable, Stream);
    
    function ReadableState(options, stream) {
      options = options || {};
    
      // the point at which it stops calling _read() to fill the buffer
      // Note: 0 is a valid value, means "don't call _read preemptively ever"
      var hwm = options.highWaterMark;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
    
      // cast to ints.
      this.highWaterMark = ~~this.highWaterMark;
    
      this.buffer = [];
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = false;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
    
      // In streams that never have any data, and do push(null) right away,
      // the consumer can miss the 'end' event if they do some I/O before
      // consuming the stream.  So, we don't emit('end') until some reading
      // happens.
      this.calledRead = false;
    
      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, becuase any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;
    
      // whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
    
    
      // object stream flag. Used to make read(n) ignore n and to
      // make all the buffer merging and length checks go away
      this.objectMode = !!options.objectMode;
    
      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';
    
      // when piping, we only care about 'readable' events that happen
      // after read()ing all the bytes and not getting any pushback.
      this.ranOut = false;
    
      // the number of writers that are awaiting a drain event in .pipe()s
      this.awaitDrain = 0;
    
      // if true, a maybeReadMore has been scheduled
      this.readingMore = false;
    
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = require('string_decoder/').StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    
    function Readable(options) {
      if (!(this instanceof Readable))
        return new Readable(options);
    
      this._readableState = new ReadableState(options, this);
    
      // legacy
      this.readable = true;
    
      Stream.call(this);
    }
    
    // Manually shove something into the read() buffer.
    // This returns true if the highWaterMark has not been hit yet,
    // similar to how Writable.write() returns true if you should
    // write() some more.
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
    
      if (typeof chunk === 'string' && !state.objectMode) {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = new Buffer(chunk, encoding);
          encoding = '';
        }
      }
    
      return readableAddChunk(this, state, chunk, encoding, false);
    };
    
    // Unshift should *always* be something directly out of read()
    Readable.prototype.unshift = function(chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };
    
    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (chunk === null || chunk === undefined) {
        state.reading = false;
        if (!state.ended)
          onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var e = new Error('stream.unshift() after end event');
          stream.emit('error', e);
        } else {
          if (state.decoder && !addToFront && !encoding)
            chunk = state.decoder.write(chunk);
    
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) {
            state.buffer.unshift(chunk);
          } else {
            state.reading = false;
            state.buffer.push(chunk);
          }
    
          if (state.needReadable)
            emitReadable(stream);
    
          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }
    
      return needMoreData(state);
    }
    
    
    
    // if it's past the high water mark, we can push in some more.
    // Also, if we have no data yet, we can stand some
    // more bytes.  This is to work around cases where hwm=0,
    // such as the repl.  Also, if the push() triggered a
    // readable event, and the user called read(largeNumber) such that
    // needReadable was set, then we ought to push more, so that another
    // 'readable' event will be triggered.
    function needMoreData(state) {
      return !state.ended &&
             (state.needReadable ||
              state.length < state.highWaterMark ||
              state.length === 0);
    }
    
    // backwards compatibility.
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = require('string_decoder/').StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
    };
    
    // Don't raise the hwm > 128MB
    var MAX_HWM = 0x800000;
    function roundUpToNextPowerOf2(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        // Get the next highest power of 2
        n--;
        for (var p = 1; p < 32; p <<= 1) n |= n >> p;
        n++;
      }
      return n;
    }
    
    function howMuchToRead(n, state) {
      if (state.length === 0 && state.ended)
        return 0;
    
      if (state.objectMode)
        return n === 0 ? 0 : 1;
    
      if (n === null || isNaN(n)) {
        // only flow one buffer at a time
        if (state.flowing && state.buffer.length)
          return state.buffer[0].length;
        else
          return state.length;
      }
    
      if (n <= 0)
        return 0;
    
      // If we're asking for more than the target buffer level,
      // then raise the water mark.  Bump up to the next highest
      // power of 2, to prevent increasing it excessively in tiny
      // amounts.
      if (n > state.highWaterMark)
        state.highWaterMark = roundUpToNextPowerOf2(n);
    
      // don't have that much.  return null, unless we've ended.
      if (n > state.length) {
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        } else
          return state.length;
      }
    
      return n;
    }
    
    // you can override either this method, or the async _read(n) below.
    Readable.prototype.read = function(n) {
      var state = this._readableState;
      state.calledRead = true;
      var nOrig = n;
      var ret;
    
      if (typeof n !== 'number' || n > 0)
        state.emittedReadable = false;
    
      // if we're doing read(0) to trigger a readable event, but we
      // already have a bunch of data in the buffer, then just trigger
      // the 'readable' event and move on.
      if (n === 0 &&
          state.needReadable &&
          (state.length >= state.highWaterMark || state.ended)) {
        emitReadable(this);
        return null;
      }
    
      n = howMuchToRead(n, state);
    
      // if we've ended, and we're now clear, then finish it up.
      if (n === 0 && state.ended) {
        ret = null;
    
        // In cases where the decoder did not receive enough data
        // to produce a full chunk, then immediately received an
        // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
        // howMuchToRead will see this and coerce the amount to
        // read to zero (because it's looking at the length of the
        // first <Buffer > in state.buffer), and we'll end up here.
        //
        // This can only happen via state.decoder -- no other venue
        // exists for pushing a zero-length chunk into state.buffer
        // and triggering this behavior. In this case, we return our
        // remaining data and end the stream, if appropriate.
        if (state.length > 0 && state.decoder) {
          ret = fromList(n, state);
          state.length -= ret.length;
        }
    
        if (state.length === 0)
          endReadable(this);
    
        return ret;
      }
    
      // All the actual chunk generation logic needs to be
      // *below* the call to _read.  The reason is that in certain
      // synthetic stream cases, such as passthrough streams, _read
      // may be a completely synchronous operation which may change
      // the state of the read buffer, providing enough data when
      // before there was *not* enough.
      //
      // So, the steps are:
      // 1. Figure out what the state of things will be after we do
      // a read from the buffer.
      //
      // 2. If that resulting state will trigger a _read, then call _read.
      // Note that this may be asynchronous, or synchronous.  Yes, it is
      // deeply ugly to write APIs this way, but that still doesn't mean
      // that the Readable class should behave improperly, as streams are
      // designed to be sync/async agnostic.
      // Take note if the _read call is sync or async (ie, if the read call
      // has returned yet), so that we know whether or not it's safe to emit
      // 'readable' etc.
      //
      // 3. Actually pull the requested chunks out of the buffer and return.
    
      // if we need a readable event, then we need to do some reading.
      var doRead = state.needReadable;
    
      // if we currently have less than the highWaterMark, then also read some
      if (state.length - n <= state.highWaterMark)
        doRead = true;
    
      // however, if we've ended, then there's no point, and if we're already
      // reading, then it's unnecessary.
      if (state.ended || state.reading)
        doRead = false;
    
      if (doRead) {
        state.reading = true;
        state.sync = true;
        // if the length is currently zero, then we *need* a readable event.
        if (state.length === 0)
          state.needReadable = true;
        // call internal read method
        this._read(state.highWaterMark);
        state.sync = false;
      }
    
      // If _read called its callback synchronously, then `reading`
      // will be false, and we need to re-evaluate how much data we
      // can return to the user.
      if (doRead && !state.reading)
        n = howMuchToRead(nOrig, state);
    
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
    
      if (ret === null) {
        state.needReadable = true;
        n = 0;
      }
    
      state.length -= n;
    
      // If we have nothing in the buffer, then we want to know
      // as soon as we *do* get something into the buffer.
      if (state.length === 0 && !state.ended)
        state.needReadable = true;
    
      // If we happened to read() exactly the remaining amount in the
      // buffer, and the EOF has been seen at this point, then make sure
      // that we emit 'end' on the very next tick.
      if (state.ended && !state.endEmitted && state.length === 0)
        endReadable(this);
    
      return ret;
    };
    
    function chunkInvalid(state, chunk) {
      var er = null;
      if (!Buffer.isBuffer(chunk) &&
          'string' !== typeof chunk &&
          chunk !== null &&
          chunk !== undefined &&
          !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }
    
    
    function onEofChunk(stream, state) {
      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
    
      // if we've ended and we have some data left, then emit
      // 'readable' now to make sure it gets picked up.
      if (state.length > 0)
        emitReadable(stream);
      else
        endReadable(stream);
    }
    
    // Don't emit readable right away in sync mode, because this can trigger
    // another read() call => stack overflow.  This way, it might trigger
    // a nextTick recursion warning, but that's not so bad.
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (state.emittedReadable)
        return;
    
      state.emittedReadable = true;
      if (state.sync)
        process.nextTick(function() {
          emitReadable_(stream);
        });
      else
        emitReadable_(stream);
    }
    
    function emitReadable_(stream) {
      stream.emit('readable');
    }
    
    
    // at this point, the user has presumably seen the 'readable' event,
    // and called read() to consume some data.  that may have triggered
    // in turn another _read(n) call, in which case reading = true if
    // it's in progress.
    // However, if we're not ended, or reading, and the length < hwm,
    // then go ahead and try to read some more preemptively.
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        process.nextTick(function() {
          maybeReadMore_(stream, state);
        });
      }
    }
    
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended &&
             state.length < state.highWaterMark) {
        stream.read(0);
        if (len === state.length)
          // didn't get any data, stop spinning.
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    
    // abstract method.  to be overridden in specific implementation classes.
    // call cb(er, data) where data is <= n in length.
    // for virtual (non-string, non-buffer) streams, "length" is somewhat
    // arbitrary, and perhaps not very meaningful.
    Readable.prototype._read = function(n) {
      this.emit('error', new Error('not implemented'));
    };
    
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
    
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
    
      var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
                  dest !== process.stdout &&
                  dest !== process.stderr;
    
      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted)
        process.nextTick(endFn);
      else
        src.once('end', endFn);
    
      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        if (readable !== src) return;
        cleanup();
      }
    
      function onend() {
        dest.end();
      }
    
      // when the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);
    
      function cleanup() {
        // cleanup event handlers once the pipe is broken
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
    
        // if the reader is waiting for a drain event from this
        // specific writer, then it would cause it to never start
        // flowing again.
        // So, if this is awaiting a drain, then we just call it now.
        // If we don't know, then assume that we are waiting for one.
        if (!dest._writableState || dest._writableState.needDrain)
          ondrain();
      }
    
      // if the dest has an error, then stop piping into it.
      // however, don't suppress the throwing behavior for this.
      function onerror(er) {
        unpipe();
        dest.removeListener('error', onerror);
        if (EE.listenerCount(dest, 'error') === 0)
          dest.emit('error', er);
      }
      // This is a brutally ugly hack to make sure that our error handler
      // is attached before any userland ones.  NEVER DO THIS.
      if (!dest._events || !dest._events.error)
        dest.on('error', onerror);
      else if (isArray(dest._events.error))
        dest._events.error.unshift(onerror);
      else
        dest._events.error = [onerror, dest._events.error];
    
    
    
      // Both close and finish should trigger unpipe, but only once.
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);
    
      function unpipe() {
        src.unpipe(dest);
      }
    
      // tell the dest that it's being piped to
      dest.emit('pipe', src);
    
      // start the flow if it hasn't been started already.
      if (!state.flowing) {
        // the handler that waits for readable events after all
        // the data gets sucked out in flow.
        // This would be easier to follow with a .once() handler
        // in flow(), but that is too slow.
        this.on('readable', pipeOnReadable);
    
        state.flowing = true;
        process.nextTick(function() {
          flow(src);
        });
      }
    
      return dest;
    };
    
    function pipeOnDrain(src) {
      return function() {
        var dest = this;
        var state = src._readableState;
        state.awaitDrain--;
        if (state.awaitDrain === 0)
          flow(src);
      };
    }
    
    function flow(src) {
      var state = src._readableState;
      var chunk;
      state.awaitDrain = 0;
    
      function write(dest, i, list) {
        var written = dest.write(chunk);
        if (false === written) {
          state.awaitDrain++;
        }
      }
    
      while (state.pipesCount && null !== (chunk = src.read())) {
    
        if (state.pipesCount === 1)
          write(state.pipes, 0, null);
        else
          forEach(state.pipes, write);
    
        src.emit('data', chunk);
    
        // if anyone needs a drain, then we have to wait for that.
        if (state.awaitDrain > 0)
          return;
      }
    
      // if every destination was unpiped, either before entering this
      // function, or in the while loop, then stop flowing.
      //
      // NB: This is a pretty rare edge case.
      if (state.pipesCount === 0) {
        state.flowing = false;
    
        // if there were data event listeners added, then switch to old mode.
        if (EE.listenerCount(src, 'data') > 0)
          emitDataEvents(src);
        return;
      }
    
      // at this point, no one needed a drain, so we just ran out of data
      // on the next readable event, start it over again.
      state.ranOut = true;
    }
    
    function pipeOnReadable() {
      if (this._readableState.ranOut) {
        this._readableState.ranOut = false;
        flow(this);
      }
    }
    
    
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
    
      // if we're not piping anywhere, then do nothing.
      if (state.pipesCount === 0)
        return this;
    
      // just one destination.  most common case.
      if (state.pipesCount === 1) {
        // passed in one, but it's not the right one.
        if (dest && dest !== state.pipes)
          return this;
    
        if (!dest)
          dest = state.pipes;
    
        // got a match.
        state.pipes = null;
        state.pipesCount = 0;
        this.removeListener('readable', pipeOnReadable);
        state.flowing = false;
        if (dest)
          dest.emit('unpipe', this);
        return this;
      }
    
      // slow case. multiple pipe destinations.
    
      if (!dest) {
        // remove all.
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        this.removeListener('readable', pipeOnReadable);
        state.flowing = false;
    
        for (var i = 0; i < len; i++)
          dests[i].emit('unpipe', this);
        return this;
      }
    
      // try to find the right one.
      var i = indexOf(state.pipes, dest);
      if (i === -1)
        return this;
    
      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
    
      dest.emit('unpipe', this);
    
      return this;
    };
    
    // set up data events if they are asked for
    // Ensure readable listeners eventually get something
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
    
      if (ev === 'data' && !this._readableState.flowing)
        emitDataEvents(this);
    
      if (ev === 'readable' && this.readable) {
        var state = this._readableState;
        if (!state.readableListening) {
          state.readableListening = true;
          state.emittedReadable = false;
          state.needReadable = true;
          if (!state.reading) {
            this.read(0);
          } else if (state.length) {
            emitReadable(this, state);
          }
        }
      }
    
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    
    // pause() and resume() are remnants of the legacy readable stream API
    // If the user uses them, then switch into old mode.
    Readable.prototype.resume = function() {
      emitDataEvents(this);
      this.read(0);
      this.emit('resume');
    };
    
    Readable.prototype.pause = function() {
      emitDataEvents(this, true);
      this.emit('pause');
    };
    
    function emitDataEvents(stream, startPaused) {
      var state = stream._readableState;
    
      if (state.flowing) {
        // https://github.com/isaacs/readable-stream/issues/16
        throw new Error('Cannot switch to old mode now.');
      }
    
      var paused = startPaused || false;
      var readable = false;
    
      // convert to an old-style stream.
      stream.readable = true;
      stream.pipe = Stream.prototype.pipe;
      stream.on = stream.addListener = Stream.prototype.on;
    
      stream.on('readable', function() {
        readable = true;
    
        var c;
        while (!paused && (null !== (c = stream.read())))
          stream.emit('data', c);
    
        if (c === null) {
          readable = false;
          stream._readableState.needReadable = true;
        }
      });
    
      stream.pause = function() {
        paused = true;
        this.emit('pause');
      };
    
      stream.resume = function() {
        paused = false;
        if (readable)
          process.nextTick(function() {
            stream.emit('readable');
          });
        else
          this.read(0);
        this.emit('resume');
      };
    
      // now make it start, just in case it hadn't already.
      stream.emit('readable');
    }
    
    // wrap an old-style stream as the async data source.
    // This is *not* part of the readable stream interface.
    // It is an ugly unfortunate mess of history.
    Readable.prototype.wrap = function(stream) {
      var state = this._readableState;
      var paused = false;
    
      var self = this;
      stream.on('end', function() {
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            self.push(chunk);
        }
    
        self.push(null);
      });
    
      stream.on('data', function(chunk) {
        if (state.decoder)
          chunk = state.decoder.write(chunk);
    
        // don't skip over falsy values in objectMode
        //if (state.objectMode && util.isNullOrUndefined(chunk))
        if (state.objectMode && (chunk === null || chunk === undefined))
          return;
        else if (!state.objectMode && (!chunk || !chunk.length))
          return;
    
        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
    
      // proxy all the other methods.
      // important when wrapping filters and duplexes.
      for (var i in stream) {
        if (typeof stream[i] === 'function' &&
            typeof this[i] === 'undefined') {
          this[i] = function(method) { return function() {
            return stream[method].apply(stream, arguments);
          }}(i);
        }
      }
    
      // proxy certain important events.
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function(ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });
    
      // when we try to consume some more bytes, simply unpause the
      // underlying stream.
      self._read = function(n) {
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
    
      return self;
    };
    
    
    
    // exposed for testing purposes only.
    Readable._fromList = fromList;
    
    // Pluck off n bytes from an array of buffers.
    // Length is the combined lengths of all the buffers in the list.
    function fromList(n, state) {
      var list = state.buffer;
      var length = state.length;
      var stringMode = !!state.decoder;
      var objectMode = !!state.objectMode;
      var ret;
    
      // nothing in the list, definitely empty.
      if (list.length === 0)
        return null;
    
      if (length === 0)
        ret = null;
      else if (objectMode)
        ret = list.shift();
      else if (!n || n >= length) {
        // read it all, truncate the array.
        if (stringMode)
          ret = list.join('');
        else
          ret = Buffer.concat(list, length);
        list.length = 0;
      } else {
        // read just some of it.
        if (n < list[0].length) {
          // just take a part of the first list item.
          // slice is the same for buffers and strings.
          var buf = list[0];
          ret = buf.slice(0, n);
          list[0] = buf.slice(n);
        } else if (n === list[0].length) {
          // first list is a perfect match
          ret = list.shift();
        } else {
          // complex case.
          // we have enough to cover it, but it spans past the first buffer.
          if (stringMode)
            ret = '';
          else
            ret = new Buffer(n);
    
          var c = 0;
          for (var i = 0, l = list.length; i < l && c < n; i++) {
            var buf = list[0];
            var cpy = Math.min(n - c, buf.length);
    
            if (stringMode)
              ret += buf.slice(0, cpy);
            else
              buf.copy(ret, c, 0, cpy);
    
            if (cpy < buf.length)
              list[0] = buf.slice(cpy);
            else
              list.shift();
    
            c += cpy;
          }
        }
      }
    
      return ret;
    }
    
    function endReadable(stream) {
      var state = stream._readableState;
    
      // If we get here before consuming all the bytes, then that is a
      // bug in node.  Should never happen.
      if (state.length > 0)
        throw new Error('endReadable called on non-empty stream');
    
      if (!state.endEmitted && state.calledRead) {
        state.ended = true;
        process.nextTick(function() {
          // Check that we didn't get one last unshift.
          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');
          }
        });
      }
    }
    
    function forEach (xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    
    function indexOf (xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
      }
      return -1;
    }
    
  provide("readable-stream/lib/_stream_readable", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_writable
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // A bit simpler than readable streams.
    // Implement an async ._write(chunk, cb), and it'll handle all
    // the drain event emission and buffering.
    
    module.exports = Writable;
    
    /*<replacement>*/
    var Buffer = require('buffer').Buffer;
    /*</replacement>*/
    
    Writable.WritableState = WritableState;
    
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var Stream = require('stream');
    
    util.inherits(Writable, Stream);
    
    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
    }
    
    function WritableState(options, stream) {
      options = options || {};
    
      // the point at which write() starts returning false
      // Note: 0 is a valid value, means that we always return false if
      // the entire buffer is not flushed immediately on write()
      var hwm = options.highWaterMark;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
    
      // object stream flag to indicate whether or not this stream
      // contains buffers or objects.
      this.objectMode = !!options.objectMode;
    
      // cast to ints.
      this.highWaterMark = ~~this.highWaterMark;
    
      this.needDrain = false;
      // at the start of calling end()
      this.ending = false;
      // when end() has been called, and returned
      this.ended = false;
      // when 'finish' is emitted
      this.finished = false;
    
      // should we decode strings into buffers before passing to _write?
      // this is here so that some node-core streams can optimize string
      // handling at a lower level.
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
    
      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';
    
      // not an actual buffer we keep track of, but a measurement
      // of how much we're waiting to get pushed to some underlying
      // socket or file.
      this.length = 0;
    
      // a flag to see when we're in the middle of a write.
      this.writing = false;
    
      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, becuase any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;
    
      // a flag to know if we're processing previously buffered items, which
      // may call the _write() callback in the same tick, so that we don't
      // end up in an overlapped onwrite situation.
      this.bufferProcessing = false;
    
      // the callback that's passed to _write(chunk,cb)
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
    
      // the callback that the user supplies to write(chunk,encoding,cb)
      this.writecb = null;
    
      // the amount that is being written when _write is called.
      this.writelen = 0;
    
      this.buffer = [];
    
      // True if the error was already emitted and should not be thrown again
      this.errorEmitted = false;
    }
    
    function Writable(options) {
      var Duplex =  require('readable-stream/lib/_stream_duplex');
    
      // Writable ctor is applied to Duplexes, though they're not
      // instanceof Writable, they're instanceof Readable.
      if (!(this instanceof Writable) && !(this instanceof Duplex))
        return new Writable(options);
    
      this._writableState = new WritableState(options, this);
    
      // legacy.
      this.writable = true;
    
      Stream.call(this);
    }
    
    // Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function() {
      this.emit('error', new Error('Cannot pipe. Not readable.'));
    };
    
    
    function writeAfterEnd(stream, state, cb) {
      var er = new Error('write after end');
      // TODO: defer error events consistently everywhere, not just the cb
      stream.emit('error', er);
      process.nextTick(function() {
        cb(er);
      });
    }
    
    // If we get something that is not a buffer, string, null, or undefined,
    // and we're not in objectMode, then that's an error.
    // Otherwise stream chunks are all considered to be of length=1, and the
    // watermarks determine how many objects to keep in the buffer, rather than
    // how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      if (!Buffer.isBuffer(chunk) &&
          'string' !== typeof chunk &&
          chunk !== null &&
          chunk !== undefined &&
          !state.objectMode) {
        var er = new TypeError('Invalid non-string/buffer chunk');
        stream.emit('error', er);
        process.nextTick(function() {
          cb(er);
        });
        valid = false;
      }
      return valid;
    }
    
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
    
      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }
    
      if (Buffer.isBuffer(chunk))
        encoding = 'buffer';
      else if (!encoding)
        encoding = state.defaultEncoding;
    
      if (typeof cb !== 'function')
        cb = function() {};
    
      if (state.ended)
        writeAfterEnd(this, state, cb);
      else if (validChunk(this, state, chunk, cb))
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
    
      return ret;
    };
    
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode &&
          state.decodeStrings !== false &&
          typeof chunk === 'string') {
        chunk = new Buffer(chunk, encoding);
      }
      return chunk;
    }
    
    // if we're already writing something, then just put this
    // in the queue, and wait our turn.  Otherwise, call _write
    // If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);
      if (Buffer.isBuffer(chunk))
        encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;
    
      state.length += len;
    
      var ret = state.length < state.highWaterMark;
      // we must ensure that previous needDrain will not be reset to false.
      if (!ret)
        state.needDrain = true;
    
      if (state.writing)
        state.buffer.push(new WriteReq(chunk, encoding, cb));
      else
        doWrite(stream, state, len, chunk, encoding, cb);
    
      return ret;
    }
    
    function doWrite(stream, state, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    
    function onwriteError(stream, state, sync, er, cb) {
      if (sync)
        process.nextTick(function() {
          cb(er);
        });
      else
        cb(er);
    
      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }
    
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
    
      onwriteStateUpdate(state);
    
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        // Check if we're actually ready to finish, but don't emit yet
        var finished = needFinish(stream, state);
    
        if (!finished && !state.bufferProcessing && state.buffer.length)
          clearBuffer(stream, state);
    
        if (sync) {
          process.nextTick(function() {
            afterWrite(stream, state, finished, cb);
          });
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      cb();
      if (finished)
        finishMaybe(stream, state);
    }
    
    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }
    
    
    // if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
    
      for (var c = 0; c < state.buffer.length; c++) {
        var entry = state.buffer[c];
        var chunk = entry.chunk;
        var encoding = entry.encoding;
        var cb = entry.callback;
        var len = state.objectMode ? 1 : chunk.length;
    
        doWrite(stream, state, len, chunk, encoding, cb);
    
        // if we didn't call the onwrite immediately, then
        // it means that we need to wait until it does.
        // also, that means that the chunk and cb are currently
        // being processed, so move the buffer counter past them.
        if (state.writing) {
          c++;
          break;
        }
      }
    
      state.bufferProcessing = false;
      if (c < state.buffer.length)
        state.buffer = state.buffer.slice(c);
      else
        state.buffer.length = 0;
    }
    
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };
    
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
    
      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }
    
      if (typeof chunk !== 'undefined' && chunk !== null)
        this.write(chunk, encoding);
    
      // ignore unnecessary end() calls.
      if (!state.ending && !state.finished)
        endWritable(this, state, cb);
    };
    
    
    function needFinish(stream, state) {
      return (state.ending &&
              state.length === 0 &&
              !state.finished &&
              !state.writing);
    }
    
    function finishMaybe(stream, state) {
      var need = needFinish(stream, state);
      if (need) {
        state.finished = true;
        stream.emit('finish');
      }
      return need;
    }
    
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          process.nextTick(cb);
        else
          stream.once('finish', cb);
      }
      state.ended = true;
    }
    
  provide("readable-stream/lib/_stream_writable", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_duplex
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // a duplex stream is just a stream that is both readable and writable.
    // Since JS doesn't have multiple prototypal inheritance, this class
    // prototypally inherits from Readable, and then parasitically from
    // Writable.
    
    module.exports = Duplex;
    
    /*<replacement>*/
    var objectKeys = Object.keys || function (obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    }
    /*</replacement>*/
    
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var Readable =  require('readable-stream/lib/_stream_readable');
    var Writable =  require('readable-stream/lib/_stream_writable');
    
    util.inherits(Duplex, Readable);
    
    forEach(objectKeys(Writable.prototype), function(method) {
      if (!Duplex.prototype[method])
        Duplex.prototype[method] = Writable.prototype[method];
    });
    
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
    
      Readable.call(this, options);
      Writable.call(this, options);
    
      if (options && options.readable === false)
        this.readable = false;
    
      if (options && options.writable === false)
        this.writable = false;
    
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
    
      this.once('end', onend);
    }
    
    // the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended)
        return;
    
      // no more data can be written.
      // But allow more writes to happen in this tick.
      process.nextTick(this.end.bind(this));
    }
    
    function forEach (xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    
  provide("readable-stream/lib/_stream_duplex", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_transform
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    
    // a transform stream is a readable/writable stream where you do
    // something with the data.  Sometimes it's called a "filter",
    // but that's not a great name for it, since that implies a thing where
    // some bits pass through, and others are simply ignored.  (That would
    // be a valid example of a transform, of course.)
    //
    // While the output is causally related to the input, it's not a
    // necessarily symmetric or synchronous transformation.  For example,
    // a zlib stream might take multiple plain-text writes(), and then
    // emit a single compressed chunk some time in the future.
    //
    // Here's how this works:
    //
    // The Transform stream has all the aspects of the readable and writable
    // stream classes.  When you write(chunk), that calls _write(chunk,cb)
    // internally, and returns false if there's a lot of pending writes
    // buffered up.  When you call read(), that calls _read(n) until
    // there's enough pending readable data buffered up.
    //
    // In a transform stream, the written data is placed in a buffer.  When
    // _read(n) is called, it transforms the queued up data, calling the
    // buffered _write cb's as it consumes chunks.  If consuming a single
    // written chunk would result in multiple output chunks, then the first
    // outputted bit calls the readcb, and subsequent chunks just go into
    // the read buffer, and will cause it to emit 'readable' if necessary.
    //
    // This way, back-pressure is actually determined by the reading side,
    // since _read has to be called to start processing a new chunk.  However,
    // a pathological inflate type of transform can cause excessive buffering
    // here.  For example, imagine a stream where every byte of input is
    // interpreted as an integer from 0-255, and then results in that many
    // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
    // 1kb of data being output.  In this case, you could write a very small
    // amount of input, and end up with a very large amount of output.  In
    // such a pathological inflating mechanism, there'd be no way to tell
    // the system to stop doing the transform.  A single 4MB write could
    // cause the system to run out of memory.
    //
    // However, even in such a pathological case, only a single written chunk
    // would be consumed, and then the rest would wait (un-transformed) until
    // the results of the previous transformed chunk were consumed.
    
    module.exports = Transform;
    
    var Duplex =  require('readable-stream/lib/_stream_duplex');
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    util.inherits(Transform, Duplex);
    
    
    function TransformState(options, stream) {
      this.afterTransform = function(er, data) {
        return afterTransform(stream, er, data);
      };
    
      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
    }
    
    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;
    
      var cb = ts.writecb;
    
      if (!cb)
        return stream.emit('error', new Error('no writecb in Transform class'));
    
      ts.writechunk = null;
      ts.writecb = null;
    
      if (data !== null && data !== undefined)
        stream.push(data);
    
      if (cb)
        cb(er);
    
      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    
    
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
    
      Duplex.call(this, options);
    
      var ts = this._transformState = new TransformState(options, this);
    
      // when the writable side finishes, then flush out anything remaining.
      var stream = this;
    
      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;
    
      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;
    
      this.once('finish', function() {
        if ('function' === typeof this._flush)
          this._flush(function(er) {
            done(stream, er);
          });
        else
          done(stream);
      });
    }
    
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    
    // This is the part where you do stuff!
    // override this function in implementation classes.
    // 'chunk' is an input chunk.
    //
    // Call `push(newChunk)` to pass along transformed output
    // to the readable side.  You may call 'push' zero or more times.
    //
    // Call `cb(err)` when you are done with this chunk.  If you pass
    // an error, then that'll put the hurt on the whole operation.  If you
    // never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error('not implemented');
    };
    
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform ||
            rs.needReadable ||
            rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    
    // Doesn't matter what the args are here.
    // _transform does all the work.
    // That we got here means that the readable side wants more data.
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
    
      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };
    
    
    function done(stream, er) {
      if (er)
        return stream.emit('error', er);
    
      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var rs = stream._readableState;
      var ts = stream._transformState;
    
      if (ws.length)
        throw new Error('calling transform done when ws.length != 0');
    
      if (ts.transforming)
        throw new Error('calling transform done when still transforming');
    
      return stream.push(null);
    }
    
  provide("readable-stream/lib/_stream_transform", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_readable.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    module.exports = Readable;
    
    /*<replacement>*/
    var isArray = require('isarray');
    /*</replacement>*/
    
    
    /*<replacement>*/
    var Buffer = require('buffer').Buffer;
    /*</replacement>*/
    
    Readable.ReadableState = ReadableState;
    
    var EE = require('events').EventEmitter;
    
    /*<replacement>*/
    if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
      return emitter.listeners(type).length;
    };
    /*</replacement>*/
    
    var Stream = require('stream');
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var StringDecoder;
    
    util.inherits(Readable, Stream);
    
    function ReadableState(options, stream) {
      options = options || {};
    
      // the point at which it stops calling _read() to fill the buffer
      // Note: 0 is a valid value, means "don't call _read preemptively ever"
      var hwm = options.highWaterMark;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
    
      // cast to ints.
      this.highWaterMark = ~~this.highWaterMark;
    
      this.buffer = [];
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = false;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
    
      // In streams that never have any data, and do push(null) right away,
      // the consumer can miss the 'end' event if they do some I/O before
      // consuming the stream.  So, we don't emit('end') until some reading
      // happens.
      this.calledRead = false;
    
      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, becuase any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;
    
      // whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
    
    
      // object stream flag. Used to make read(n) ignore n and to
      // make all the buffer merging and length checks go away
      this.objectMode = !!options.objectMode;
    
      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';
    
      // when piping, we only care about 'readable' events that happen
      // after read()ing all the bytes and not getting any pushback.
      this.ranOut = false;
    
      // the number of writers that are awaiting a drain event in .pipe()s
      this.awaitDrain = 0;
    
      // if true, a maybeReadMore has been scheduled
      this.readingMore = false;
    
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = require('string_decoder/').StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    
    function Readable(options) {
      if (!(this instanceof Readable))
        return new Readable(options);
    
      this._readableState = new ReadableState(options, this);
    
      // legacy
      this.readable = true;
    
      Stream.call(this);
    }
    
    // Manually shove something into the read() buffer.
    // This returns true if the highWaterMark has not been hit yet,
    // similar to how Writable.write() returns true if you should
    // write() some more.
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
    
      if (typeof chunk === 'string' && !state.objectMode) {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = new Buffer(chunk, encoding);
          encoding = '';
        }
      }
    
      return readableAddChunk(this, state, chunk, encoding, false);
    };
    
    // Unshift should *always* be something directly out of read()
    Readable.prototype.unshift = function(chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };
    
    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (chunk === null || chunk === undefined) {
        state.reading = false;
        if (!state.ended)
          onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var e = new Error('stream.unshift() after end event');
          stream.emit('error', e);
        } else {
          if (state.decoder && !addToFront && !encoding)
            chunk = state.decoder.write(chunk);
    
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) {
            state.buffer.unshift(chunk);
          } else {
            state.reading = false;
            state.buffer.push(chunk);
          }
    
          if (state.needReadable)
            emitReadable(stream);
    
          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }
    
      return needMoreData(state);
    }
    
    
    
    // if it's past the high water mark, we can push in some more.
    // Also, if we have no data yet, we can stand some
    // more bytes.  This is to work around cases where hwm=0,
    // such as the repl.  Also, if the push() triggered a
    // readable event, and the user called read(largeNumber) such that
    // needReadable was set, then we ought to push more, so that another
    // 'readable' event will be triggered.
    function needMoreData(state) {
      return !state.ended &&
             (state.needReadable ||
              state.length < state.highWaterMark ||
              state.length === 0);
    }
    
    // backwards compatibility.
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = require('string_decoder/').StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
    };
    
    // Don't raise the hwm > 128MB
    var MAX_HWM = 0x800000;
    function roundUpToNextPowerOf2(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        // Get the next highest power of 2
        n--;
        for (var p = 1; p < 32; p <<= 1) n |= n >> p;
        n++;
      }
      return n;
    }
    
    function howMuchToRead(n, state) {
      if (state.length === 0 && state.ended)
        return 0;
    
      if (state.objectMode)
        return n === 0 ? 0 : 1;
    
      if (n === null || isNaN(n)) {
        // only flow one buffer at a time
        if (state.flowing && state.buffer.length)
          return state.buffer[0].length;
        else
          return state.length;
      }
    
      if (n <= 0)
        return 0;
    
      // If we're asking for more than the target buffer level,
      // then raise the water mark.  Bump up to the next highest
      // power of 2, to prevent increasing it excessively in tiny
      // amounts.
      if (n > state.highWaterMark)
        state.highWaterMark = roundUpToNextPowerOf2(n);
    
      // don't have that much.  return null, unless we've ended.
      if (n > state.length) {
        if (!state.ended) {
          state.needReadable = true;
          return 0;
        } else
          return state.length;
      }
    
      return n;
    }
    
    // you can override either this method, or the async _read(n) below.
    Readable.prototype.read = function(n) {
      var state = this._readableState;
      state.calledRead = true;
      var nOrig = n;
      var ret;
    
      if (typeof n !== 'number' || n > 0)
        state.emittedReadable = false;
    
      // if we're doing read(0) to trigger a readable event, but we
      // already have a bunch of data in the buffer, then just trigger
      // the 'readable' event and move on.
      if (n === 0 &&
          state.needReadable &&
          (state.length >= state.highWaterMark || state.ended)) {
        emitReadable(this);
        return null;
      }
    
      n = howMuchToRead(n, state);
    
      // if we've ended, and we're now clear, then finish it up.
      if (n === 0 && state.ended) {
        ret = null;
    
        // In cases where the decoder did not receive enough data
        // to produce a full chunk, then immediately received an
        // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
        // howMuchToRead will see this and coerce the amount to
        // read to zero (because it's looking at the length of the
        // first <Buffer > in state.buffer), and we'll end up here.
        //
        // This can only happen via state.decoder -- no other venue
        // exists for pushing a zero-length chunk into state.buffer
        // and triggering this behavior. In this case, we return our
        // remaining data and end the stream, if appropriate.
        if (state.length > 0 && state.decoder) {
          ret = fromList(n, state);
          state.length -= ret.length;
        }
    
        if (state.length === 0)
          endReadable(this);
    
        return ret;
      }
    
      // All the actual chunk generation logic needs to be
      // *below* the call to _read.  The reason is that in certain
      // synthetic stream cases, such as passthrough streams, _read
      // may be a completely synchronous operation which may change
      // the state of the read buffer, providing enough data when
      // before there was *not* enough.
      //
      // So, the steps are:
      // 1. Figure out what the state of things will be after we do
      // a read from the buffer.
      //
      // 2. If that resulting state will trigger a _read, then call _read.
      // Note that this may be asynchronous, or synchronous.  Yes, it is
      // deeply ugly to write APIs this way, but that still doesn't mean
      // that the Readable class should behave improperly, as streams are
      // designed to be sync/async agnostic.
      // Take note if the _read call is sync or async (ie, if the read call
      // has returned yet), so that we know whether or not it's safe to emit
      // 'readable' etc.
      //
      // 3. Actually pull the requested chunks out of the buffer and return.
    
      // if we need a readable event, then we need to do some reading.
      var doRead = state.needReadable;
    
      // if we currently have less than the highWaterMark, then also read some
      if (state.length - n <= state.highWaterMark)
        doRead = true;
    
      // however, if we've ended, then there's no point, and if we're already
      // reading, then it's unnecessary.
      if (state.ended || state.reading)
        doRead = false;
    
      if (doRead) {
        state.reading = true;
        state.sync = true;
        // if the length is currently zero, then we *need* a readable event.
        if (state.length === 0)
          state.needReadable = true;
        // call internal read method
        this._read(state.highWaterMark);
        state.sync = false;
      }
    
      // If _read called its callback synchronously, then `reading`
      // will be false, and we need to re-evaluate how much data we
      // can return to the user.
      if (doRead && !state.reading)
        n = howMuchToRead(nOrig, state);
    
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
    
      if (ret === null) {
        state.needReadable = true;
        n = 0;
      }
    
      state.length -= n;
    
      // If we have nothing in the buffer, then we want to know
      // as soon as we *do* get something into the buffer.
      if (state.length === 0 && !state.ended)
        state.needReadable = true;
    
      // If we happened to read() exactly the remaining amount in the
      // buffer, and the EOF has been seen at this point, then make sure
      // that we emit 'end' on the very next tick.
      if (state.ended && !state.endEmitted && state.length === 0)
        endReadable(this);
    
      return ret;
    };
    
    function chunkInvalid(state, chunk) {
      var er = null;
      if (!Buffer.isBuffer(chunk) &&
          'string' !== typeof chunk &&
          chunk !== null &&
          chunk !== undefined &&
          !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }
    
    
    function onEofChunk(stream, state) {
      if (state.decoder && !state.ended) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
    
      // if we've ended and we have some data left, then emit
      // 'readable' now to make sure it gets picked up.
      if (state.length > 0)
        emitReadable(stream);
      else
        endReadable(stream);
    }
    
    // Don't emit readable right away in sync mode, because this can trigger
    // another read() call => stack overflow.  This way, it might trigger
    // a nextTick recursion warning, but that's not so bad.
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (state.emittedReadable)
        return;
    
      state.emittedReadable = true;
      if (state.sync)
        process.nextTick(function() {
          emitReadable_(stream);
        });
      else
        emitReadable_(stream);
    }
    
    function emitReadable_(stream) {
      stream.emit('readable');
    }
    
    
    // at this point, the user has presumably seen the 'readable' event,
    // and called read() to consume some data.  that may have triggered
    // in turn another _read(n) call, in which case reading = true if
    // it's in progress.
    // However, if we're not ended, or reading, and the length < hwm,
    // then go ahead and try to read some more preemptively.
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        process.nextTick(function() {
          maybeReadMore_(stream, state);
        });
      }
    }
    
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended &&
             state.length < state.highWaterMark) {
        stream.read(0);
        if (len === state.length)
          // didn't get any data, stop spinning.
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    
    // abstract method.  to be overridden in specific implementation classes.
    // call cb(er, data) where data is <= n in length.
    // for virtual (non-string, non-buffer) streams, "length" is somewhat
    // arbitrary, and perhaps not very meaningful.
    Readable.prototype._read = function(n) {
      this.emit('error', new Error('not implemented'));
    };
    
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
    
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
    
      var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
                  dest !== process.stdout &&
                  dest !== process.stderr;
    
      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted)
        process.nextTick(endFn);
      else
        src.once('end', endFn);
    
      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        if (readable !== src) return;
        cleanup();
      }
    
      function onend() {
        dest.end();
      }
    
      // when the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);
    
      function cleanup() {
        // cleanup event handlers once the pipe is broken
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
    
        // if the reader is waiting for a drain event from this
        // specific writer, then it would cause it to never start
        // flowing again.
        // So, if this is awaiting a drain, then we just call it now.
        // If we don't know, then assume that we are waiting for one.
        if (!dest._writableState || dest._writableState.needDrain)
          ondrain();
      }
    
      // if the dest has an error, then stop piping into it.
      // however, don't suppress the throwing behavior for this.
      function onerror(er) {
        unpipe();
        dest.removeListener('error', onerror);
        if (EE.listenerCount(dest, 'error') === 0)
          dest.emit('error', er);
      }
      // This is a brutally ugly hack to make sure that our error handler
      // is attached before any userland ones.  NEVER DO THIS.
      if (!dest._events || !dest._events.error)
        dest.on('error', onerror);
      else if (isArray(dest._events.error))
        dest._events.error.unshift(onerror);
      else
        dest._events.error = [onerror, dest._events.error];
    
    
    
      // Both close and finish should trigger unpipe, but only once.
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);
    
      function unpipe() {
        src.unpipe(dest);
      }
    
      // tell the dest that it's being piped to
      dest.emit('pipe', src);
    
      // start the flow if it hasn't been started already.
      if (!state.flowing) {
        // the handler that waits for readable events after all
        // the data gets sucked out in flow.
        // This would be easier to follow with a .once() handler
        // in flow(), but that is too slow.
        this.on('readable', pipeOnReadable);
    
        state.flowing = true;
        process.nextTick(function() {
          flow(src);
        });
      }
    
      return dest;
    };
    
    function pipeOnDrain(src) {
      return function() {
        var dest = this;
        var state = src._readableState;
        state.awaitDrain--;
        if (state.awaitDrain === 0)
          flow(src);
      };
    }
    
    function flow(src) {
      var state = src._readableState;
      var chunk;
      state.awaitDrain = 0;
    
      function write(dest, i, list) {
        var written = dest.write(chunk);
        if (false === written) {
          state.awaitDrain++;
        }
      }
    
      while (state.pipesCount && null !== (chunk = src.read())) {
    
        if (state.pipesCount === 1)
          write(state.pipes, 0, null);
        else
          forEach(state.pipes, write);
    
        src.emit('data', chunk);
    
        // if anyone needs a drain, then we have to wait for that.
        if (state.awaitDrain > 0)
          return;
      }
    
      // if every destination was unpiped, either before entering this
      // function, or in the while loop, then stop flowing.
      //
      // NB: This is a pretty rare edge case.
      if (state.pipesCount === 0) {
        state.flowing = false;
    
        // if there were data event listeners added, then switch to old mode.
        if (EE.listenerCount(src, 'data') > 0)
          emitDataEvents(src);
        return;
      }
    
      // at this point, no one needed a drain, so we just ran out of data
      // on the next readable event, start it over again.
      state.ranOut = true;
    }
    
    function pipeOnReadable() {
      if (this._readableState.ranOut) {
        this._readableState.ranOut = false;
        flow(this);
      }
    }
    
    
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
    
      // if we're not piping anywhere, then do nothing.
      if (state.pipesCount === 0)
        return this;
    
      // just one destination.  most common case.
      if (state.pipesCount === 1) {
        // passed in one, but it's not the right one.
        if (dest && dest !== state.pipes)
          return this;
    
        if (!dest)
          dest = state.pipes;
    
        // got a match.
        state.pipes = null;
        state.pipesCount = 0;
        this.removeListener('readable', pipeOnReadable);
        state.flowing = false;
        if (dest)
          dest.emit('unpipe', this);
        return this;
      }
    
      // slow case. multiple pipe destinations.
    
      if (!dest) {
        // remove all.
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        this.removeListener('readable', pipeOnReadable);
        state.flowing = false;
    
        for (var i = 0; i < len; i++)
          dests[i].emit('unpipe', this);
        return this;
      }
    
      // try to find the right one.
      var i = indexOf(state.pipes, dest);
      if (i === -1)
        return this;
    
      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
    
      dest.emit('unpipe', this);
    
      return this;
    };
    
    // set up data events if they are asked for
    // Ensure readable listeners eventually get something
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
    
      if (ev === 'data' && !this._readableState.flowing)
        emitDataEvents(this);
    
      if (ev === 'readable' && this.readable) {
        var state = this._readableState;
        if (!state.readableListening) {
          state.readableListening = true;
          state.emittedReadable = false;
          state.needReadable = true;
          if (!state.reading) {
            this.read(0);
          } else if (state.length) {
            emitReadable(this, state);
          }
        }
      }
    
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    
    // pause() and resume() are remnants of the legacy readable stream API
    // If the user uses them, then switch into old mode.
    Readable.prototype.resume = function() {
      emitDataEvents(this);
      this.read(0);
      this.emit('resume');
    };
    
    Readable.prototype.pause = function() {
      emitDataEvents(this, true);
      this.emit('pause');
    };
    
    function emitDataEvents(stream, startPaused) {
      var state = stream._readableState;
    
      if (state.flowing) {
        // https://github.com/isaacs/readable-stream/issues/16
        throw new Error('Cannot switch to old mode now.');
      }
    
      var paused = startPaused || false;
      var readable = false;
    
      // convert to an old-style stream.
      stream.readable = true;
      stream.pipe = Stream.prototype.pipe;
      stream.on = stream.addListener = Stream.prototype.on;
    
      stream.on('readable', function() {
        readable = true;
    
        var c;
        while (!paused && (null !== (c = stream.read())))
          stream.emit('data', c);
    
        if (c === null) {
          readable = false;
          stream._readableState.needReadable = true;
        }
      });
    
      stream.pause = function() {
        paused = true;
        this.emit('pause');
      };
    
      stream.resume = function() {
        paused = false;
        if (readable)
          process.nextTick(function() {
            stream.emit('readable');
          });
        else
          this.read(0);
        this.emit('resume');
      };
    
      // now make it start, just in case it hadn't already.
      stream.emit('readable');
    }
    
    // wrap an old-style stream as the async data source.
    // This is *not* part of the readable stream interface.
    // It is an ugly unfortunate mess of history.
    Readable.prototype.wrap = function(stream) {
      var state = this._readableState;
      var paused = false;
    
      var self = this;
      stream.on('end', function() {
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            self.push(chunk);
        }
    
        self.push(null);
      });
    
      stream.on('data', function(chunk) {
        if (state.decoder)
          chunk = state.decoder.write(chunk);
    
        // don't skip over falsy values in objectMode
        //if (state.objectMode && util.isNullOrUndefined(chunk))
        if (state.objectMode && (chunk === null || chunk === undefined))
          return;
        else if (!state.objectMode && (!chunk || !chunk.length))
          return;
    
        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
    
      // proxy all the other methods.
      // important when wrapping filters and duplexes.
      for (var i in stream) {
        if (typeof stream[i] === 'function' &&
            typeof this[i] === 'undefined') {
          this[i] = function(method) { return function() {
            return stream[method].apply(stream, arguments);
          }}(i);
        }
      }
    
      // proxy certain important events.
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function(ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });
    
      // when we try to consume some more bytes, simply unpause the
      // underlying stream.
      self._read = function(n) {
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
    
      return self;
    };
    
    
    
    // exposed for testing purposes only.
    Readable._fromList = fromList;
    
    // Pluck off n bytes from an array of buffers.
    // Length is the combined lengths of all the buffers in the list.
    function fromList(n, state) {
      var list = state.buffer;
      var length = state.length;
      var stringMode = !!state.decoder;
      var objectMode = !!state.objectMode;
      var ret;
    
      // nothing in the list, definitely empty.
      if (list.length === 0)
        return null;
    
      if (length === 0)
        ret = null;
      else if (objectMode)
        ret = list.shift();
      else if (!n || n >= length) {
        // read it all, truncate the array.
        if (stringMode)
          ret = list.join('');
        else
          ret = Buffer.concat(list, length);
        list.length = 0;
      } else {
        // read just some of it.
        if (n < list[0].length) {
          // just take a part of the first list item.
          // slice is the same for buffers and strings.
          var buf = list[0];
          ret = buf.slice(0, n);
          list[0] = buf.slice(n);
        } else if (n === list[0].length) {
          // first list is a perfect match
          ret = list.shift();
        } else {
          // complex case.
          // we have enough to cover it, but it spans past the first buffer.
          if (stringMode)
            ret = '';
          else
            ret = new Buffer(n);
    
          var c = 0;
          for (var i = 0, l = list.length; i < l && c < n; i++) {
            var buf = list[0];
            var cpy = Math.min(n - c, buf.length);
    
            if (stringMode)
              ret += buf.slice(0, cpy);
            else
              buf.copy(ret, c, 0, cpy);
    
            if (cpy < buf.length)
              list[0] = buf.slice(cpy);
            else
              list.shift();
    
            c += cpy;
          }
        }
      }
    
      return ret;
    }
    
    function endReadable(stream) {
      var state = stream._readableState;
    
      // If we get here before consuming all the bytes, then that is a
      // bug in node.  Should never happen.
      if (state.length > 0)
        throw new Error('endReadable called on non-empty stream');
    
      if (!state.endEmitted && state.calledRead) {
        state.ended = true;
        process.nextTick(function() {
          // Check that we didn't get one last unshift.
          if (!state.endEmitted && state.length === 0) {
            state.endEmitted = true;
            stream.readable = false;
            stream.emit('end');
          }
        });
      }
    }
    
    function forEach (xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    
    function indexOf (xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
      }
      return -1;
    }
    
  provide("readable-stream/lib/_stream_readable.js", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_writable.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // A bit simpler than readable streams.
    // Implement an async ._write(chunk, cb), and it'll handle all
    // the drain event emission and buffering.
    
    module.exports = Writable;
    
    /*<replacement>*/
    var Buffer = require('buffer').Buffer;
    /*</replacement>*/
    
    Writable.WritableState = WritableState;
    
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var Stream = require('stream');
    
    util.inherits(Writable, Stream);
    
    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
    }
    
    function WritableState(options, stream) {
      options = options || {};
    
      // the point at which write() starts returning false
      // Note: 0 is a valid value, means that we always return false if
      // the entire buffer is not flushed immediately on write()
      var hwm = options.highWaterMark;
      this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;
    
      // object stream flag to indicate whether or not this stream
      // contains buffers or objects.
      this.objectMode = !!options.objectMode;
    
      // cast to ints.
      this.highWaterMark = ~~this.highWaterMark;
    
      this.needDrain = false;
      // at the start of calling end()
      this.ending = false;
      // when end() has been called, and returned
      this.ended = false;
      // when 'finish' is emitted
      this.finished = false;
    
      // should we decode strings into buffers before passing to _write?
      // this is here so that some node-core streams can optimize string
      // handling at a lower level.
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
    
      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';
    
      // not an actual buffer we keep track of, but a measurement
      // of how much we're waiting to get pushed to some underlying
      // socket or file.
      this.length = 0;
    
      // a flag to see when we're in the middle of a write.
      this.writing = false;
    
      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, becuase any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;
    
      // a flag to know if we're processing previously buffered items, which
      // may call the _write() callback in the same tick, so that we don't
      // end up in an overlapped onwrite situation.
      this.bufferProcessing = false;
    
      // the callback that's passed to _write(chunk,cb)
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
    
      // the callback that the user supplies to write(chunk,encoding,cb)
      this.writecb = null;
    
      // the amount that is being written when _write is called.
      this.writelen = 0;
    
      this.buffer = [];
    
      // True if the error was already emitted and should not be thrown again
      this.errorEmitted = false;
    }
    
    function Writable(options) {
      var Duplex =  require('readable-stream/lib/_stream_duplex');
    
      // Writable ctor is applied to Duplexes, though they're not
      // instanceof Writable, they're instanceof Readable.
      if (!(this instanceof Writable) && !(this instanceof Duplex))
        return new Writable(options);
    
      this._writableState = new WritableState(options, this);
    
      // legacy.
      this.writable = true;
    
      Stream.call(this);
    }
    
    // Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function() {
      this.emit('error', new Error('Cannot pipe. Not readable.'));
    };
    
    
    function writeAfterEnd(stream, state, cb) {
      var er = new Error('write after end');
      // TODO: defer error events consistently everywhere, not just the cb
      stream.emit('error', er);
      process.nextTick(function() {
        cb(er);
      });
    }
    
    // If we get something that is not a buffer, string, null, or undefined,
    // and we're not in objectMode, then that's an error.
    // Otherwise stream chunks are all considered to be of length=1, and the
    // watermarks determine how many objects to keep in the buffer, rather than
    // how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      if (!Buffer.isBuffer(chunk) &&
          'string' !== typeof chunk &&
          chunk !== null &&
          chunk !== undefined &&
          !state.objectMode) {
        var er = new TypeError('Invalid non-string/buffer chunk');
        stream.emit('error', er);
        process.nextTick(function() {
          cb(er);
        });
        valid = false;
      }
      return valid;
    }
    
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
    
      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }
    
      if (Buffer.isBuffer(chunk))
        encoding = 'buffer';
      else if (!encoding)
        encoding = state.defaultEncoding;
    
      if (typeof cb !== 'function')
        cb = function() {};
    
      if (state.ended)
        writeAfterEnd(this, state, cb);
      else if (validChunk(this, state, chunk, cb))
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
    
      return ret;
    };
    
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode &&
          state.decodeStrings !== false &&
          typeof chunk === 'string') {
        chunk = new Buffer(chunk, encoding);
      }
      return chunk;
    }
    
    // if we're already writing something, then just put this
    // in the queue, and wait our turn.  Otherwise, call _write
    // If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);
      if (Buffer.isBuffer(chunk))
        encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;
    
      state.length += len;
    
      var ret = state.length < state.highWaterMark;
      // we must ensure that previous needDrain will not be reset to false.
      if (!ret)
        state.needDrain = true;
    
      if (state.writing)
        state.buffer.push(new WriteReq(chunk, encoding, cb));
      else
        doWrite(stream, state, len, chunk, encoding, cb);
    
      return ret;
    }
    
    function doWrite(stream, state, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    
    function onwriteError(stream, state, sync, er, cb) {
      if (sync)
        process.nextTick(function() {
          cb(er);
        });
      else
        cb(er);
    
      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }
    
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
    
      onwriteStateUpdate(state);
    
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        // Check if we're actually ready to finish, but don't emit yet
        var finished = needFinish(stream, state);
    
        if (!finished && !state.bufferProcessing && state.buffer.length)
          clearBuffer(stream, state);
    
        if (sync) {
          process.nextTick(function() {
            afterWrite(stream, state, finished, cb);
          });
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      cb();
      if (finished)
        finishMaybe(stream, state);
    }
    
    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }
    
    
    // if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
    
      for (var c = 0; c < state.buffer.length; c++) {
        var entry = state.buffer[c];
        var chunk = entry.chunk;
        var encoding = entry.encoding;
        var cb = entry.callback;
        var len = state.objectMode ? 1 : chunk.length;
    
        doWrite(stream, state, len, chunk, encoding, cb);
    
        // if we didn't call the onwrite immediately, then
        // it means that we need to wait until it does.
        // also, that means that the chunk and cb are currently
        // being processed, so move the buffer counter past them.
        if (state.writing) {
          c++;
          break;
        }
      }
    
      state.bufferProcessing = false;
      if (c < state.buffer.length)
        state.buffer = state.buffer.slice(c);
      else
        state.buffer.length = 0;
    }
    
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };
    
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
    
      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }
    
      if (typeof chunk !== 'undefined' && chunk !== null)
        this.write(chunk, encoding);
    
      // ignore unnecessary end() calls.
      if (!state.ending && !state.finished)
        endWritable(this, state, cb);
    };
    
    
    function needFinish(stream, state) {
      return (state.ending &&
              state.length === 0 &&
              !state.finished &&
              !state.writing);
    }
    
    function finishMaybe(stream, state) {
      var need = needFinish(stream, state);
      if (need) {
        state.finished = true;
        stream.emit('finish');
      }
      return need;
    }
    
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          process.nextTick(cb);
        else
          stream.once('finish', cb);
      }
      state.ended = true;
    }
    
  provide("readable-stream/lib/_stream_writable.js", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_duplex.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // a duplex stream is just a stream that is both readable and writable.
    // Since JS doesn't have multiple prototypal inheritance, this class
    // prototypally inherits from Readable, and then parasitically from
    // Writable.
    
    module.exports = Duplex;
    
    /*<replacement>*/
    var objectKeys = Object.keys || function (obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    }
    /*</replacement>*/
    
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    var Readable =  require('readable-stream/lib/_stream_readable');
    var Writable =  require('readable-stream/lib/_stream_writable');
    
    util.inherits(Duplex, Readable);
    
    forEach(objectKeys(Writable.prototype), function(method) {
      if (!Duplex.prototype[method])
        Duplex.prototype[method] = Writable.prototype[method];
    });
    
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
    
      Readable.call(this, options);
      Writable.call(this, options);
    
      if (options && options.readable === false)
        this.readable = false;
    
      if (options && options.writable === false)
        this.writable = false;
    
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
    
      this.once('end', onend);
    }
    
    // the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended)
        return;
    
      // no more data can be written.
      // But allow more writes to happen in this tick.
      process.nextTick(this.end.bind(this));
    }
    
    function forEach (xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }
    
  provide("readable-stream/lib/_stream_duplex.js", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_transform.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    
    // a transform stream is a readable/writable stream where you do
    // something with the data.  Sometimes it's called a "filter",
    // but that's not a great name for it, since that implies a thing where
    // some bits pass through, and others are simply ignored.  (That would
    // be a valid example of a transform, of course.)
    //
    // While the output is causally related to the input, it's not a
    // necessarily symmetric or synchronous transformation.  For example,
    // a zlib stream might take multiple plain-text writes(), and then
    // emit a single compressed chunk some time in the future.
    //
    // Here's how this works:
    //
    // The Transform stream has all the aspects of the readable and writable
    // stream classes.  When you write(chunk), that calls _write(chunk,cb)
    // internally, and returns false if there's a lot of pending writes
    // buffered up.  When you call read(), that calls _read(n) until
    // there's enough pending readable data buffered up.
    //
    // In a transform stream, the written data is placed in a buffer.  When
    // _read(n) is called, it transforms the queued up data, calling the
    // buffered _write cb's as it consumes chunks.  If consuming a single
    // written chunk would result in multiple output chunks, then the first
    // outputted bit calls the readcb, and subsequent chunks just go into
    // the read buffer, and will cause it to emit 'readable' if necessary.
    //
    // This way, back-pressure is actually determined by the reading side,
    // since _read has to be called to start processing a new chunk.  However,
    // a pathological inflate type of transform can cause excessive buffering
    // here.  For example, imagine a stream where every byte of input is
    // interpreted as an integer from 0-255, and then results in that many
    // bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
    // 1kb of data being output.  In this case, you could write a very small
    // amount of input, and end up with a very large amount of output.  In
    // such a pathological inflating mechanism, there'd be no way to tell
    // the system to stop doing the transform.  A single 4MB write could
    // cause the system to run out of memory.
    //
    // However, even in such a pathological case, only a single written chunk
    // would be consumed, and then the rest would wait (un-transformed) until
    // the results of the previous transformed chunk were consumed.
    
    module.exports = Transform;
    
    var Duplex =  require('readable-stream/lib/_stream_duplex');
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    util.inherits(Transform, Duplex);
    
    
    function TransformState(options, stream) {
      this.afterTransform = function(er, data) {
        return afterTransform(stream, er, data);
      };
    
      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
    }
    
    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;
    
      var cb = ts.writecb;
    
      if (!cb)
        return stream.emit('error', new Error('no writecb in Transform class'));
    
      ts.writechunk = null;
      ts.writecb = null;
    
      if (data !== null && data !== undefined)
        stream.push(data);
    
      if (cb)
        cb(er);
    
      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    
    
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
    
      Duplex.call(this, options);
    
      var ts = this._transformState = new TransformState(options, this);
    
      // when the writable side finishes, then flush out anything remaining.
      var stream = this;
    
      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;
    
      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;
    
      this.once('finish', function() {
        if ('function' === typeof this._flush)
          this._flush(function(er) {
            done(stream, er);
          });
        else
          done(stream);
      });
    }
    
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    
    // This is the part where you do stuff!
    // override this function in implementation classes.
    // 'chunk' is an input chunk.
    //
    // Call `push(newChunk)` to pass along transformed output
    // to the readable side.  You may call 'push' zero or more times.
    //
    // Call `cb(err)` when you are done with this chunk.  If you pass
    // an error, then that'll put the hurt on the whole operation.  If you
    // never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error('not implemented');
    };
    
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform ||
            rs.needReadable ||
            rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    
    // Doesn't matter what the args are here.
    // _transform does all the work.
    // That we got here means that the readable side wants more data.
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
    
      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };
    
    
    function done(stream, er) {
      if (er)
        return stream.emit('error', er);
    
      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var rs = stream._readableState;
      var ts = stream._transformState;
    
      if (ws.length)
        throw new Error('calling transform done when ws.length != 0');
    
      if (ts.transforming)
        throw new Error('calling transform done when still transforming');
    
      return stream.push(null);
    }
    
  provide("readable-stream/lib/_stream_transform.js", module.exports);
}(global));

// pakmanager:readable-stream/lib/_stream_passthrough.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.
    
    // a passthrough stream.
    // basically just the most minimal sort of Transform stream.
    // Every written chunk gets output as-is.
    
    module.exports = PassThrough;
    
    var Transform =  require('readable-stream/lib/_stream_transform');
    
    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/
    
    util.inherits(PassThrough, Transform);
    
    function PassThrough(options) {
      if (!(this instanceof PassThrough))
        return new PassThrough(options);
    
      Transform.call(this, options);
    }
    
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
    
  provide("readable-stream/lib/_stream_passthrough.js", module.exports);
}(global));

// pakmanager:readable-stream
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
    exports = module.exports =  require('readable-stream/lib/_stream_readable.js');
    exports.Stream = Stream;
    exports.Readable = exports;
    exports.Writable =  require('readable-stream/lib/_stream_writable.js');
    exports.Duplex =  require('readable-stream/lib/_stream_duplex.js');
    exports.Transform =  require('readable-stream/lib/_stream_transform.js');
    exports.PassThrough =  require('readable-stream/lib/_stream_passthrough.js');
    
  provide("readable-stream", module.exports);
}(global));

// pakmanager:ascii-table
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports =   require('ascii-table')
  provide("ascii-table", module.exports);
}(global));

// pakmanager:htmlstrip-native
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  var binding ;
    try {
    	binding = require('./build/Release/htmlstrip.node')
    } catch(e){
    	binding = require('./build/Debug/htmlstrip.node')
    }
    
    
    module.exports.html_strip = function(html,options){
    	var input;
    	if (typeof html == 'string'){
    		input = new Buffer(html,'utf-16le');
    	} else if (html instanceof Buffer){
    		input = html;
    	} else {
    		input = new Buffer(html.toString(),'utf-16le');
    	}
    
    	var buf = binding.html_strip(input, input.length, options);
    	return buf.toString('utf-16le',0,buf._charsWritten*2);
    }
    
    module.exports.html_strip_with_hints = function(html,options){
    	var input;
    	if (typeof html == 'string'){
    		input = new Buffer(html,'utf-16le');
    	} else if (html instanceof Buffer){
    		input = html;
    	} else {
    		input = new Buffer(html.toString(),'utf-16le');
    	}
    
    	var buf = binding.html_strip(input, input.length, options);
    	return {
    		text: buf.toString('utf-16le',0,buf._charsWritten*2),
    		hints: buf.tag_hints
    	};
    }
    
    module.exports.html_entities_decode = function(html){
    	var input;
    	if (typeof html == 'string'){
    		input = new Buffer(html,'utf-16le');
    	} else if (html instanceof Buffer){
    		input = html;
    	} else {
    		input = new Buffer(html.toString(),'utf-16le');
    	}
    
    	var buf = binding.html_entities_decode(input, input.length);
    	return buf.toString('utf-16le',0,buf._charsWritten*2);
    }
    
    module.exports.accented_chars_norm = function(html){
    	var input;
    	if (typeof html == 'string'){
    		input = new Buffer(html,'utf-16le');
    	} else if (html instanceof Buffer){
    		input = html;
    	} else {
    		input = new Buffer(html.toString(),'utf-16le');
    	}
    
    	var buf = binding.accented_chars_norm(input, input.length);
    	return buf.toString('utf-16le',0,buf._charsWritten*2);
    }
    
    module.exports.accented_chars_strip = function(html){
    	var input;
    	if (typeof html == 'string'){
    		input = new Buffer(html,'utf-16le');
    	} else if (html instanceof Buffer){
    		input = html;
    	} else {
    		input = new Buffer(html.toString(),'utf-16le');
    	}
    
    	var buf = binding.accented_chars_strip(input, input.length);
    	return buf.toString('utf-16le',0,buf._charsWritten*2);
    }
    
  provide("htmlstrip-native", module.exports);
}(global));

// pakmanager:superagent/lib/node/utils
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var StringDecoder = require('string_decoder').StringDecoder;
    var Stream = require('stream');
    var zlib;
    
    /**
     * Require zlib module for Node 0.6+
     */
    
    try {
      zlib = require('zlib');
    } catch (e) { }
    
    /**
     * Return the mime type for the given `str`.
     *
     * @param {String} str
     * @return {String}
     * @api private
     */
    
    exports.type = function(str){
      return str.split(/ *; */).shift();
    };
    
    /**
     * Return header field parameters.
     *
     * @param {String} str
     * @return {Object}
     * @api private
     */
    
    exports.params = function(str){
      return str.split(/ *; */).reduce(function(obj, str){
        var parts = str.split(/ *= */);
        var key = parts.shift();
        var val = parts.shift();
    
        if (key && val) obj[key] = val;
        return obj;
      }, {});
    };
    
    /**
     * Parse Link header fields.
     *
     * @param {String} str
     * @return {Object}
     * @api private
     */
    
    exports.parseLinks = function(str){
      return str.split(/ *, */).reduce(function(obj, str){
        var parts = str.split(/ *; */);
        var url = parts[0].slice(1, -1);
        var rel = parts[1].split(/ *= */)[1].slice(1, -1);
        obj[rel] = url;
        return obj;
      }, {});
    };
    
    /**
     * Buffers response data events and re-emits when they're unzipped.
     *
     * @param {Request} req
     * @param {Response} res
     * @api private
     */
    
    exports.unzip = function(req, res){
      if (!zlib) return;
    
      var unzip = zlib.createUnzip();
      var stream = new Stream;
      var decoder;
    
      // make node responseOnEnd() happy
      stream.req = req;
    
      unzip.on('error', function(err){
        stream.emit('error', err);
      });
    
      // pipe to unzip
      res.pipe(unzip);
    
      // override `setEncoding` to capture encoding
      res.setEncoding = function(type){
        decoder = new StringDecoder(type);
      };
    
      // decode upon decompressing with captured encoding
      unzip.on('data', function(buf){
        if (decoder) {
          var str = decoder.write(buf);
          if (str.length) stream.emit('data', str);
        } else {
          stream.emit('data', buf);
        }
      });
    
      unzip.on('end', function(){
        stream.emit('end');
      });
    
      // override `on` to capture data listeners
      var _on = res.on;
      res.on = function(type, fn){
        if ('data' == type || 'end' == type) {
          stream.on(type, fn);
        } else if ('error' == type) {
          stream.on(type, fn);
          _on.call(res, type, fn);
        } else {
          _on.call(res, type, fn);
        }
      };
    };
    
    /**
     * Strip content related fields from `header`.
     *
     * @param {Object} header
     * @return {Object} header
     * @api private
     */
    
    exports.cleanHeader = function(header){
      delete header['content-type'];
      delete header['content-length'];
      delete header['transfer-encoding'];
      delete header['cookie'];
      delete header['host'];
      return header;
    };
    
  provide("superagent/lib/node/utils", module.exports);
}(global));

// pakmanager:superagent/lib/node/parsers/urlencoded
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var qs = require('qs');
    
    module.exports = function(res, fn){
      res.text = '';
      res.setEncoding('ascii');
      res.on('data', function(chunk){ res.text += chunk; });
      res.on('end', function(){
        try {
          fn(null, qs.parse(res.text));
        } catch (err) {
          fn(err);
        }
      });
    };
  provide("superagent/lib/node/parsers/urlencoded", module.exports);
}(global));

// pakmanager:superagent/lib/node/parsers/json
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    module.exports = function parseJSON(res, fn){
      res.text = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk){ res.text += chunk;});
      res.on('end', function(){
        try {
          var text = res.text && res.text.replace(/^\s*|\s*$/g, '');
          var body = text && JSON.parse(text);
        } catch (e) {
          var err = e;
        } finally {
          fn(err, body);
        }
      });
    };
    
  provide("superagent/lib/node/parsers/json", module.exports);
}(global));

// pakmanager:superagent/lib/node/parsers/text
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    module.exports = function(res, fn){
      res.text = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk){ res.text += chunk; });
      res.on('end', fn);
    };
  provide("superagent/lib/node/parsers/text", module.exports);
}(global));

// pakmanager:superagent/lib/node/parsers/image
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  module.exports = function(res, fn){
      var data = []; // Binary data needs binary storage
    
      res.on('data', function(chunk){
          data.push(chunk);
      });
      res.on('end', function () {
          fn(null, Buffer.concat(data));
      });
    };
  provide("superagent/lib/node/parsers/image", module.exports);
}(global));

// pakmanager:superagent/lib/node/response
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var util = require('util');
    var utils =  require('superagent/lib/node/utils');
    var Stream = require('stream');
    
    /**
     * Expose `Response`.
     */
    
    module.exports = Response;
    
    /**
     * Initialize a new `Response` with the given `xhr`.
     *
     *  - set flags (.ok, .error, etc)
     *  - parse header
     *
     * @param {Request} req
     * @param {Object} options
     * @constructor
     * @extends {Stream}
     * @implements {ReadableStream}
     * @api private
     */
    
    function Response(req, options) {
      Stream.call(this);
      options = options || {};
      var res = this.res = req.res;
      this.request = req;
      this.req = req.req;
      this.links = {};
      this.text = res.text;
      this.body = res.body !== undefined ? res.body : {};
      this.files = res.files || {};
      this.buffered = 'string' == typeof this.text;
      this.header = this.headers = res.headers;
      this.setStatusProperties(res.statusCode);
      this.setHeaderProperties(this.header);
      this.setEncoding = res.setEncoding.bind(res);
      res.on('data', this.emit.bind(this, 'data'));
      res.on('end', this.emit.bind(this, 'end'));
      res.on('close', this.emit.bind(this, 'close'));
      res.on('error', this.emit.bind(this, 'error'));
    }
    
    /**
     * Inherit from `Stream`.
     */
    
    util.inherits(Response, Stream);
    
    /**
     * Get case-insensitive `field` value.
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    
    Response.prototype.get = function(field){
      return this.header[field.toLowerCase()];
    };
    
    /**
     * Implements methods of a `ReadableStream`
     */
    
    Response.prototype.destroy = function(err){
      this.res.destroy(err);
    };
    
    /**
     * Pause.
     */
    
    Response.prototype.pause = function(){
      this.res.pause();
    };
    
    /**
     * Resume.
     */
    
    Response.prototype.resume = function(){
      this.res.resume();
    };
    
    /**
     * Return an `Error` representative of this response.
     *
     * @return {Error}
     * @api public
     */
    
    Response.prototype.toError = function(){
      var req = this.req;
      var method = req.method;
      var path = req.path;
    
      var msg = 'cannot ' + method + ' ' + path + ' (' + this.status + ')';
      var err = new Error(msg);
      err.status = this.status;
      err.text = this.text;
      err.method = method;
      err.path = path;
    
      return err;
    };
    
    /**
     * Set header related properties:
     *
     *   - `.type` the content type without params
     *
     * A response of "Content-Type: text/plain; charset=utf-8"
     * will provide you with a `.type` of "text/plain".
     *
     * @param {Object} header
     * @api private
     */
    
    Response.prototype.setHeaderProperties = function(header){
      // TODO: moar!
      // TODO: make this a util
    
      // content-type
      var ct = this.header['content-type'] || '';
    
      // params
      var params = utils.params(ct);
      for (var key in params) this[key] = params[key];
    
      this.type = utils.type(ct);
    
      // links
      try {
        if (header.link) this.links = utils.parseLinks(header.link);
      } catch (err) {
        // ignore
      }
    };
    
    /**
     * Parse cookies from the header into an array.
     */
    
    function parseCookies(header) {
      return Array.isArray(header)
        ? header.map(Cookie.parse)
        : [Cookie.parse(header)];
    }
    
    /**
     * Set flags such as `.ok` based on `status`.
     *
     * For example a 2xx response will give you a `.ok` of __true__
     * whereas 5xx will be __false__ and `.error` will be __true__. The
     * `.clientError` and `.serverError` are also available to be more
     * specific, and `.statusType` is the class of error ranging from 1..5
     * sometimes useful for mapping respond colors etc.
     *
     * "sugar" properties are also defined for common cases. Currently providing:
     *
     *   - .noContent
     *   - .badRequest
     *   - .unauthorized
     *   - .notAcceptable
     *   - .notFound
     *
     * @param {Number} status
     * @api private
     */
    
    Response.prototype.setStatusProperties = function(status){
      var type = status / 100 | 0;
    
      // status / class
      this.status = this.statusCode = status;
      this.statusType = type;
    
      // basics
      this.info = 1 == type;
      this.ok = 2 == type;
      this.redirect = 3 == type;
      this.clientError = 4 == type;
      this.serverError = 5 == type;
      this.error = (4 == type || 5 == type)
        ? this.toError()
        : false;
    
      // sugar
      this.accepted = 202 == status;
      this.noContent = 204 == status;
      this.badRequest = 400 == status;
      this.unauthorized = 401 == status;
      this.notAcceptable = 406 == status;
      this.forbidden = 403 == status;
      this.notFound = 404 == status;
    };
    
    /**
     * To json.
     *
     * @return {Object}
     * @api public
     */
    
    Response.prototype.toJSON = function(){
      return {
        req: this.request.toJSON(),
        header: this.header,
        status: this.status,
        text: this.text
      };
    };
    
  provide("superagent/lib/node/response", module.exports);
}(global));

// pakmanager:superagent/lib/node/part
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var util = require('util');
    var mime = require('mime');
    var FormData = require('form-data');
    var PassThrough = require('readable-stream/passthrough');
    
    /**
     * Initialize a new `Part` for the given `req`.
     *
     * @param {Request} req
     * @api public
     * @deprecated pass a readable stream in to `Request#attach()` instead
     */
    
    var Part = function (req) {
      PassThrough.call(this);
      this._req = req;
      this._attached = false;
      this._name = null;
      this._type = null;
      this._header = null;
      this._filename = null;
    
      this.once('pipe', this._attach.bind(this));
    };
    Part = util.deprecate(Part, 'The `Part()` constructor is deprecated. ' +
       'Pass a readable stream in to `Request#attach()` instead.');
    
    /**
     * Inherit from `PassThrough`.
     */
    
    util.inherits(Part, PassThrough);
    
    /**
     * Expose `Part`.
     */
    
    module.exports = Part;
    
    /**
     * Set header `field` to `val`.
     *
     * @param {String} field
     * @param {String} val
     * @return {Part} for chaining
     * @api public
     */
    
    Part.prototype.set = function(field, val){
      //if (!this._header) this._header = {};
      //this._header[field] = val;
      //return this;
      throw new TypeError('setting custom form-data part headers is unsupported');
    };
    
    /**
     * Set _Content-Type_ response header passed through `mime.lookup()`.
     *
     * Examples:
     *
     *     res.type('html');
     *     res.type('.html');
     *
     * @param {String} type
     * @return {Part} for chaining
     * @api public
     */
    
    Part.prototype.type = function(type){
      var lookup = mime.lookup(type);
      this._type = lookup;
      //this.set('Content-Type', lookup);
      return this;
    };
    
    /**
     * Set the "name" portion for the _Content-Disposition_ header field.
     *
     * @param {String} name
     * @return {Part} for chaining
     * @api public
     */
    
    Part.prototype.name = function(name){
      this._name = name;
      return this;
    };
    
    /**
     * Set _Content-Disposition_ header field to _attachment_ with `filename`
     * and field `name`.
     *
     * @param {String} name
     * @param {String} filename
     * @return {Part} for chaining
     * @api public
     */
    
    Part.prototype.attachment = function(name, filename){
      this.name(name);
      if (filename) {
        this.type(filename);
        this._filename = filename;
      }
      return this;
    };
    
    /**
     * Calls `FormData#append()` on the Request instance's FormData object.
     *
     * Gets called implicitly upon the first `write()` call, or the "pipe" event.
     *
     * @api private
     */
    
    Part.prototype._attach = function(){
      if (this._attached) return;
      this._attached = true;
    
      if (!this._name) throw new Error('must call `Part#name()` first!');
    
      // add `this` Stream's readable side as a stream for this Part
      if (!this._req._formData) this._req._formData = new FormData();
      this._req._formData.append(this._name, this, {
        contentType: this._type,
        filename: this._filename
      });
    
      // restore PassThrough's default `write()` function now that we're setup
      this.write = PassThrough.prototype.write;
    };
    
    /**
     * Write `data` with `encoding`.
     *
     * @param {Buffer|String} data
     * @param {String} encoding
     * @return {Boolean}
     * @api public
     */
    
    Part.prototype.write = function(){
      this._attach();
      return this.write.apply(this, arguments);
    };
    
  provide("superagent/lib/node/part", module.exports);
}(global));

// pakmanager:superagent/lib/node/parsers
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    exports['application/x-www-form-urlencoded'] =  require('superagent/lib/node/parsers/urlencoded');
    exports['application/json'] =  require('superagent/lib/node/parsers/json');
    exports.text =  require('superagent/lib/node/parsers/text');
    exports.image =  require('superagent/lib/node/parsers/image');
    
  provide("superagent/lib/node/parsers", module.exports);
}(global));

// pakmanager:superagent/lib/node/index
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var debug = require('debug')('superagent');
    var formidable = require('formidable');
    var FormData = require('form-data');
    var Response =  require('superagent/lib/node/response');
    var parse = require('url').parse;
    var format = require('url').format;
    var resolve = require('url').resolve;
    var methods = require('methods');
    var Stream = require('stream');
    var utils =  require('superagent/lib/node/utils');
    var extend = require('extend');
    var Part =  require('superagent/lib/node/part');
    var mime = require('mime');
    var https = require('https');
    var http = require('http');
    var fs = require('fs');
    var qs = require('qs');
    var zlib = require('zlib');
    var util = require('util');
    var pkg = require('../../package.json');
    
    /**
     * Expose the request function.
     */
    
    exports = module.exports = request;
    
    /**
     * Expose the agent function
     */
    
    exports.agent =  require('superagent/lib/node/agent');
    
    /**
     * Expose `Part`.
     */
    
    exports.Part = Part;
    
    /**
     * Noop.
     */
    
    function noop(){};
    
    /**
     * Expose `Response`.
     */
    
    exports.Response = Response;
    
    /**
     * Define "form" mime type.
     */
    
    mime.define({
      'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
    });
    
    /**
     * Protocol map.
     */
    
    exports.protocols = {
      'http:': http,
      'https:': https
    };
    
    /**
     * Check if `obj` is an object.
     *
     * @param {Object} obj
     * @return {Boolean}
     * @api private
     */
    
    function isObject(obj) {
      return null != obj && 'object' == typeof obj;
    }
    
    /**
     * Default serialization map.
     *
     *     superagent.serialize['application/xml'] = function(obj){
     *       return 'generated xml here';
     *     };
     *
     */
    
    exports.serialize = {
      'application/x-www-form-urlencoded': qs.stringify,
      'application/json': JSON.stringify
    };
    
    /**
     * Default parsers.
     *
     *     superagent.parse['application/xml'] = function(res, fn){
     *       fn(null, result);
     *     };
     *
     */
    
    exports.parse =  require('superagent/lib/node/parsers');
    
    /**
     * Initialize a new `Request` with the given `method` and `url`.
     *
     * @param {String} method
     * @param {String|Object} url
     * @api public
     */
    
    function Request(method, url) {
      Stream.call(this);
      var self = this;
      if ('string' != typeof url) url = format(url);
      this._agent = false;
      this._formData = null;
      this.method = method;
      this.url = url;
      this.header = {};
      this.writable = true;
      this._redirects = 0;
      this.redirects(5);
      this.cookies = '';
      this.qs = {};
      this.qsRaw = [];
      this._redirectList = [];
      this.on('end', this.clearTimeout.bind(this));
    }
    
    /**
     * Inherit from `Stream`.
     */
    
    util.inherits(Request, Stream);
    
    /**
     * Write the field `name` and `val` for "multipart/form-data"
     * request bodies.
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .field('foo', 'bar')
     *   .end(callback);
     * ```
     *
     * @param {String} name
     * @param {String|Buffer|fs.ReadStream} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.field = function(name, val){
      debug('field', name, val);
      if (!this._formData) this._formData = new FormData();
      this._formData.append(name, val);
      return this;
    };
    
    /**
     * Queue the given `file` as an attachment to the specified `field`,
     * with optional `filename`.
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .attach(new Buffer('<b>Hello world</b>'), 'hello.html')
     *   .end(callback);
     * ```
     *
     * A filename may also be used:
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .attach('files', 'image.jpg')
     *   .end(callback);
     * ```
     *
     * @param {String} field
     * @param {String|fs.ReadStream|Buffer} file
     * @param {String} filename
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.attach = function(field, file, filename){
      if (!this._formData) this._formData = new FormData();
      if ('string' == typeof file) {
        if (!filename) filename = file;
        debug('creating `fs.ReadStream` instance for file: %s', file);
        file = fs.createReadStream(file);
      }
      this._formData.append(field, file, { filename: filename });
      return this;
    };
    
    /**
     * Set the max redirects to `n`.
     *
     * @param {Number} n
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.redirects = function(n){
      debug('max redirects %s', n);
      this._maxRedirects = n;
      return this;
    };
    
    /**
     * Return a new `Part` for this request.
     *
     * @return {Part}
     * @api public
     * @deprecated pass a readable stream in to `Request#attach()` instead
     */
    
    Request.prototype.part = util.deprecate(function(){
      return new Part(this);
    }, '`Request#part()` is deprecated. ' +
       'Pass a readable stream in to `Request#attach()` instead.');
    
    /**
     * Gets/sets the `Agent` to use for this HTTP request. The default (if this
     * function is not called) is to opt out of connection pooling (`agent: false`).
     *
     * @param {http.Agent} agent
     * @return {http.Agent}
     * @api public
     */
    
    Request.prototype.agent = function(agent){
      if (!arguments.length) return this._agent;
      this._agent = agent;
      return this;
    };
    
    /**
     * Set header `field` to `val`, or multiple fields with one object.
     *
     * Examples:
     *
     *      req.get('/')
     *        .set('Accept', 'application/json')
     *        .set('X-API-Key', 'foobar')
     *        .end(callback);
     *
     *      req.get('/')
     *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
     *        .end(callback);
     *
     * @param {String|Object} field
     * @param {String} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.set = function(field, val){
      if (isObject(field)) {
        for (var key in field) {
          this.set(key, field[key]);
        }
        return this;
      }
    
      debug('set %s "%s"', field, val);
      this.request().setHeader(field, val);
      return this;
    };
    
    /**
     * Remove header `field`.
     *
     * Example:
     *
     *      req.get('/')
     *        .unset('User-Agent')
     *        .end(callback);
     *
     * @param {String} field
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.unset = function(field){
      debug('unset %s', field);
      this.request().removeHeader(field);
      return this;
    };
    
    /**
     * Get request header `field`.
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    
    Request.prototype.get = function(field){
      return this.request().getHeader(field);
    };
    
    /**
     * Set _Content-Type_ response header passed through `mime.lookup()`.
     *
     * Examples:
     *
     *      request.post('/')
     *        .type('xml')
     *        .send(xmlstring)
     *        .end(callback);
     *
     *      request.post('/')
     *        .type('json')
     *        .send(jsonstring)
     *        .end(callback);
     *
     *      request.post('/')
     *        .type('application/json')
     *        .send(jsonstring)
     *        .end(callback);
     *
     * @param {String} type
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.type = function(type){
      return this.set('Content-Type', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
    };
    
    /**
     * Set _Accept_ response header passed through `mime.lookup()`.
     *
     * Examples:
     *
     *      superagent.types.json = 'application/json';
     *
     *      request.get('/agent')
     *        .accept('json')
     *        .end(callback);
     *
     *      request.get('/agent')
     *        .accept('application/json')
     *        .end(callback);
     *
     * @param {String} accept
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.accept = function(type){
      return this.set('Accept', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
    };
    
    /**
     * Add query-string `val`.
     *
     * Examples:
     *
     *   request.get('/shoes')
     *     .query('size=10')
     *     .query({ color: 'blue' })
     *
     * @param {Object|String} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.query = function(val){
      if ('string' == typeof val) {
        this.qsRaw.push(val);
        return this;
      }
    
      extend(this.qs, val);
      return this;
    };
    
    /**
     * Send `data`, defaulting the `.type()` to "json" when
     * an object is given.
     *
     * Examples:
     *
     *       // manual json
     *       request.post('/user')
     *         .type('json')
     *         .send('{"name":"tj"}')
     *         .end(callback)
     *
     *       // auto json
     *       request.post('/user')
     *         .send({ name: 'tj' })
     *         .end(callback)
     *
     *       // manual x-www-form-urlencoded
     *       request.post('/user')
     *         .type('form')
     *         .send('name=tj')
     *         .end(callback)
     *
     *       // auto x-www-form-urlencoded
     *       request.post('/user')
     *         .type('form')
     *         .send({ name: 'tj' })
     *         .end(callback)
     *
     *       // string defaults to x-www-form-urlencoded
     *       request.post('/user')
     *         .send('name=tj')
     *         .send('foo=bar')
     *         .send('bar=baz')
     *         .end(callback)
     *
     * @param {String|Object} data
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.send = function(data){
      var obj = isObject(data);
      var req = this.request();
      var type = req.getHeader('Content-Type');
    
      // merge
      if (obj && isObject(this._data)) {
        for (var key in data) {
          this._data[key] = data[key];
        }
      // string
      } else if ('string' == typeof data) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = req.getHeader('Content-Type');
    
        // concat &
        if ('application/x-www-form-urlencoded' == type) {
          this._data = this._data
            ? this._data + '&' + data
            : data;
        } else {
          this._data = (this._data || '') + data;
        }
      } else {
        this._data = data;
      }
    
      if (!obj) return this;
    
      // default to json
      if (!type) this.type('json');
      return this;
    };
    
    /**
     * Write raw `data` / `encoding` to the socket.
     *
     * @param {Buffer|String} data
     * @param {String} encoding
     * @return {Boolean}
     * @api public
     */
    
    Request.prototype.write = function(data, encoding){
      return this.request().write(data, encoding);
    };
    
    /**
     * Pipe the request body to `stream`.
     *
     * @param {Stream} stream
     * @param {Object} options
     * @return {Stream}
     * @api public
     */
    
    Request.prototype.pipe = function(stream, options){
      this.piped = true; // HACK...
      this.buffer(false);
      var self = this;
      this.end().req.on('response', function(res){
        // redirect
        var redirect = isRedirect(res.statusCode);
        if (redirect && self._redirects++ != self._maxRedirects) {
          return self.redirect(res).pipe(stream, options);
        }
    
        if (/^(deflate|gzip)$/.test(res.headers['content-encoding'])) {
          res.pipe(zlib.createUnzip()).pipe(stream, options);
        } else {
          res.pipe(stream, options);
        }
        res.on('end', function(){
          self.emit('end');
        });
      });
      return stream;
    };
    
    /**
     * Enable / disable buffering.
     *
     * @return {Boolean} [val]
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.buffer = function(val){
      this._buffer = false === val
        ? false
        : true;
      return this;
    };
    
    /**
     * Set timeout to `ms`.
     *
     * @param {Number} ms
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.timeout = function(ms){
      this._timeout = ms;
      return this;
    };
    
    /**
     * Clear previous timeout.
     *
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.clearTimeout = function(){
      debug('clear timeout %s %s', this.method, this.url);
      this._timeout = 0;
      clearTimeout(this._timer);
      return this;
    };
    
    /**
     * Abort and clear timeout.
     *
     * @api public
     */
    
    Request.prototype.abort = function(){
      debug('abort %s %s', this.method, this.url);
      this._aborted = true;
      this.clearTimeout();
      this.req.abort();
      this.emit('abort');
    };
    
    /**
     * Define the parser to be used for this response.
     *
     * @param {Function} fn
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.parse = function(fn){
      this._parser = fn;
      return this;
    };
    
    /**
     * Redirect to `url
     *
     * @param {IncomingMessage} res
     * @return {Request} for chaining
     * @api private
     */
    
    Request.prototype.redirect = function(res){
      var url = res.headers.location;
      if (!url) {
        return this.callback(new Error('No location header for redirect'), res);
      }
    
      debug('redirect %s -> %s', this.url, url);
    
      // location
      url = resolve(this.url, url);
    
      // ensure the response is being consumed
      // this is required for Node v0.10+
      res.resume();
    
      var headers = this.req._headers;
    
      // implementation of 302 following defacto standard
      if (res.statusCode == 301 || res.statusCode == 302){
        // strip Content-* related fields
        // in case of POST etc
        headers = utils.cleanHeader(this.req._headers);
    
        // force GET
        this.method = 'HEAD' == this.method
          ? 'HEAD'
          : 'GET';
    
        // clear data
        this._data = null;
      }
      // 303 is always GET
      if (res.statusCode == 303) {
        // force method
        this.method = 'GET';
        // clear data
        this._data = null;
      }
      // 307 preserves method
    
      delete this.req;
    
      // redirect
      this.url = url;
      this._redirectList.push(url);
      this.emit('redirect', res);
      this.qs = {};
      this.set(headers);
      this.end(this._callback);
      return this;
    };
    
    /**
     * Set Authorization field value with `user` and `pass`.
     *
     * Examples:
     *
     *   .auth('tobi', 'learnboost')
     *   .auth('tobi:learnboost')
     *   .auth('tobi')
     *
     * @param {String} user
     * @param {String} pass
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.auth = function(user, pass){
      if (1 === arguments.length) pass = '';
      if (!~user.indexOf(':')) user = user + ':';
      var str = new Buffer(user + pass).toString('base64');
      return this.set('Authorization', 'Basic ' + str);
    };
    
    /**
     * Set the certificate authority option for https request.
     *
     * @param {Buffer | Array} cert
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.ca = function(cert){
      this._ca = cert;
      return this;
    };
    
    /**
     * Allow for extension
     */
    
    Request.prototype.use = function(fn) {
      fn(this);
      return this;
    };
    
    /**
     * Return an http[s] request.
     *
     * @return {OutgoingMessage}
     * @api private
     */
    
    Request.prototype.request = function(){
      if (this.req) return this.req;
    
      var self = this;
      var options = {};
      var data = this._data;
      var url = this.url;
    
      // default to http://
      if (0 != url.indexOf('http')) url = 'http://' + url;
      url = parse(url, true);
    
      // options
      options.method = this.method;
      options.port = url.port;
      options.path = url.pathname;
      options.host = url.hostname;
      options.ca = this._ca;
      options.agent = this._agent;
    
      // initiate request
      var mod = exports.protocols[url.protocol];
    
      // request
      var req = this.req = mod.request(options);
      if ('HEAD' != options.method) req.setHeader('Accept-Encoding', 'gzip, deflate');
      this.protocol = url.protocol;
      this.host = url.host;
    
      // expose events
      req.on('drain', function(){ self.emit('drain'); });
    
      req.on('error', function(err){
        // flag abortion here for out timeouts
        // because node will emit a faux-error "socket hang up"
        // when request is aborted before a connection is made
        if (self._aborted) return;
        self.callback(err);
      });
    
      // auth
      if (url.auth) {
        var auth = url.auth.split(':');
        this.auth(auth[0], auth[1]);
      }
    
      // query
      this.query(url.query);
    
      // add cookies
      if (this.cookies) req.setHeader('Cookie', this.cookies);
    
      // set default UA
      req.setHeader('User-Agent', 'node-superagent/' + pkg.version);
    
      return req;
    };
    
    /**
     * Invoke the callback with `err` and `res`
     * and handle arity check.
     *
     * @param {Error} err
     * @param {Response} res
     * @api private
     */
    
    Request.prototype.callback = function(err, res){
      var fn = this._callback;
      this.clearTimeout();
      if (this.called) return console.warn('double callback!');
      this.called = true;
    
      if (err) {
        err.response = res;
      }
    
      // only emit error event if there is a listener
      // otherwise we assume the callback to `.end()` will get the error
      if (err && this.listeners('error').length > 0) this.emit('error', err);
    
      if (err) {
        return fn(err, res);
      }
    
      if (res && res.status >= 200 && res.status < 300) {
        return fn(err, res);
      }
    
      var msg = 'Unsuccessful HTTP response';
      if (res) {
        msg = http.STATUS_CODES[res.status] || msg;
      }
      var new_err = new Error(msg);
      new_err.original = err;
      new_err.response = res;
      new_err.status = (res) ? res.status : undefined;
    
      fn(err || new_err, res);
    };
    
    /**
     * Initiate request, invoking callback `fn(err, res)`
     * with an instanceof `Response`.
     *
     * @param {Function} fn
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.end = function(fn){
      var self = this;
      var data = this._data;
      var req = this.request();
      var buffer = this._buffer;
      var method = this.method;
      var timeout = this._timeout;
      debug('%s %s', this.method, this.url);
    
      // store callback
      this._callback = fn || noop;
    
      // querystring
      try {
        var querystring = qs.stringify(this.qs, { indices: false });
        querystring += ((querystring.length && this.qsRaw.length) ? '&' : '') + this.qsRaw.join('&');
        req.path += querystring.length
          ? (~req.path.indexOf('?') ? '&' : '?') + querystring
          : '';
      } catch (e) {
        return this.callback(e);
      }
    
      // timeout
      if (timeout && !this._timer) {
        debug('timeout %sms %s %s', timeout, this.method, this.url);
        this._timer = setTimeout(function(){
          var err = new Error('timeout of ' + timeout + 'ms exceeded');
          err.timeout = timeout;
          err.code = 'ECONNABORTED';
          self.abort();
          self.callback(err);
        }, timeout);
      }
    
      // body
      if ('HEAD' != method && !req._headerSent) {
        // serialize stuff
        if ('string' != typeof data) {
          var contentType = req.getHeader('Content-Type')
          // Parse out just the content type from the header (ignore the charset)
          if (contentType) contentType = contentType.split(';')[0]
          var serialize = exports.serialize[contentType];
          if (serialize) data = serialize(data);
        }
    
        // content-length
        if (data && !req.getHeader('Content-Length')) {
          this.set('Content-Length', Buffer.byteLength(data));
        }
      }
    
      // response
      req.on('response', function(res){
        debug('%s %s -> %s', self.method, self.url, res.statusCode);
        var max = self._maxRedirects;
        var mime = utils.type(res.headers['content-type'] || '') || 'text/plain';
        var len = res.headers['content-length'];
        var type = mime.split('/');
        var subtype = type[1];
        var type = type[0];
        var multipart = 'multipart' == type;
        var redirect = isRedirect(res.statusCode);
        var parser = self._parser;
    
        self.res = res;
    
        if ('HEAD' == self.method) {
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          self.emit('end');
          return;
        }
    
        if (self.piped) {
          return;
        }
    
        // redirect
        if (redirect && self._redirects++ != max) {
          return self.redirect(res);
        }
    
        // zlib support
        if (/^(deflate|gzip)$/.test(res.headers['content-encoding'])) {
          utils.unzip(req, res);
        }
    
        // don't buffer multipart
        if (multipart) buffer = false;
    
        // TODO: make all parsers take callbacks
        if (!parser && multipart) {
          var form = new formidable.IncomingForm;
    
          form.parse(res, function(err, fields, files){
            if (err) return self.callback(err);
            var response = new Response(self);
            self.response = response;
            response.body = fields;
            response.files = files;
            response.redirects = self._redirectList;
            self.emit('end');
            self.callback(null, response);
          });
          return;
        }
    
        // check for images, one more special treatment
        if (!parser && isImage(mime)) {
          exports.parse.image(res, function(err, obj){
            if (err) return self.callback(err);
            var response = new Response(self);
            self.response = response;
            response.body = obj;
            response.redirects = self._redirectList;
            self.emit('end');
            self.callback(null, response);
          });
          return;
        }
    
        // by default only buffer text/*, json and messed up thing from hell
        if (null == buffer && isText(mime) || isJSON(mime)) buffer = true;
    
        // parser
        var parse = 'text' == type
          ? exports.parse.text
          : exports.parse[mime];
    
        // everyone wants their own white-labeled json
        if (isJSON(mime)) parse = exports.parse['application/json'];
    
        // buffered response
        if (buffer) parse = parse || exports.parse.text;
    
        // explicit parser
        if (parser) parse = parser;
    
        // parse
        if (parse) {
          try {
            parse(res, function(err, obj){
              if (err) self.callback(err);
              res.body = obj;
            });
          } catch (err) {
            self.callback(err);
            return;
          }
        }
    
        // unbuffered
        if (!buffer) {
          debug('unbuffered %s %s', self.method, self.url);
          self.res = res;
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          if (multipart) return // allow multipart to handle end event
          res.on('end', function(){
            debug('end %s %s', self.method, self.url);
            self.emit('end');
          })
          return;
        }
    
        // end event
        self.res = res;
        res.on('end', function(){
          debug('end %s %s', self.method, self.url);
          // TODO: unless buffering emit earlier to stream
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          self.emit('end');
        });
      });
    
      this.emit('request', this);
    
      // if a FormData instance got created, then we send that as the request body
      var formData = this._formData;
      if (formData) {
    
        // set headers
        var headers = formData.getHeaders();
        for (var i in headers) {
          debug('setting FormData header: "%s: %s"', i, headers[i]);
          req.setHeader(i, headers[i]);
        }
    
        // attempt to get "Content-Length" header
        formData.getLength(function(err, length) {
          // TODO: Add chunked encoding when no length (if err)
    
          debug('got FormData Content-Length: %s', length);
          if ('number' == typeof length) {
            req.setHeader('Content-Length', length);
          }
    
          formData.pipe(req);
        });
      } else {
        req.end(data);
      }
    
      return this;
    };
    
    /**
     * To json.
     *
     * @return {Object}
     * @api public
     */
    
    Request.prototype.toJSON = function(){
      return {
        method: this.method,
        url: this.url,
        data: this._data
      };
    };
    
    /**
     * Expose `Request`.
     */
    
    exports.Request = Request;
    
    /**
     * Issue a request:
     *
     * Examples:
     *
     *    request('GET', '/users').end(callback)
     *    request('/users').end(callback)
     *    request('/users', callback)
     *
     * @param {String} method
     * @param {String|Function} url or callback
     * @return {Request}
     * @api public
     */
    
    function request(method, url) {
      // callback
      if ('function' == typeof url) {
        return new Request('GET', method).end(url);
      }
    
      // url first
      if (1 == arguments.length) {
        return new Request('GET', method);
      }
    
      return new Request(method, url);
    }
    
    // generate HTTP verb methods
    
    methods.forEach(function(method){
      var name = 'delete' == method ? 'del' : method;
      method = method.toUpperCase();
      request[name] = function(url, data, fn){
        var req = request(method, url);
        if ('function' == typeof data) fn = data, data = null;
        if (data) req.send(data);
        fn && req.end(fn);
        return req;
      };
    });
    
    /**
     * Check if `mime` is text and should be buffered.
     *
     * @param {String} mime
     * @return {Boolean}
     * @api public
     */
    
    function isText(mime) {
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
    
      return 'text' == type
        || 'x-www-form-urlencoded' == subtype;
    }
    
    /**
     * Check if `mime` is image
     *
     * @param {String} mime
     * @return {Boolean}
     * @api public
     */
    
    function isImage(mime) {
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
    
      return 'image' == type;
    }
    
    /**
     * Check if `mime` is json or has +json structured syntax suffix.
     *
     * @param {String} mime
     * @return {Boolean}
     * @api private
     */
    
    function isJSON(mime) {
      if (!mime) return false;
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
      return subtype && subtype.match(/json/i);
    }
    
    /**
     * Check if we should follow the redirect `code`.
     *
     * @param {Number} code
     * @return {Boolean}
     * @api private
     */
    
    function isRedirect(code) {
      return ~[301, 302, 303, 305, 307].indexOf(code);
    }
    
  provide("superagent/lib/node/index", module.exports);
}(global));

// pakmanager:superagent/lib/node/agent
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var CookieJar = require('cookiejar').CookieJar;
    var CookieAccess = require('cookiejar').CookieAccessInfo;
    var parse = require('url').parse;
    var request =  require('superagent/lib/node/index');
    var methods = require('methods');
    
    /**
     * Expose `Agent`.
     */
    
    module.exports = Agent;
    
    /**
     * Initialize a new `Agent`.
     *
     * @api public
     */
    
    function Agent(options) {
      if (!(this instanceof Agent)) return new Agent(options);
      if (options) this._ca = options.ca;
      this.jar = new CookieJar;
    }
    
    /**
     * Save the cookies in the given `res` to
     * the agent's cookie jar for persistence.
     *
     * @param {Response} res
     * @api private
     */
    
    Agent.prototype.saveCookies = function(res){
      var cookies = res.headers['set-cookie'];
      if (cookies) this.jar.setCookies(cookies);
    };
    
    /**
     * Attach cookies when available to the given `req`.
     *
     * @param {Request} req
     * @api private
     */
    
    Agent.prototype.attachCookies = function(req){
      var url = parse(req.url);
      var access = CookieAccess(url.hostname, url.pathname, 'https:' == url.protocol);
      var cookies = this.jar.getCookies(access).toValueString();
      req.cookies = cookies;
    };
    
    // generate HTTP verb methods
    
    methods.forEach(function(method){
      var name = 'delete' == method ? 'del' : method;
    
      method = method.toUpperCase();
      Agent.prototype[name] = function(url, fn){
        var req = request(method, url);
        req.ca(this._ca);
    
        req.on('response', this.saveCookies.bind(this));
        req.on('redirect', this.saveCookies.bind(this));
        req.on('redirect', this.attachCookies.bind(this, req));
        this.attachCookies(req);
    
        fn && req.end(fn);
        return req;
      };
    });
    
  provide("superagent/lib/node/agent", module.exports);
}(global));

// pakmanager:superagent
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
    /**
     * Module dependencies.
     */
    
    var debug = require('debug')('superagent');
    var formidable = require('formidable');
    var FormData = require('form-data');
    var Response =  require('superagent/lib/node/response');
    var parse = require('url').parse;
    var format = require('url').format;
    var resolve = require('url').resolve;
    var methods = require('methods');
    var Stream = require('stream');
    var utils =  require('superagent/lib/node/utils');
    var extend = require('extend');
    var Part =  require('superagent/lib/node/part');
    var mime = require('mime');
    var https = require('https');
    var http = require('http');
    var fs = require('fs');
    var qs = require('qs');
    var zlib = require('zlib');
    var util = require('util');
    var pkg = require('../../package.json');
    
    /**
     * Expose the request function.
     */
    
    exports = module.exports = request;
    
    /**
     * Expose the agent function
     */
    
    exports.agent =  require('superagent/lib/node/agent');
    
    /**
     * Expose `Part`.
     */
    
    exports.Part = Part;
    
    /**
     * Noop.
     */
    
    function noop(){};
    
    /**
     * Expose `Response`.
     */
    
    exports.Response = Response;
    
    /**
     * Define "form" mime type.
     */
    
    mime.define({
      'application/x-www-form-urlencoded': ['form', 'urlencoded', 'form-data']
    });
    
    /**
     * Protocol map.
     */
    
    exports.protocols = {
      'http:': http,
      'https:': https
    };
    
    /**
     * Check if `obj` is an object.
     *
     * @param {Object} obj
     * @return {Boolean}
     * @api private
     */
    
    function isObject(obj) {
      return null != obj && 'object' == typeof obj;
    }
    
    /**
     * Default serialization map.
     *
     *     superagent.serialize['application/xml'] = function(obj){
     *       return 'generated xml here';
     *     };
     *
     */
    
    exports.serialize = {
      'application/x-www-form-urlencoded': qs.stringify,
      'application/json': JSON.stringify
    };
    
    /**
     * Default parsers.
     *
     *     superagent.parse['application/xml'] = function(res, fn){
     *       fn(null, result);
     *     };
     *
     */
    
    exports.parse =  require('superagent/lib/node/parsers');
    
    /**
     * Initialize a new `Request` with the given `method` and `url`.
     *
     * @param {String} method
     * @param {String|Object} url
     * @api public
     */
    
    function Request(method, url) {
      Stream.call(this);
      var self = this;
      if ('string' != typeof url) url = format(url);
      this._agent = false;
      this._formData = null;
      this.method = method;
      this.url = url;
      this.header = {};
      this.writable = true;
      this._redirects = 0;
      this.redirects(5);
      this.cookies = '';
      this.qs = {};
      this.qsRaw = [];
      this._redirectList = [];
      this.on('end', this.clearTimeout.bind(this));
    }
    
    /**
     * Inherit from `Stream`.
     */
    
    util.inherits(Request, Stream);
    
    /**
     * Write the field `name` and `val` for "multipart/form-data"
     * request bodies.
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .field('foo', 'bar')
     *   .end(callback);
     * ```
     *
     * @param {String} name
     * @param {String|Buffer|fs.ReadStream} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.field = function(name, val){
      debug('field', name, val);
      if (!this._formData) this._formData = new FormData();
      this._formData.append(name, val);
      return this;
    };
    
    /**
     * Queue the given `file` as an attachment to the specified `field`,
     * with optional `filename`.
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .attach(new Buffer('<b>Hello world</b>'), 'hello.html')
     *   .end(callback);
     * ```
     *
     * A filename may also be used:
     *
     * ``` js
     * request.post('http://localhost/upload')
     *   .attach('files', 'image.jpg')
     *   .end(callback);
     * ```
     *
     * @param {String} field
     * @param {String|fs.ReadStream|Buffer} file
     * @param {String} filename
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.attach = function(field, file, filename){
      if (!this._formData) this._formData = new FormData();
      if ('string' == typeof file) {
        if (!filename) filename = file;
        debug('creating `fs.ReadStream` instance for file: %s', file);
        file = fs.createReadStream(file);
      }
      this._formData.append(field, file, { filename: filename });
      return this;
    };
    
    /**
     * Set the max redirects to `n`.
     *
     * @param {Number} n
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.redirects = function(n){
      debug('max redirects %s', n);
      this._maxRedirects = n;
      return this;
    };
    
    /**
     * Return a new `Part` for this request.
     *
     * @return {Part}
     * @api public
     * @deprecated pass a readable stream in to `Request#attach()` instead
     */
    
    Request.prototype.part = util.deprecate(function(){
      return new Part(this);
    }, '`Request#part()` is deprecated. ' +
       'Pass a readable stream in to `Request#attach()` instead.');
    
    /**
     * Gets/sets the `Agent` to use for this HTTP request. The default (if this
     * function is not called) is to opt out of connection pooling (`agent: false`).
     *
     * @param {http.Agent} agent
     * @return {http.Agent}
     * @api public
     */
    
    Request.prototype.agent = function(agent){
      if (!arguments.length) return this._agent;
      this._agent = agent;
      return this;
    };
    
    /**
     * Set header `field` to `val`, or multiple fields with one object.
     *
     * Examples:
     *
     *      req.get('/')
     *        .set('Accept', 'application/json')
     *        .set('X-API-Key', 'foobar')
     *        .end(callback);
     *
     *      req.get('/')
     *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
     *        .end(callback);
     *
     * @param {String|Object} field
     * @param {String} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.set = function(field, val){
      if (isObject(field)) {
        for (var key in field) {
          this.set(key, field[key]);
        }
        return this;
      }
    
      debug('set %s "%s"', field, val);
      this.request().setHeader(field, val);
      return this;
    };
    
    /**
     * Remove header `field`.
     *
     * Example:
     *
     *      req.get('/')
     *        .unset('User-Agent')
     *        .end(callback);
     *
     * @param {String} field
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.unset = function(field){
      debug('unset %s', field);
      this.request().removeHeader(field);
      return this;
    };
    
    /**
     * Get request header `field`.
     *
     * @param {String} field
     * @return {String}
     * @api public
     */
    
    Request.prototype.get = function(field){
      return this.request().getHeader(field);
    };
    
    /**
     * Set _Content-Type_ response header passed through `mime.lookup()`.
     *
     * Examples:
     *
     *      request.post('/')
     *        .type('xml')
     *        .send(xmlstring)
     *        .end(callback);
     *
     *      request.post('/')
     *        .type('json')
     *        .send(jsonstring)
     *        .end(callback);
     *
     *      request.post('/')
     *        .type('application/json')
     *        .send(jsonstring)
     *        .end(callback);
     *
     * @param {String} type
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.type = function(type){
      return this.set('Content-Type', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
    };
    
    /**
     * Set _Accept_ response header passed through `mime.lookup()`.
     *
     * Examples:
     *
     *      superagent.types.json = 'application/json';
     *
     *      request.get('/agent')
     *        .accept('json')
     *        .end(callback);
     *
     *      request.get('/agent')
     *        .accept('application/json')
     *        .end(callback);
     *
     * @param {String} accept
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.accept = function(type){
      return this.set('Accept', ~type.indexOf('/')
        ? type
        : mime.lookup(type));
    };
    
    /**
     * Add query-string `val`.
     *
     * Examples:
     *
     *   request.get('/shoes')
     *     .query('size=10')
     *     .query({ color: 'blue' })
     *
     * @param {Object|String} val
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.query = function(val){
      if ('string' == typeof val) {
        this.qsRaw.push(val);
        return this;
      }
    
      extend(this.qs, val);
      return this;
    };
    
    /**
     * Send `data`, defaulting the `.type()` to "json" when
     * an object is given.
     *
     * Examples:
     *
     *       // manual json
     *       request.post('/user')
     *         .type('json')
     *         .send('{"name":"tj"}')
     *         .end(callback)
     *
     *       // auto json
     *       request.post('/user')
     *         .send({ name: 'tj' })
     *         .end(callback)
     *
     *       // manual x-www-form-urlencoded
     *       request.post('/user')
     *         .type('form')
     *         .send('name=tj')
     *         .end(callback)
     *
     *       // auto x-www-form-urlencoded
     *       request.post('/user')
     *         .type('form')
     *         .send({ name: 'tj' })
     *         .end(callback)
     *
     *       // string defaults to x-www-form-urlencoded
     *       request.post('/user')
     *         .send('name=tj')
     *         .send('foo=bar')
     *         .send('bar=baz')
     *         .end(callback)
     *
     * @param {String|Object} data
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.send = function(data){
      var obj = isObject(data);
      var req = this.request();
      var type = req.getHeader('Content-Type');
    
      // merge
      if (obj && isObject(this._data)) {
        for (var key in data) {
          this._data[key] = data[key];
        }
      // string
      } else if ('string' == typeof data) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = req.getHeader('Content-Type');
    
        // concat &
        if ('application/x-www-form-urlencoded' == type) {
          this._data = this._data
            ? this._data + '&' + data
            : data;
        } else {
          this._data = (this._data || '') + data;
        }
      } else {
        this._data = data;
      }
    
      if (!obj) return this;
    
      // default to json
      if (!type) this.type('json');
      return this;
    };
    
    /**
     * Write raw `data` / `encoding` to the socket.
     *
     * @param {Buffer|String} data
     * @param {String} encoding
     * @return {Boolean}
     * @api public
     */
    
    Request.prototype.write = function(data, encoding){
      return this.request().write(data, encoding);
    };
    
    /**
     * Pipe the request body to `stream`.
     *
     * @param {Stream} stream
     * @param {Object} options
     * @return {Stream}
     * @api public
     */
    
    Request.prototype.pipe = function(stream, options){
      this.piped = true; // HACK...
      this.buffer(false);
      var self = this;
      this.end().req.on('response', function(res){
        // redirect
        var redirect = isRedirect(res.statusCode);
        if (redirect && self._redirects++ != self._maxRedirects) {
          return self.redirect(res).pipe(stream, options);
        }
    
        if (/^(deflate|gzip)$/.test(res.headers['content-encoding'])) {
          res.pipe(zlib.createUnzip()).pipe(stream, options);
        } else {
          res.pipe(stream, options);
        }
        res.on('end', function(){
          self.emit('end');
        });
      });
      return stream;
    };
    
    /**
     * Enable / disable buffering.
     *
     * @return {Boolean} [val]
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.buffer = function(val){
      this._buffer = false === val
        ? false
        : true;
      return this;
    };
    
    /**
     * Set timeout to `ms`.
     *
     * @param {Number} ms
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.timeout = function(ms){
      this._timeout = ms;
      return this;
    };
    
    /**
     * Clear previous timeout.
     *
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.clearTimeout = function(){
      debug('clear timeout %s %s', this.method, this.url);
      this._timeout = 0;
      clearTimeout(this._timer);
      return this;
    };
    
    /**
     * Abort and clear timeout.
     *
     * @api public
     */
    
    Request.prototype.abort = function(){
      debug('abort %s %s', this.method, this.url);
      this._aborted = true;
      this.clearTimeout();
      this.req.abort();
      this.emit('abort');
    };
    
    /**
     * Define the parser to be used for this response.
     *
     * @param {Function} fn
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.parse = function(fn){
      this._parser = fn;
      return this;
    };
    
    /**
     * Redirect to `url
     *
     * @param {IncomingMessage} res
     * @return {Request} for chaining
     * @api private
     */
    
    Request.prototype.redirect = function(res){
      var url = res.headers.location;
      if (!url) {
        return this.callback(new Error('No location header for redirect'), res);
      }
    
      debug('redirect %s -> %s', this.url, url);
    
      // location
      url = resolve(this.url, url);
    
      // ensure the response is being consumed
      // this is required for Node v0.10+
      res.resume();
    
      var headers = this.req._headers;
    
      // implementation of 302 following defacto standard
      if (res.statusCode == 301 || res.statusCode == 302){
        // strip Content-* related fields
        // in case of POST etc
        headers = utils.cleanHeader(this.req._headers);
    
        // force GET
        this.method = 'HEAD' == this.method
          ? 'HEAD'
          : 'GET';
    
        // clear data
        this._data = null;
      }
      // 303 is always GET
      if (res.statusCode == 303) {
        // force method
        this.method = 'GET';
        // clear data
        this._data = null;
      }
      // 307 preserves method
    
      delete this.req;
    
      // redirect
      this.url = url;
      this._redirectList.push(url);
      this.emit('redirect', res);
      this.qs = {};
      this.set(headers);
      this.end(this._callback);
      return this;
    };
    
    /**
     * Set Authorization field value with `user` and `pass`.
     *
     * Examples:
     *
     *   .auth('tobi', 'learnboost')
     *   .auth('tobi:learnboost')
     *   .auth('tobi')
     *
     * @param {String} user
     * @param {String} pass
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.auth = function(user, pass){
      if (1 === arguments.length) pass = '';
      if (!~user.indexOf(':')) user = user + ':';
      var str = new Buffer(user + pass).toString('base64');
      return this.set('Authorization', 'Basic ' + str);
    };
    
    /**
     * Set the certificate authority option for https request.
     *
     * @param {Buffer | Array} cert
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.ca = function(cert){
      this._ca = cert;
      return this;
    };
    
    /**
     * Allow for extension
     */
    
    Request.prototype.use = function(fn) {
      fn(this);
      return this;
    };
    
    /**
     * Return an http[s] request.
     *
     * @return {OutgoingMessage}
     * @api private
     */
    
    Request.prototype.request = function(){
      if (this.req) return this.req;
    
      var self = this;
      var options = {};
      var data = this._data;
      var url = this.url;
    
      // default to http://
      if (0 != url.indexOf('http')) url = 'http://' + url;
      url = parse(url, true);
    
      // options
      options.method = this.method;
      options.port = url.port;
      options.path = url.pathname;
      options.host = url.hostname;
      options.ca = this._ca;
      options.agent = this._agent;
    
      // initiate request
      var mod = exports.protocols[url.protocol];
    
      // request
      var req = this.req = mod.request(options);
      if ('HEAD' != options.method) req.setHeader('Accept-Encoding', 'gzip, deflate');
      this.protocol = url.protocol;
      this.host = url.host;
    
      // expose events
      req.on('drain', function(){ self.emit('drain'); });
    
      req.on('error', function(err){
        // flag abortion here for out timeouts
        // because node will emit a faux-error "socket hang up"
        // when request is aborted before a connection is made
        if (self._aborted) return;
        self.callback(err);
      });
    
      // auth
      if (url.auth) {
        var auth = url.auth.split(':');
        this.auth(auth[0], auth[1]);
      }
    
      // query
      this.query(url.query);
    
      // add cookies
      if (this.cookies) req.setHeader('Cookie', this.cookies);
    
      // set default UA
      req.setHeader('User-Agent', 'node-superagent/' + pkg.version);
    
      return req;
    };
    
    /**
     * Invoke the callback with `err` and `res`
     * and handle arity check.
     *
     * @param {Error} err
     * @param {Response} res
     * @api private
     */
    
    Request.prototype.callback = function(err, res){
      var fn = this._callback;
      this.clearTimeout();
      if (this.called) return console.warn('double callback!');
      this.called = true;
    
      if (err) {
        err.response = res;
      }
    
      // only emit error event if there is a listener
      // otherwise we assume the callback to `.end()` will get the error
      if (err && this.listeners('error').length > 0) this.emit('error', err);
    
      if (err) {
        return fn(err, res);
      }
    
      if (res && res.status >= 200 && res.status < 300) {
        return fn(err, res);
      }
    
      var msg = 'Unsuccessful HTTP response';
      if (res) {
        msg = http.STATUS_CODES[res.status] || msg;
      }
      var new_err = new Error(msg);
      new_err.original = err;
      new_err.response = res;
      new_err.status = (res) ? res.status : undefined;
    
      fn(err || new_err, res);
    };
    
    /**
     * Initiate request, invoking callback `fn(err, res)`
     * with an instanceof `Response`.
     *
     * @param {Function} fn
     * @return {Request} for chaining
     * @api public
     */
    
    Request.prototype.end = function(fn){
      var self = this;
      var data = this._data;
      var req = this.request();
      var buffer = this._buffer;
      var method = this.method;
      var timeout = this._timeout;
      debug('%s %s', this.method, this.url);
    
      // store callback
      this._callback = fn || noop;
    
      // querystring
      try {
        var querystring = qs.stringify(this.qs, { indices: false });
        querystring += ((querystring.length && this.qsRaw.length) ? '&' : '') + this.qsRaw.join('&');
        req.path += querystring.length
          ? (~req.path.indexOf('?') ? '&' : '?') + querystring
          : '';
      } catch (e) {
        return this.callback(e);
      }
    
      // timeout
      if (timeout && !this._timer) {
        debug('timeout %sms %s %s', timeout, this.method, this.url);
        this._timer = setTimeout(function(){
          var err = new Error('timeout of ' + timeout + 'ms exceeded');
          err.timeout = timeout;
          err.code = 'ECONNABORTED';
          self.abort();
          self.callback(err);
        }, timeout);
      }
    
      // body
      if ('HEAD' != method && !req._headerSent) {
        // serialize stuff
        if ('string' != typeof data) {
          var contentType = req.getHeader('Content-Type')
          // Parse out just the content type from the header (ignore the charset)
          if (contentType) contentType = contentType.split(';')[0]
          var serialize = exports.serialize[contentType];
          if (serialize) data = serialize(data);
        }
    
        // content-length
        if (data && !req.getHeader('Content-Length')) {
          this.set('Content-Length', Buffer.byteLength(data));
        }
      }
    
      // response
      req.on('response', function(res){
        debug('%s %s -> %s', self.method, self.url, res.statusCode);
        var max = self._maxRedirects;
        var mime = utils.type(res.headers['content-type'] || '') || 'text/plain';
        var len = res.headers['content-length'];
        var type = mime.split('/');
        var subtype = type[1];
        var type = type[0];
        var multipart = 'multipart' == type;
        var redirect = isRedirect(res.statusCode);
        var parser = self._parser;
    
        self.res = res;
    
        if ('HEAD' == self.method) {
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          self.emit('end');
          return;
        }
    
        if (self.piped) {
          return;
        }
    
        // redirect
        if (redirect && self._redirects++ != max) {
          return self.redirect(res);
        }
    
        // zlib support
        if (/^(deflate|gzip)$/.test(res.headers['content-encoding'])) {
          utils.unzip(req, res);
        }
    
        // don't buffer multipart
        if (multipart) buffer = false;
    
        // TODO: make all parsers take callbacks
        if (!parser && multipart) {
          var form = new formidable.IncomingForm;
    
          form.parse(res, function(err, fields, files){
            if (err) return self.callback(err);
            var response = new Response(self);
            self.response = response;
            response.body = fields;
            response.files = files;
            response.redirects = self._redirectList;
            self.emit('end');
            self.callback(null, response);
          });
          return;
        }
    
        // check for images, one more special treatment
        if (!parser && isImage(mime)) {
          exports.parse.image(res, function(err, obj){
            if (err) return self.callback(err);
            var response = new Response(self);
            self.response = response;
            response.body = obj;
            response.redirects = self._redirectList;
            self.emit('end');
            self.callback(null, response);
          });
          return;
        }
    
        // by default only buffer text/*, json and messed up thing from hell
        if (null == buffer && isText(mime) || isJSON(mime)) buffer = true;
    
        // parser
        var parse = 'text' == type
          ? exports.parse.text
          : exports.parse[mime];
    
        // everyone wants their own white-labeled json
        if (isJSON(mime)) parse = exports.parse['application/json'];
    
        // buffered response
        if (buffer) parse = parse || exports.parse.text;
    
        // explicit parser
        if (parser) parse = parser;
    
        // parse
        if (parse) {
          try {
            parse(res, function(err, obj){
              if (err) self.callback(err);
              res.body = obj;
            });
          } catch (err) {
            self.callback(err);
            return;
          }
        }
    
        // unbuffered
        if (!buffer) {
          debug('unbuffered %s %s', self.method, self.url);
          self.res = res;
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          if (multipart) return // allow multipart to handle end event
          res.on('end', function(){
            debug('end %s %s', self.method, self.url);
            self.emit('end');
          })
          return;
        }
    
        // end event
        self.res = res;
        res.on('end', function(){
          debug('end %s %s', self.method, self.url);
          // TODO: unless buffering emit earlier to stream
          var response = new Response(self);
          self.response = response;
          response.redirects = self._redirectList;
          self.emit('response', response);
          self.callback(null, response);
          self.emit('end');
        });
      });
    
      this.emit('request', this);
    
      // if a FormData instance got created, then we send that as the request body
      var formData = this._formData;
      if (formData) {
    
        // set headers
        var headers = formData.getHeaders();
        for (var i in headers) {
          debug('setting FormData header: "%s: %s"', i, headers[i]);
          req.setHeader(i, headers[i]);
        }
    
        // attempt to get "Content-Length" header
        formData.getLength(function(err, length) {
          // TODO: Add chunked encoding when no length (if err)
    
          debug('got FormData Content-Length: %s', length);
          if ('number' == typeof length) {
            req.setHeader('Content-Length', length);
          }
    
          formData.pipe(req);
        });
      } else {
        req.end(data);
      }
    
      return this;
    };
    
    /**
     * To json.
     *
     * @return {Object}
     * @api public
     */
    
    Request.prototype.toJSON = function(){
      return {
        method: this.method,
        url: this.url,
        data: this._data
      };
    };
    
    /**
     * Expose `Request`.
     */
    
    exports.Request = Request;
    
    /**
     * Issue a request:
     *
     * Examples:
     *
     *    request('GET', '/users').end(callback)
     *    request('/users').end(callback)
     *    request('/users', callback)
     *
     * @param {String} method
     * @param {String|Function} url or callback
     * @return {Request}
     * @api public
     */
    
    function request(method, url) {
      // callback
      if ('function' == typeof url) {
        return new Request('GET', method).end(url);
      }
    
      // url first
      if (1 == arguments.length) {
        return new Request('GET', method);
      }
    
      return new Request(method, url);
    }
    
    // generate HTTP verb methods
    
    methods.forEach(function(method){
      var name = 'delete' == method ? 'del' : method;
      method = method.toUpperCase();
      request[name] = function(url, data, fn){
        var req = request(method, url);
        if ('function' == typeof data) fn = data, data = null;
        if (data) req.send(data);
        fn && req.end(fn);
        return req;
      };
    });
    
    /**
     * Check if `mime` is text and should be buffered.
     *
     * @param {String} mime
     * @return {Boolean}
     * @api public
     */
    
    function isText(mime) {
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
    
      return 'text' == type
        || 'x-www-form-urlencoded' == subtype;
    }
    
    /**
     * Check if `mime` is image
     *
     * @param {String} mime
     * @return {Boolean}
     * @api public
     */
    
    function isImage(mime) {
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
    
      return 'image' == type;
    }
    
    /**
     * Check if `mime` is json or has +json structured syntax suffix.
     *
     * @param {String} mime
     * @return {Boolean}
     * @api private
     */
    
    function isJSON(mime) {
      if (!mime) return false;
      var parts = mime.split('/');
      var type = parts[0];
      var subtype = parts[1];
      return subtype && subtype.match(/json/i);
    }
    
    /**
     * Check if we should follow the redirect `code`.
     *
     * @param {Number} code
     * @return {Boolean}
     * @api private
     */
    
    function isRedirect(code) {
      return ~[301, 302, 303, 305, 307].indexOf(code);
    }
    
  provide("superagent", module.exports);
}(global));

// pakmanager:shitty-mta
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  #!/usr/bin/env node
    
    "use strict";
    
    var Http  = require('superagent');
    var Table = require('ascii-table');
    var Strip = require('htmlstrip-native');
    
    var table;
    
    function fetchStatuses() {
      Http.get('http://www.mta.info/service_status_json')
        .end(function(err, resp) {
        createTable();
        JSON.parse(resp.body).subway.line.forEach(function(line) {
          pushToTable(line);
        });
        process.stdout.write(table.toString());
      });
    }
    
    function createTable() {
      table = new Table('Shitty MTA');
      table.setHeading(
        'Line',
        'Service'
        // 'What now?'
      );
    }
    
    function pushToTable(line) {
      table.addRow(
        line.name,
        line.status
        // Strip.html_strip(line.text, { compact_whitespace: true })
      );
    }
    
    fetchStatuses();
    
  provide("shitty-mta", module.exports);
}(global));