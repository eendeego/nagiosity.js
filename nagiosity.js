#!/usr/bin/env node
// Serve nagios realtime status as XML/JSON

"use strict";

var fs   = require('fs'),
    http = require('http'),
    url  = require('url');

var config = require('./config');

var INFO_LABEL = "info";
var PROGRAM_LABEL = "programstatus";
var CONTACT_LABEL = "contactstatus";

var HOST_LABEL = "hoststatus";
var SERVICE_LABEL = "servicestatus";
var PROGRAM_LABEL = "programstatus";

var MIME_TYPES_TO_FORMATS = {};
var FORMATS_TO_MIME_TYPES = {};

function registerMimeType(mimeType, format) {
  MIME_TYPES_TO_FORMATS[mimeType] = format;
  FORMATS_TO_MIME_TYPES[format] = mimeType;
}

registerMimeType('application/json'      , 'json');
registerMimeType('application/javascript', 'jsonp');
registerMimeType('text/xml'              , 'xml');

process.on('uncaughtException', function(err) {
  logger.log('Caught exception: ' + err.message + '\n' + err.stack);
});

// http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
function isNumeric(input) {
  return input.length > 0 && (input - 0) == input;
}

// Parse the status.dat file and extract matching object definitions
function parseStatus(data) {
  var status_dat = {};
  var status = {};

  status_dat[HOST_LABEL] = [];
  status_dat[SERVICE_LABEL] = [];

  data.
    replace(/^\t([^=\n]+)=([^\n]*)\n/gm,
      function(str, name, value, offset, s) {
        return "\"" + name + "\":" +
          (value == '' ?
           "null" :
           (isNumeric(value) ? value :
            "\"" + value.replace(/"/g, '\\\"') + "\"")) +
          ",";
      }).
    replace(/\s+\{\n/g,"{ ").
    replace(/,\s*\}\n/g," }").
    split(/\n/).
    filter(function(line) { return line.length !== 0 && line[0] != '#'; }).
    forEach(function(line) {
      var bracket_pos = line.indexOf("{");
      var item = line.substr(0,bracket_pos);
      var item_info = JSON.parse(line.substr(bracket_pos));

      if(item == HOST_LABEL || item == SERVICE_LABEL) {
        status_dat[item].push(item_info);
      } else {
        status_dat[item] = item_info;
      }
    });

  status = {
    info: status_dat[INFO_LABEL],
    program: status_dat[PROGRAM_LABEL],
    contact: status_dat[CONTACT_LABEL],
    hosts: status_dat[HOST_LABEL]
  };

  hosts = {};

  status.hosts.forEach(function(host) {
    host.services = [];
    hosts[host.host_name] = host;
  });

  status_dat[SERVICE_LABEL].forEach(function(service) {
    hosts[service.host_name].services.push(service);
  });

  return status;
}

// Returns key='data[key]'
function xmlAttr(data, key) {
  return key + "=\'" + data[key] + "\' ";
}

// Output as XML similar to original nagiosity
function xmlStatus(status, query) {
  var output = "<?xml version='1.0'?>\n";

  // Information about Nagios running state
  output += "<nagios name='nagios' " +
    xmlAttr(status.program, "last_command_check").trim() + ">\n";
  output += "  <hosts>\n";

  // each host
  status.hosts.forEach(function(host) {
      output += "    <host ";
      output += xmlAttr(host, "host_name");
      output += xmlAttr(host, "current_state");
      output += xmlAttr(host, "current_attempt");
      output += xmlAttr(host, "last_check").trim();
      output += ">\n";

      host.services.forEach(function(service) {
          output += "      <service ";
          output += xmlAttr(service, "service_description");
          output += xmlAttr(service, "current_state");
          output += xmlAttr(service, "current_attempt");
          output += xmlAttr(service, "last_check");
          output += "/>\n";
        });
      output += "    </host>\n";
      
    });
  output += "  </hosts>\n";
  output += "</nagios>\n";

  return output;
}

// Output as JSON
function jsonStatus(status, query) {
  var out =
    ('verbose' in query) ?
    status :
    { // same structure as original nagiosity
      name               : "nagios",
      last_command_check : status.last_command_check,
      hosts              : status.hosts.map(function(host) {
          return {
            host_name       : host.host_name,
            current_state   : host.current_state,
            current_attempt : host.current_attempt,
            last_check      : host.last_check,
            services        : host.services.map(function(service) {
                return {
                  service_description : service.service_description,
                  current_state       : service.current_state,
                  current_attempt     : service.current_attempt,
                  last_check          : service.last_check
                };
              })
          };
        })
    };

  return JSON.stringify(out, null,
    ('indent' in query) ?
    (isNumeric(query.indent) ? query.indent-0 : query.indent) :
    0);
}

// JSONP wrapping
function jsonpStatus(status, query) {
  var callback =
    ('callback' in query) ? query.callback :
    ('jsonp' in query) ? query.jsonp : '';
  return callback + '(' + jsonStatus(status, query) + ')';
}

var FORMATTERS = {
  json  : jsonStatus,
  jsonp : jsonpStatus,
  xml   : xmlStatus
};

http.createServer(function (req, res) {
  function sendStatusCode(code) {
    res.writeHead(code);
    res.end();
  }

  function normalizeRequest() {
    req.format = 'json';

    req.url = url.parse(req.url, true);
    req.pathname = req.url.pathname;

    var dot_pos = req.pathname.lastIndexOf('.');
    if(dot_pos != -1) {
      req.format = req.pathname.substr(dot_pos + 1);
      req.pathname = req.pathname.substr(0, dot_pos);
    }

    if('accept' in req.headers &&
       req.headers.accept in MIME_TYPES_TO_FORMATS) {
      req.format = MIME_TYPES_TO_FORMATS[req.headers.accept];
    }

    if(!('query' in req.url)) {
      req.url.query = {};
    }
  }

  normalizeRequest();

  if(req.method != 'GET') {
    sendStatusCode(405); // Method Not Allowed
    return;
  }

  if(req.pathname != config.server.path) {
    sendStatusCode(404); // Not Found
    return;
  }

  if(!(req.format in FORMATTERS)) {
    sendStatusCode(406); // Not Acceptable
    return;
  }

  // Support for JSONP
  if(req.format == 'json' &&
     ('callback' in req.url.query || 'jsonp' in req.url.query)) {
    req.format = 'jsonp';
  }

  fs.open(config.nagios.status_file, 'r',
    function(err, fd) {
      // Wrap up short responses
      function closeAndsendStatusCode(code) {
        try { fs.close(fd); } catch(exception) {}
        sendStatusCode(code);
      }
      // Wrap up errors
      function manageError(err) {
        if(err) {
          closeAndsendStatusCode(500); // Internal Server Error
          throw err;
        }
      }

      manageError(err);

      fs.fstat(fd,
        function(err, stats) {
          manageError(err);

          var mtime = new Date(stats.mtime);

          // Support for client side caching
          if('if-modified-since' in req.headers &&
             mtime <= new Date(req.headers['if-modified-since'])) {

            closeAndsendStatusCode(304); // Not Modified
            return;
          }

          (function read(totalRead, buffer, callback) {
            fs.read(fd, buffer, totalRead, stats.size - totalRead, totalRead,
              function(err, bytesRead) {
                manageError(err);

                totalRead += bytesRead;
                if(totalRead != stats.size) {
                  read(totalRead, buffer, callback);
                } else {
                  fs.close(fd);

                  callback(buffer.toString());
                }
              });
          })(0, new Buffer(stats.size),
            function(data) {
              var out = FORMATTERS[req.format](parseStatus(data), req.url.query);

              res.writeHead(200, { // OK
                  'Content-Length' : out.length,
                  'Content-Type'   : FORMATS_TO_MIME_TYPES[req.format],
                  'Last-Modified'  : mtime.toUTCString()
                });
              res.end(out);
            }
          );
        });
    });
}).listen(config.server.port, config.server.host);
