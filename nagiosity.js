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
           (isNumeric(value) ? value : "\"" + value.replace('\"','\\\"') + "\"")) +
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

// Output as XML (similar to original nagiosity)
function xmlStatus(status) {
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

// Output as JSON (same structure as original nagiosity)
function jsonStatus(status) {
  var out = {
      name               : "nagios",
      last_command_check : status.last_command_check,
      hosts              : []
    };

  status.hosts.forEach(function(host) {
      out.hosts.push({
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
      });
    });

  return JSON.stringify(out);
}

// Output as JSON (full nagios.dat dump)
function jsonVerbose(status) {
  return JSON.stringify(status);
}

var formatters = {
  json : { simple : jsonStatus, verbose : jsonVerbose },
  xml : { simple : xmlStatus, verbose : xmlStatus }
};

var mime_types = { json : 'application/json', xml : 'text/xml'};

http.createServer(function (req, res) {
  var format;

  var req_url = url.parse(req.url);
  var pathname = req_url.pathname;

  var dot_pos = req_url.pathname.lastIndexOf('.');
  if(dot_pos != -1) {
    format = pathname.substr(dot_pos + 1);
    pathname = pathname.substr(0, dot_pos);
  }

  if(pathname != config.server.path) {
    res.writeHead(404);
    res.end();
    return;
  }

  if(req.headers.accept == mime_types.xml) { format = 'xml'; }
  if(format != 'xml') { format = 'json'; }

  var verboseness = req_url.search == '?verbose' ? 'verbose' : 'simple';

  fs.readFile(config.nagios.status_file, 'utf8', function(err, data) {
      if (err) {
        res.writeHead(500);
        throw err;
      }

      var out = formatters[format][verboseness](parseStatus(data));

      res.writeHead(200, {
          'Content-Length': out.length,
          'Content-Type': mime_types[format]
        });
      res.end(out);
    });
}).listen(config.server.port, config.server.host);
