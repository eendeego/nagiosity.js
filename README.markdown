Nagiosity.js - Port of Nagiosity to node.js
===========================================

## Description

This is just a port of nagiosity with an aditional goodness of JSON/JSONP output.

The original project can be found at http://code.google.com/p/nagiosity/

### What is nagiosity ?

Nagiosity is a python CGI originaly written by Matt Joyce that reads the [Nagios](http://www.nagios.org/) status file and renders
it in an XML proper for another script/application consumption.

## Instructions / Configuration

Install this script and its configuration file on a user/dir with access to nagios's nagios.dat file.

Copy the config.js.sample file to config.js and customize it.

Note: You may or may not be making too much information available through this app. If this is your situation here are 2 solutions:
* Place an Apache / Nginx server with a proper authentication mechanism in front of this script.
* Serve only to localhost and install the clients to this app on the same machine.

This script has been tested with node.js 0.2.4 and 0.3.2/0.3.3 and with Nagios 3.2.3.

## Usage
(Default parameters)

XML output (same format as the original nagiosity):

    curl http://127.0.0.1:3999/nagios/status.xml

or:

    curl -H "Accept: text/xml" http://127.0.0.1:3999/nagios/status

JSON output (same fields as the original nagiosity):

    curl http://127.0.0.1:3999/nagios/status

The HTTP Header If-Modified-Since is supported for both formats, enabling client side caching.

JSON supports the following output options:

    verbose - Return full nagios state
    callback/jsonp - JSONP padding [JSONP]{http://bob.pythonmac.org/archives/2005/12/05/remote-json-jsonp/}
    indent - JSON output indentation (as defined in [JSON]{https://developer.mozilla.org/En/Using_native_JSON})

Examples:

JSON full output (entire contents of nagios status.dat file as JSON):

    curl http://127.0.0.1:3999/nagios/status?verbose

JSONP output:

    curl http://127.0.0.1:3999/nagios/status?callback=updateNagiosState

JSON indented full output (useful for debugging):

    curl http://127.0.0.1:3999/nagios/status?verbose\&indent=4

JSONP indented verbose output:

    curl http://127.0.0.1:3999/nagios/status?callback=updateNagiosState\&verbose\&indent=2

## LICENSE:

(The MIT License)

Copyright (c) 2010 Matt Joyce, Luis Reis

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
