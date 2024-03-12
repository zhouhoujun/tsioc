import { Execption, isFunction } from '@tsdi/ioc';
import { InvalidStateExecption, SecurityExecption } from '@tsdi/common/transport';
import { GET } from '@tsdi/common';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { URL } from 'url';
import { spawn } from 'child_process';

/**
 * refactor XMLHttpRequest.js
 * to fix redirect url error.
 * https://github.com/driverdan/node-XMLHttpReques
 * 
 */


export interface XhrOptions extends https.RequestOptions, http.RequestOptions {
    autoUnref?: boolean;
    agent?: http.Agent;
    headers?: Record<string, string | number>;
    settings?: Record<string, any>;
    disableHeaderCheck?: boolean;
}


/**
 * `XMLHttpRequest` constructor.
 *
 * Supported options for the `opts` object are:
 *
 *  - `agent`: An http.Agent instance; http.globalAgent may be used; if 'undefined', agent usage is disabled
 *
 * @param {Object} opts optional "options" object
 */
export class XMLHttpRequest2 {

    // Request settings
    private settings: Record<string, any>;
    // Disable header blacklist.
    // Not part of XHR specs.
    private disableHeaderCheck: boolean;
    private headers: Record<string, string | number | undefined>;

    private _request!: http.ClientRequest;
    private _response!: http.IncomingMessage;
    private asyn?: boolean | (() => Promise<boolean>);


    /**
     * Public consts
     */
    // Current state
    public readyState = UNSENT;
    // default ready state change handler in case one is not set or is set late
    public onreadystatechange = null;

    // Result & response
    public responseText = "";
    public responseXML = "";
    public status?: number | null = null;
    public statusText = null;


    // Send flag
    private sendFlag = false;
    // Error flag, used when errors occur or abort is called
    private errorFlag = false;
    private abortedFlag = false;

    // Event listeners
    private listeners: Record<string, Function[]>;

    constructor(private opts: XhrOptions = {}) {
        this.disableHeaderCheck = opts.disableHeaderCheck ?? false;
        this.settings = opts.settings ?? {};
        this.headers = { ...defaultHeaders, ...opts.headers };
        this.listeners = {};
    }

    /**
     * Open the connection. Currently supports local server requests.
     *
     * @param string method Connection method (eg GET, POST)
     * @param string url URL for the connection.
     * @param boolean async Asynchronous connection. Default is true.
     * @param string user Username for basic authentication (optional)
     * @param string password Password for basic authentication (optional)
     */
    open(method: string, url: string, asyn: boolean | (() => Promise<boolean>), user: string, password: string) {
        this.abort();
        this.errorFlag = false;
        this.abortedFlag = false;

        // Check for valid request method
        if (!this.isAllowedHttpMethod(method)) {
            throw new SecurityExecption("Request method not allowed");
        }

        this.settings = {
            method,
            url,
            async: (typeof asyn !== "boolean" ? true : asyn),
            user: user || null,
            password: password || null
        };

        this.setState(OPENED);
    }

    /**
     * Disables or enables isAllowedHttpHeader() check the request. Enabled by default.
     * This does not conform to the W3C spec.
     *
     * @param boolean state Enable or disable header checking.
     */
    setDisableHeaderCheck(state: boolean) {
        this.disableHeaderCheck = state;
    }

    /**
     * Sets a header for the request.
     *
     * @param string header Header name
     * @param string value Header value
     * @return boolean Header added
     */
    setRequestHeader(header: string, value: string | number | undefined) {
        if (this.readyState != OPENED) {
            throw new InvalidStateExecption("setRequestHeader can only be called when state is OPEN");
        }
        if (!this.isAllowedHttpHeader(header)) {
            console.warn('Refused to set unsafe header "' + header + '"');
            return false;
        }
        if (this.sendFlag) {
            throw new InvalidStateExecption("send flag is true");
        }
        this.headers[header] = value;
        return true;
    }

    /**
     * Gets a header from the server response.
     *
     * @param string header Name of header to get.
     * @return string Text of the header or null if it doesn't exist.
     */
    getResponseHeader(header: string) {
        if (typeof header === "string"
            && this.readyState > OPENED
            && this._response.headers[header.toLowerCase()]
            && !this.errorFlag
        ) {
            return this._response.headers[header.toLowerCase()];
        }

        return null;
    }

    /**
     * Gets all the response headers.
     *
     * @return string A string with all response headers separated by CR+LF
     */
    getAllResponseHeaders() {
        if (this.readyState < HEADERS_RECEIVED || this.errorFlag) {
            return "";
        }
        let result = "";

        for (const i in this._response.headers) {
            // Cookie headers are excluded
            if (i !== "set-cookie" && i !== "set-cookie2") {
                result += i + ": " + this._response.headers[i] + "\r\n";
            }
        }
        return result.substring(0, result.length - 2);
    }

    /**
     * Gets a request header
     *
     * @param string name Name of header to get
     * @return string Returns the request header or empty string if not set
     */
    getRequestHeader(name: string) {
        // @TODO Make this case insensitive
        if (typeof name === "string" && this.headers[name]) {
            return this.headers[name];
        }

        return "";
    }


    /**
     * Sends the request to the server.
     *
     * @param string data Optional data to send as request body.
     */
    send(data: any) {
        if (this.readyState != OPENED) {
            throw new InvalidStateExecption("connection must be opened before send() is called");
        }

        if (this.sendFlag) {
            throw new InvalidStateExecption("send has already been called");
        }

        let ssl = false, local = false;
        const url = new URL(this.settings.url);
        let host;
        // Determine the server
        switch (url.protocol) {
            case 'https:':
                ssl = true;
                break;
            // SSL & non-SSL both need host, no break here.
            case 'http:':
                host = url.hostname;
                break;

            case 'file:':
                local = true;
                break;

            case undefined:
            case '':
                host = "localhost";
                break;

            default:
                throw new Execption("Protocol not supported.");
        }

        // Load files off the local filesystem (file://)
        if (local) {
            if (this.settings.method !== "GET") {
                throw new Execption("XMLHttpRequest: Only GET method is supported");
            }

            if (this.settings.async) {
                fs.readFile(unescape(url.pathname), 'utf8', (error, data) => {
                    if (error) {
                        this.handleError(error, error.errno || -1);
                    } else {
                        this.status = 200;
                        this.responseText = data;
                        this.setState(DONE);
                    }
                });
            } else {
                try {
                    this.responseText = fs.readFileSync(unescape(url.pathname), 'utf8');
                    this.status = 200;
                    this.setState(DONE);
                } catch (e: any) {
                    this.handleError(e, e.errno || -1);
                }
            }

            return;
        }

        // Default to port 80. If accessing localhost on another port be sure
        // to use http://localhost:port/path
        const port = url.port || (ssl ? 443 : 80);
        // Add query string if one is used
        const uri = url.pathname + (url.search ? url.search : '');

        // Set the Host header or the server may reject the request
        this.headers["Host"] = host;
        if (!((ssl && port === 443) || port === 80)) {
            this.headers["Host"] += ':' + url.port;
        }

        // Set Basic Auth if necessary
        if (this.settings.user) {
            if (typeof this.settings.password == "undefined") {
                this.settings.password = "";
            }
            const authBuf = Buffer.from(this.settings.user + ":" + this.settings.password);
            this.headers["Authorization"] = "Basic " + authBuf.toString("base64");
        }

        // Set content length header
        if (this.settings.method === "GET" || this.settings.method === "HEAD") {
            data = null;
        } else if (data) {
            this.headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);

            if (!this.headers["Content-Type"]) {
                this.headers["Content-Type"] = "text/plain;charset=UTF-8";
            }
        } else if (this.settings.method === "POST") {
            // For a post with no data set Content-Length: 0.
            // This is required by buggy servers that don't meet the specs.
            this.headers["Content-Length"] = 0;
        }

        const agent = this.opts.agent || false;
        const options: Record<string, any> = {
            host: host,
            port: port,
            path: uri,
            method: this.settings.method,
            headers: this.headers,
            agent: agent
        };

        if (ssl) {
            options.pfx = this.opts.pfx;
            options.key = this.opts.key;
            options.passphrase = this.opts.passphrase;
            options.cert = this.opts.cert;
            options.ca = this.opts.ca;
            options.ciphers = this.opts.ciphers;
            options.rejectUnauthorized = this.opts.rejectUnauthorized === false ? false : true;
        }

        // Reset error flag
        this.errorFlag = false;
        // Handle async requests
        if (this.settings.async) {
            // Use the proper protocol
            const doRequest = ssl ? https.request : http.request;

            // Request is being sent, set send flag
            this.sendFlag = true;

            // As per spec, this is called here for historical reasons.
            this.dispatchEvent('readystatechange');

            // Handler for the response
            const responseHandler = (resp: http.IncomingMessage) => {
                // Set response var to the response we got back
                // This is so it remains accessable outside this scope
                this._response = resp;
                // Check for redirect
                // @TODO Prevent looped redirects
                if (this._response.statusCode === 302 || this._response.statusCode === 303 || this._response.statusCode === 307) {
                    // Change URL to the redirect location
                    const origin = this.settings.url;
                    const url = new URL(this._response.headers.location!, origin);
                    this.settings.url = url.href;
                    // Set host var in case it's used later
                    host = url.hostname;
                    // Options for the new request
                    const newOptions: Record<string, any> = {
                        hostname: url.hostname,
                        port: url.port,
                        path: url.pathname,
                        method: this._response.statusCode === 303 ? GET : this.settings.method,
                        headers: this.headers
                    };

                    if (ssl) {
                        newOptions.pfx = this.opts.pfx;
                        newOptions.key = this.opts.key;
                        newOptions.passphrase = this.opts.passphrase;
                        newOptions.cert = this.opts.cert;
                        newOptions.ca = this.opts.ca;
                        newOptions.ciphers = this.opts.ciphers;
                        newOptions.rejectUnauthorized = this.opts.rejectUnauthorized === false ? false : true;
                    }

                    // Issue the new request
                    this._request = doRequest(newOptions, responseHandler).on('error', errorHandler);
                    this._request.end();
                    // @TODO Check if an XHR event needs to be fired here
                    return;
                }

                if (this._response && this._response.setEncoding) {
                    this._response.setEncoding("utf8");
                }

                this.setState(HEADERS_RECEIVED);
                this.status = this._response.statusCode;

                this._response.on('data', (chunk) => {
                    // Make sure there's some data
                    if (chunk) {
                        this.responseText += chunk;
                    }
                    // Don't emit state changes if the connection has been aborted.
                    if (this.sendFlag) {
                        this.setState(LOADING);
                    }
                });

                this._response.on('end', () => {
                    if (this.sendFlag) {
                        // The sendFlag needs to be set before setState is called.  Otherwise if we are chaining callbacks
                        // there can be a timing issue (the callback is called and a new call is made before the flag is reset).
                        this.sendFlag = false;
                        // Discard the 'end' event if the connection has been aborted
                        this.setState(DONE);
                    }
                });

                this._response.on('error', (error) => {
                    this.handleError(error);
                });
            }

            // Error handler for the request
            const errorHandler = (error: any) => {
                this.handleError(error);
            }

            // Create the request
            this._request = doRequest(options, responseHandler).on('error', errorHandler);

            if (this.opts.autoUnref) {
                this._request.on('socket', (socket) => {
                    socket.unref();
                });
            }

            // Node 0.4 and later won't accept empty data. Make sure it's needed.
            if (data) {
                this._request.write(data);
            }

            this._request.end();

            this.dispatchEvent("loadstart");
        } else { // Synchronous
            // Create a temporary file for communication with the other Node process
            const contentFile = ".node-xmlhttprequest-content-" + process.pid;
            const syncFile = ".node-xmlhttprequest-sync-" + process.pid;
            fs.writeFileSync(syncFile, "", "utf8");
            // The async request the other Node process executes
            const execString = "var http = require('http'), https = require('https'), fs = require('fs');"
                + "var doRequest = http" + (ssl ? "s" : "") + ".request;"
                + "var options = " + JSON.stringify(options) + ";"
                + "var responseText = '';"
                + "var req = doRequest(options, function(response) {"
                + "response.setEncoding('utf8');"
                + "response.on('data', function(chunk) {"
                + "  responseText += chunk;"
                + "});"
                + "response.on('end', function() {"
                + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-STATUS:' + response.statusCode + ',' + responseText, 'utf8');"
                + "fs.unlinkSync('" + syncFile + "');"
                + "});"
                + "response.on('error', function(error) {"
                + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
                + "fs.unlinkSync('" + syncFile + "');"
                + "});"
                + "}).on('error', function(error) {"
                + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
                + "fs.unlinkSync('" + syncFile + "');"
                + "});"
                + (data ? "req.write('" + JSON.stringify(data).slice(1, -1).replace(/'/g, "\\'") + "');" : "")
                + "req.end();";
            // Start the other Node Process, executing this string
            const syncProc = spawn(process.argv[0], ["-e", execString]);

            while (fs.existsSync(syncFile)) {
                // Wait while the sync file is empty
            }
            this.responseText = fs.readFileSync(contentFile, 'utf8');
            // Kill the child process once the file has data
            syncProc.stdin.end();
            // Remove the temporary file
            fs.unlinkSync(contentFile);
            if (this.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR:/)) {
                // If the file returned an error, handle it
                const errorObj = this.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, "");
                this.handleError(errorObj, 503);
            } else {
                // If the file returned okay, parse its data and move to the DONE state
                this.status = parseInt(this.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:([0-9]*),.*/, "$1"));
                this.responseText = this.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:[0-9]*,(.*)/, "$1");
                this.setState(DONE);
            }
        }
    }

    /**
     * Called when an error is encountered to deal with it.
     * @param  status  {number}    HTTP status code to use rather than the default (0) for XHR errors.
     */
    handleError(error: any, status?: number) {
        this.status = status || 0;
        this.statusText = error;
        this.responseText = error.stack;
        this.errorFlag = true;
        this.setState(DONE);
    }

    /**
     * Aborts a request.
     */
    abort() {
        if (this._request) {
            this._request.destroy();
            this._request = null!;
        }

        this.headers = { ...defaultHeaders };
        this.responseText = '';
        this.responseXML = '';

        this.errorFlag = this.abortedFlag = true
        if (this.readyState !== UNSENT
            && (this.readyState !== OPENED || this.sendFlag)
            && this.readyState !== DONE) {
            this.sendFlag = false;
            this.setState(DONE);
        }
        this.readyState = UNSENT;
    }


    setState(state: number) {
        if ((this.readyState === state) || (this.readyState === UNSENT && this.abortedFlag)) return

        this.readyState = state;

        if (this.asyn || this.readyState < OPENED || this.readyState === DONE) {
            this.dispatchEvent('readystatechange');
        }

        if (this.readyState === DONE) {
            let fire: string;

            if (this.abortedFlag){
                fire = 'abort'
            } else if (this.errorFlag) {
                fire = 'error'
            } else {
                fire = 'load'
            }

            this.dispatchEvent(fire);
            this.dispatchEvent('loadend');
        }
    }


    /**
    * Adds an event listener. Preferred method of binding to events.
    */
    addEventListener(event: string, callback: Function) {
        if (!(event in this.listeners)) {
            this.listeners[event] = [];
        }
        // Currently allows duplicate callbacks. Should it?
        this.listeners[event].push(callback);
    }

    /**
     * Remove an event callback that has already been bound.
     * Only works on the matching funciton, cannot be a copy.
     */
    removeEventListener(event: string, callback: Function) {
        if (event in this.listeners) {
            // Filter will return a new array with the callback removed
            this.listeners[event] = this.listeners[event].filter(ev => ev !== callback);
        }
    }

    dispatchEvent(event: string) {
        const evk = 'on' + event;
        if (isFunction((this as any)[evk])) {
            if (this.readyState === DONE) {
                setImmediate(() => { (this as any)[evk](this)})
            } else {
                (this as any)[evk].call(this)
            }
        }
        if (event in this.listeners) {
            for (let i = 0, len = this.listeners[event].length; i < len; i++) {
                if (this.readyState === DONE) {
                    setImmediate(() => { this.listeners[event][i](this) })
                } else {
                    this.listeners[event][i].call(this)
                }
            }
        }
    }


    /**
     * Check if the specified header is allowed.
     *
     * @param string header Header to validate
     * @return boolean False if not allowed, otherwise true
     */
    private isAllowedHttpHeader(header: string) {
        return this.disableHeaderCheck || (header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1);
    }

    /**
     * Check if the specified method is allowed.
     *
     * @param string method Request method to validate
     * @return boolean False if not allowed, otherwise true
     */
    private isAllowedHttpMethod(method: string) {
        return (method && forbiddenRequestMethods.indexOf(method) === -1);
    }

}


/**
 * Constants
 */

const UNSENT = 0;
const OPENED = 1;
const HEADERS_RECEIVED = 2;
const LOADING = 3;
const DONE = 4;

// Set some default headers
const defaultHeaders = {
    "User-Agent": "node-XMLHttpRequest",
    "Accept": "*/*"
};


// These headers are not user setable.
// The following are allowed but banned in the spec:
// * user-agent
const forbiddenRequestHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "content-transfer-encoding",
    "cookie",
    "cookie2",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "via"
];

// These request methods are not allowed
const forbiddenRequestMethods = [
    "TRACE",
    "TRACK",
    "CONNECT"
];

