Nagiosity.js - Port of Nagiosity to node.js
===========================================

## Description

This is just a port of nagiosity with an aditional goodness of JSON output.

The original project can be found at http://code.google.com/p/nagiosity/

## Instructions / Configuration

Install this script and its configuration file on a user/dir with access to nagios's nagios.dat file.

Copy the config.js.sample file to config.js and customize it.

Note: You may or may not be making too much information available through this app. If this is your situation here are 2 solutions:
    * Place an Apache / Nginx server with a proper authentication mechanism in front of this script if this is an issue for you.
    * Serve only to localhost and install clients to this app on the same machine.

## Usage
(Default parameters)

JSON output (same fields as the original nagiosity):

    curl http://127.0.0.1:3999/nagios/status

JSON full output (entire contents of nagios.js as JSON):

    curl http://127.0.0.1:3999/nagios/status?verbose

XML output (same format as the original nagiosity):

    curl http://127.0.0.1:3999/nagios/status.xml

or:

    curl -H "Accept: text/xml" http://127.0.0.1:3999/nagios/status

There is no equivalent to verbose output in xml format.

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
