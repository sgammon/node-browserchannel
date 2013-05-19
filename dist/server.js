// Generated by CoffeeScript 1.6.1
var Date, EventEmitter, browserChannel, bufferPostData, clearInterval, clearTimeout, clientCode, clientFile, clientStats, decodeData, defaultOptions, fs, hat, ieHeaders, ieJunk, k, messagingMethods, order, parse, querystring, randomArrayElement, randomInt, sendError, setInterval, setTimeout, standardHeaders, transformData, v;

parse = require('url').parse;

querystring = require('querystring');

fs = require('fs');

EventEmitter = require('events').EventEmitter;

hat = require('hat').rack(40, 36);

randomInt = function(n) {
  return Math.floor(Math.random() * n);
};

randomArrayElement = function(array) {
  return array[randomInt(array.length)];
};

setInterval = global.setInterval, clearInterval = global.clearInterval, setTimeout = global.setTimeout, clearTimeout = global.clearTimeout, Date = global.Date;

defaultOptions = {
  hostPrefixes: null,
  base: '/channel',
  keepAliveInterval: 20 * 1000,
  sessionTimeoutInterval: 30 * 1000,
  cors: null,
  headers: null
};

standardHeaders = {
  'Content-Type': 'text/plain',
  'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': 'Fri, 01 Jan 1990 00:00:00 GMT',
  'X-Content-Type-Options': 'nosniff'
};

ieHeaders = {};

for (k in standardHeaders) {
  v = standardHeaders[k];
  ieHeaders[k] = v;
}

ieHeaders['Content-Type'] = 'text/html';

ieJunk = "7cca69475363026330a0d99468e88d23ce95e222591126443015f5f462d9a177186c8701fb45a6ffee0daf1a178fc0f58cd309308fba7e6f011ac38c9cdd4580760f1d4560a84d5ca0355ecbbed2ab715a3350fe0c479050640bd0e77acec90c58c4d3dd0f5cf8d4510e68c8b12e087bd88cad349aafd2ab16b07b0b1b8276091217a44a9fe92fedacffff48092ee693af\n";

messagingMethods = function(options, query, res) {
  var junkSent, methods, type;
  type = query.TYPE;
  if (type === 'html') {
    junkSent = false;
    methods = {
      writeHead: function() {
        var domain;
        res.writeHead(200, 'OK', ieHeaders);
        res.write('<html><body>');
        domain = query.DOMAIN;
        if (domain && domain !== '') {
          return res.write("<script>try{document.domain=" + (JSON.stringify(domain)) + ";}catch(e){}</script>\n");
        }
      },
      write: function(data) {
        res.write("<script>try {parent.m(" + (JSON.stringify(data)) + ")} catch(e) {}</script>\n");
        if (!junkSent) {
          res.write(ieJunk);
          return junkSent = true;
        }
      },
      end: function() {
        return res.end("<script>try  {parent.d(); }catch (e){}</script>\n");
      },
      writeError: function(statusCode, message) {
        methods.writeHead();
        return res.end("<script>try {parent.rpcClose(" + (JSON.stringify(message)) + ")} catch(e){}</script>\n");
      }
    };
    methods.writeRaw = methods.write;
    return methods;
  } else {
    return {
      writeHead: function() {
        return res.writeHead(200, 'OK', options.headers);
      },
      write: function(data) {
        return res.write("" + data.length + "\n" + data);
      },
      writeRaw: function(data) {
        return res.write(data);
      },
      end: function() {
        return res.end();
      },
      writeError: function(statusCode, message) {
        res.writeHead(statusCode, options.headers);
        return res.end(message);
      }
    };
  }
};

sendError = function(res, statusCode, message) {
  res.writeHead(statusCode, message);
  res.end("<html><body><h1>" + message + "</h1></body></html>");
};

bufferPostData = function(req, callback) {
  var data;
  data = [];
  req.on('data', function(chunk) {
    return data.push(chunk.toString('utf8'));
  });
  return req.on('end', function() {
    data = data.join('');
    return callback(data);
  });
};

transformData = function(req, data) {
  var count, id, key, map, mapKey, maps, match, ofs, regex, val, _ref;
  if (req.headers['content-type'] === 'application/json') {
    _ref = data, ofs = _ref.ofs, data = _ref.data;
    return {
      ofs: ofs,
      json: data
    };
  } else {
    count = parseInt(data.count);
    if (count === 0) {
      return null;
    }
    ofs = parseInt(data.ofs);
    if (isNaN(count || isNaN(ofs))) {
      throw new Error('invalid map data');
    }
    if (!(count === 0 || (count > 0 && (data.ofs != null)))) {
      throw new Error('Invalid maps');
    }
    maps = new Array(count);
    regex = /^req(\d+)_(.+)$/;
    for (key in data) {
      val = data[key];
      match = regex.exec(key);
      if (match) {
        id = match[1];
        mapKey = match[2];
        map = (maps[id] || (maps[id] = {}));
        if (id === 'type' && mapKey === '_badmap') {
          continue;
        }
        map[mapKey] = val;
      }
    }
    return {
      ofs: ofs,
      maps: maps
    };
  }
};

decodeData = function(req, data) {
  if (req.headers['content-type'] === 'application/json') {
    return JSON.parse(data);
  } else {
    return querystring.parse(data, '&', '=', {
      maxKeys: 0
    });
  }
};

order = function(start, playOld) {
  var base, queue;
  base = start;
  queue = new Array(10);
  return function(seq, callback) {
    var _results;
    callback || (callback = function() {});
    if (seq < base) {
      if (playOld) {
        return callback();
      }
    } else {
      queue[seq - base] = callback;
      _results = [];
      while (queue[0]) {
        callback = queue.shift();
        base++;
        _results.push(callback());
      }
      return _results;
    }
  };
};

clientFile = "" + __dirname + "/../dist/bcsocket.js";

clientStats = fs.statSync(clientFile);

try {
  clientCode = fs.readFileSync(clientFile, 'utf8');
} catch (e) {
  console.error('Could not load the client javascript. Run `cake client` to generate it.');
  throw e;
}

if (process.env.NODE_ENV !== 'production') {
  if (process.platform === "win32") {
    fs.watch(clientFile, {
      persistent: false
    }, function(event, filename) {
      if (event === "change") {
        console.log("Reloading client JS");
        clientCode = fs.readFileSync(clientFile, 'utf8');
        return clientStats = curr;
      }
    });
  } else {
    fs.watchFile(clientFile, {
      persistent: false
    }, function(curr, prev) {
      if (curr.mtime.getTime() !== prev.mtime.getTime()) {
        console.log("Reloading client JS");
        clientCode = fs.readFileSync(clientFile, 'utf8');
        return clientStats = curr;
      }
    });
  }
}

module.exports = browserChannel = function(options, onConnect) {
  var base, createSession, getHostPrefix, h, middleware, option, sessions, value, _base, _ref, _ref1;
  if (typeof onConnect === 'undefined') {
    onConnect = options;
    options = {};
  }
  options || (options = {});
  for (option in defaultOptions) {
    value = defaultOptions[option];
    if ((_ref = options[option]) == null) {
      options[option] = value;
    }
  }
  if (!options.headers) {
    options.headers = {};
  }
  for (h in standardHeaders) {
    v = standardHeaders[h];
    (_base = options.headers)[h] || (_base[h] = v);
  }
  if (options.cors) {
    options.headers['Access-Control-Allow-Origin'] = options.cors;
  }
  base = options.base;
  if (base.match(/\/$/)) {
    base = base.slice(0, base.length - 1);
  }
  if (!base.match(/^\//)) {
    base = "/" + base;
  }
  sessions = {};
  getHostPrefix = function() {
    if (options.hostPrefixes) {
      return randomArrayElement(options.hostPrefixes);
    } else {
      return null;
    }
  };
  createSession = function(address, query, headers) {
    var appVersion, backChannel, changeState, clearBackChannel, heartbeat, initialRid, lastArrayId, lastSentArrayId, mapBuffer, oldArrayId, oldSession, oldSessionId, outgoingArrays, queueArray, refreshHeartbeat, refreshSessionTimeout, ridBuffer, session, sessionTimeout;
    initialRid = query.RID, appVersion = query.CVER, oldSessionId = query.OSID, oldArrayId = query.OAID;
    if ((oldSessionId != null) && (oldSession = sessions[oldSessionId])) {
      oldSession._acknowledgeArrays(oldArrayId);
      oldSession.close('Reconnected');
    }
    session = new EventEmitter;
    session.id = hat();
    session.address = address;
    session.headers = headers;
    session.state = 'init';
    changeState = function(newState) {
      var oldState;
      oldState = session.state;
      session.state = newState;
      return session.emit('state changed', session.state, oldState);
    };
    backChannel = null;
    outgoingArrays = [];
    lastArrayId = -1;
    lastSentArrayId = -1;
    session._setBackChannel = function(res, query) {
      clearBackChannel();
      backChannel = {
        res: res,
        methods: messagingMethods(options, query, res),
        chunk: query.CI === '0',
        bytesSent: 0,
        listener: function() {
          backChannel.listener = null;
          return clearBackChannel(res);
        }
      };
      res.connection.once('close', backChannel.listener);
      refreshHeartbeat();
      clearTimeout(sessionTimeout);
      if (outgoingArrays.length > 0) {
        lastSentArrayId = outgoingArrays[0].id - 1;
      }
      return this.flush();
    };
    heartbeat = null;
    clearBackChannel = function(res) {
      if (!backChannel) {
        return;
      }
      if ((res != null) && res !== backChannel.res) {
        return;
      }
      if (backChannel.listener) {
        backChannel.res.connection.removeListener('close', backChannel.listener);
        backChannel.listener = null;
      }
      clearTimeout(heartbeat);
      backChannel.methods.end();
      backChannel = null;
      return refreshSessionTimeout();
    };
    refreshHeartbeat = function() {
      clearTimeout(heartbeat);
      return heartbeat = setInterval((function() {
        return session.send(['noop']);
      }), options.keepAliveInterval);
    };
    sessionTimeout = null;
    refreshSessionTimeout = function() {
      clearTimeout(sessionTimeout);
      return sessionTimeout = setTimeout((function() {
        return session.close('Timed out');
      }), options.sessionTimeoutInterval);
    };
    refreshSessionTimeout();
    session._acknowledgeArrays = function(id) {
      var confirmcallback;
      if (typeof id === 'string') {
        id = parseInt(id);
      }
      while (outgoingArrays.length > 0 && outgoingArrays[0].id <= id) {
        confirmcallback = outgoingArrays.shift().confirmcallback;
        if (typeof confirmcallback === "function") {
          confirmcallback();
        }
      }
    };
    queueArray = function(data, sendcallback, confirmcallback) {
      var id;
      if (session.state === 'closed') {
        return typeof confirmcallback === "function" ? confirmcallback(new Error('closed')) : void 0;
      }
      id = ++lastArrayId;
      outgoingArrays.push({
        id: id,
        data: data,
        sendcallback: sendcallback,
        confirmcallback: confirmcallback
      });
      return lastArrayId;
    };
    queueArray(['c', session.id, getHostPrefix(), 8]);
    session.send = function(arr, callback) {
      var id;
      id = queueArray(arr, null, callback);
      this.flush();
      return id;
    };
    mapBuffer = order(0, false);
    ridBuffer = order(initialRid, true);
    session._receivedData = function(rid, data) {
      return ridBuffer(rid, function() {
        var id, map, message, _i, _j, _len, _len1, _ref1, _ref2, _results, _results1;
        if (data === null) {
          return;
        }
        if (!((data.maps != null) || (data.json != null))) {
          throw new Error('Invalid data');
        }
        ridBuffer(rid);
        id = data.ofs;
        if (data.maps) {
          _ref1 = data.maps;
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            map = _ref1[_i];
            _results.push(mapBuffer(id++, (function(map) {
              return function() {
                var message;
                if (session.state === 'closed') {
                  return;
                }
                session.emit('map', map);
                if (map.JSON != null) {
                  try {
                    message = JSON.parse(map.JSON);
                  } catch (e) {
                    session.close('Invalid JSON');
                    return;
                  }
                  return session.emit('message', message);
                }
              };
            })(map)));
          }
          return _results;
        } else {
          _ref2 = data.json;
          _results1 = [];
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            message = _ref2[_j];
            _results1.push(mapBuffer(id++, (function(map) {
              return function() {
                if (session.state === 'closed') {
                  return;
                }
                return session.emit('message', message);
              };
            })(map)));
          }
          return _results1;
        }
      });
    };
    session._disconnectAt = function(rid) {
      return ridBuffer(rid, function() {
        return session.close('Disconnected');
      });
    };
    session._backChannelStatus = function() {
      var a, data, numUnsentArrays, outstandingBytes, unacknowledgedArrays;
      numUnsentArrays = lastArrayId - lastSentArrayId;
      unacknowledgedArrays = outgoingArrays.slice(0, outgoingArrays.length - numUnsentArrays);
      outstandingBytes = unacknowledgedArrays.length === 0 ? 0 : (data = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = unacknowledgedArrays.length; _i < _len; _i++) {
          a = unacknowledgedArrays[_i];
          _results.push(a.data);
        }
        return _results;
      })(), JSON.stringify(data).length);
      return [(backChannel ? 1 : 0), lastSentArrayId, outstandingBytes];
    };
    session.flush = function() {
      return process.nextTick(function() {
        var a, arrays, bytes, data, id, numUnsentArrays, _i, _len;
        if (backChannel) {
          numUnsentArrays = lastArrayId - lastSentArrayId;
          if (numUnsentArrays > 0) {
            arrays = outgoingArrays.slice(outgoingArrays.length - numUnsentArrays);
            data = (function() {
              var _i, _len, _ref1, _results;
              _results = [];
              for (_i = 0, _len = arrays.length; _i < _len; _i++) {
                _ref1 = arrays[_i], id = _ref1.id, data = _ref1.data;
                _results.push([id, data]);
              }
              return _results;
            })();
            bytes = JSON.stringify(data) + "\n";
            bytes = bytes.replace(/\u2028/g, "\\u2028");
            bytes = bytes.replace(/\u2029/g, "\\u2029");
            backChannel.methods.write(bytes);
            backChannel.bytesSent += bytes.length;
            lastSentArrayId = lastArrayId;
            for (_i = 0, _len = arrays.length; _i < _len; _i++) {
              a = arrays[_i];
              if (a.sendcallback != null) {
                if (typeof a.sendcallback === "function") {
                  a.sendcallback();
                }
                delete a.sendcallback;
              }
            }
            if (backChannel && (!backChannel.chunk || backChannel.bytesSent > 10 * 1024)) {
              clearBackChannel();
            }
          }
          if (session.state === 'init') {
            return changeState('ok');
          }
        }
      });
    };
    session.appVersion = appVersion || null;
    session.stop = function(callback) {
      if (this.state === 'closed') {
        return;
      }
      queueArray(['stop'], callback, null);
      return this.flush();
    };
    session.close = function(message) {
      var confirmcallback, _i, _len;
      if (this.state === 'closed') {
        return;
      }
      changeState('closed');
      this.emit('close', message);
      clearBackChannel();
      clearTimeout(sessionTimeout);
      for (_i = 0, _len = outgoingArrays.length; _i < _len; _i++) {
        confirmcallback = outgoingArrays[_i].confirmcallback;
        if (typeof confirmcallback === "function") {
          confirmcallback(new Error(message || 'closed'));
        }
      }
      return delete sessions[this.id];
    };
    sessions[session.id] = session;
    return session;
  };
  middleware = function(req, res, next) {
    var blockedPrefix, dataError, end, etag, headers, hostPrefix, pathname, processData, query, session, write, writeError, writeHead, writeRaw, _ref1, _ref2, _ref3, _ref4;
    _ref1 = parse(req.url, true), query = _ref1.query, pathname = _ref1.pathname;
    if (pathname.substring(0, base.length + 1) !== ("" + base + "/")) {
      return next();
    }
    _ref2 = messagingMethods(options, query, res), writeHead = _ref2.writeHead, write = _ref2.write, writeRaw = _ref2.writeRaw, end = _ref2.end, writeError = _ref2.writeError;
    if (pathname === ("" + base + "/bcsocket.js")) {
      etag = "\"" + clientStats.size + "-" + (clientStats.mtime.getTime()) + "\"";
      res.writeHead(200, 'OK', {
        'Content-Type': 'application/javascript',
        'ETag': etag,
        'Content-Length': clientCode.length
      });
      if (req.method === 'HEAD') {
        return res.end();
      } else {
        return res.end(clientCode);
      }
    } else if (pathname === ("" + base + "/test")) {
      if (query.VER !== '8') {
        return sendError(res, 400, 'Version 8 required');
      }
      if (query.MODE === 'init' && req.method === 'GET') {
        hostPrefix = getHostPrefix();
        blockedPrefix = null;
        headers = {};
        _ref3 = options.headers;
        for (k in _ref3) {
          v = _ref3[k];
          headers[k] = v;
        }
        headers['X-Accept'] = 'application/json; application/x-www-form-urlencoded';
        res.writeHead(200, 'OK', headers);
        return res.end(JSON.stringify([hostPrefix, blockedPrefix]));
      } else {
        writeHead();
        writeRaw('11111');
        return setTimeout((function() {
          writeRaw('2');
          return end();
        }), 2000);
      }
    } else if (pathname === ("" + base + "/bind")) {
      if (query.VER !== '8') {
        return sendError(res, 400, 'Version 8 required');
      }
      if (query.SID) {
        session = sessions[query.SID];
        if (!session) {
          return sendError(res, 400, 'Unknown SID');
        }
      }
      if ((query.AID != null) && session) {
        session._acknowledgeArrays(query.AID);
      }
      if (req.method === 'POST') {
        if (session === void 0) {
          session = createSession(req.connection.remoteAddress, query, req.headers);
          if (typeof onConnect === "function") {
            onConnect(session);
          }
        }
        dataError = function(e) {
          console.warn('Error parsing forward channel', e.stack);
          return sendError(res, 400, 'Bad data');
        };
        processData = function(data) {
          var response;
          try {
            data = transformData(req, data);
            session._receivedData(query.RID, data);
          } catch (e) {
            return dataError(e);
          }
          if (session.state === 'init') {
            res.writeHead(200, 'OK', options.headers);
            session._setBackChannel(res, {
              CI: 1,
              TYPE: 'xmlhttp',
              RID: 'rpc'
            });
            return session.flush();
          } else if (session.state === 'closed') {
            return sendError(res, 403, 'Forbidden');
          } else {
            response = JSON.stringify(session._backChannelStatus());
            res.writeHead(200, 'OK', options.headers);
            return res.end("" + response.length + "\n" + response);
          }
        };
        if (req.body) {
          return processData(req.body);
        } else {
          return bufferPostData(req, function(data) {
            try {
              data = decodeData(req, data);
            } catch (e) {
              return dataError(e);
            }
            return processData(data);
          });
        }
      } else if (req.method === 'GET') {
        if ((_ref4 = query.TYPE) === 'xmlhttp' || _ref4 === 'html') {
          if (typeof query.SID !== 'string' && query.SID.length < 5) {
            return sendError(res, 400, 'Invalid SID');
          }
          if (query.RID !== 'rpc') {
            return sendError(res, 400, 'Expected RPC');
          }
          writeHead();
          return session._setBackChannel(res, query);
        } else if (query.TYPE === 'terminate') {
          if (session != null) {
            session._disconnectAt(query.RID);
          }
          res.writeHead(200, 'OK', options.headers);
          return res.end();
        }
      } else {
        res.writeHead(405, 'Method Not Allowed', options.headers);
        return res.end("Method not allowed");
      }
    } else {
      res.writeHead(404, 'Not Found', options.headers);
      return res.end("Not found");
    }
  };
  middleware.close = function() {
    var id, session, _results;
    _results = [];
    for (id in sessions) {
      session = sessions[id];
      _results.push(session.close());
    }
    return _results;
  };
  if ((_ref1 = options.server) != null) {
    _ref1.on('close', middleware.close);
  }
  return middleware;
};

browserChannel._setTimerMethods = function(methods) {
  return setInterval = methods.setInterval, clearInterval = methods.clearInterval, setTimeout = methods.setTimeout, clearTimeout = methods.clearTimeout, Date = methods.Date, methods;
};
