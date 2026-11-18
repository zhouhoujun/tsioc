/**
 * Node, field, group and option translations for the visual workflow editor.
 *
 * Generated from the built-in node registry and plugin catalog. UI code must
 * resolve copy through `@tsdi/i18n`; the English strings passed by node
 * definitions are fallbacks only.
 */
export const WORKFLOW_NODE_TRANSLATIONS: Record<string, Record<string, any>> = {
    "en": {
        "node": {
            "start": {
                "label": "Start",
                "description": "Optional explicit entry point"
            },
            "end": {
                "label": "End",
                "description": "Optional explicit end point"
            },
            "inject": {
                "label": "Inject",
                "description": "Start a flow manually, on an interval, cron schedule, or event"
            },
            "task": {
                "label": "Task",
                "description": "Run a named action or return a fixed result"
            },
            "function": {
                "label": "Function",
                "description": "Transform the message with JavaScript"
            },
            "condition": {
                "label": "Condition",
                "description": "Branch on a value from the flow context"
            },
            "switch": {
                "label": "Switch",
                "description": "Route to one of four outputs using ordered rules"
            },
            "parallel": {
                "label": "Parallel",
                "description": "Run all outgoing branches concurrently"
            },
            "join": {
                "label": "Join",
                "description": "Wait for all incoming branches and merge their results"
            },
            "loop": {
                "label": "Loop",
                "description": "Run a sub-workflow repeatedly"
            },
            "trigger": {
                "label": "Trigger",
                "description": "Emit a payload after a delay"
            },
            "delay": {
                "label": "Delay",
                "description": "Pause for a fixed or random time"
            },
            "log": {
                "label": "Log",
                "description": "Write a message or value to the execution log"
            },
            "http-request": {
                "label": "HTTP request",
                "description": "Call an HTTP endpoint and read the response"
            },
            "assign": {
                "label": "Assign",
                "description": "Merge values into flow variables"
            },
            "transform": {
                "label": "Transform",
                "description": "Map the previous result into a new shape"
            },
            "template": {
                "label": "Template",
                "description": "Render text from context values"
            },
            "json": {
                "label": "JSON",
                "description": "Parse or stringify JSON values"
            },
            "csv": {
                "label": "CSV",
                "description": "Parse or stringify CSV text"
            },
            "change": {
                "label": "Change",
                "description": "Set, delete or append context fields"
            },
            "statistics": {
                "label": "Statistics",
                "description": "Aggregate an array into a number"
            },
            "merge": {
                "label": "Merge",
                "description": "Combine fields or arrays"
            },
            "event-emit": {
                "label": "Emit event",
                "description": "Publish an event to the host"
            },
            "event-wait": {
                "label": "Wait event",
                "description": "Wait for an event from the host"
            },
            "command": {
                "label": "Command",
                "description": "Run a host command or function"
            },
            "split": {
                "label": "Split",
                "description": "Split text or an array into items"
            },
            "map": {
                "label": "Map",
                "description": "Map each item to a new value"
            },
            "filter": {
                "label": "Filter",
                "description": "Keep items matching a condition"
            },
            "sort": {
                "label": "Sort",
                "description": "Sort items by a field"
            },
            "range": {
                "label": "Range",
                "description": "Generate a numeric range"
            },
            "batch": {
                "label": "Batch",
                "description": "Group items into batches"
            },
            "trycatch": {
                "label": "Try / catch",
                "description": "Route failures to an error branch"
            },
            "subprocess": {
                "label": "Sub workflow",
                "description": "Run another workflow"
            },
            "comment": {
                "label": "Comment",
                "description": "Canvas note; not executed"
            },
            "custom": {
                "label": "Custom",
                "description": "Run a custom activity or handler"
            },
            "mqtt-publish": {
                "label": "MQTT publish",
                "description": "Publish a message to an MQTT topic"
            },
            "mqtt-wait": {
                "label": "MQTT wait",
                "description": "Wait for the next message on an MQTT topic"
            },
            "redis-command": {
                "label": "Redis command",
                "description": "Run a Redis command and return its result"
            },
            "redis-publish": {
                "label": "Redis publish",
                "description": "Publish a message to a Redis channel"
            },
            "nats-publish": {
                "label": "NATS publish",
                "description": "Publish a message to a NATS subject"
            },
            "nats-request": {
                "label": "NATS request",
                "description": "Send a NATS request and wait for a reply"
            },
            "coap-request": {
                "label": "CoAP request",
                "description": "Send a CoAP request and return the response payload"
            },
            "gateway-route": {
                "label": "Gateway route",
                "description": "Forward matching requests to a microservice or static upstream"
            },
            "gateway-condition": {
                "label": "Gateway condition",
                "description": "Match path, method, host, header or query values"
            },
            "gateway-deny": {
                "label": "Gateway deny",
                "description": "Reject matching requests at the gateway"
            },
            "debug": {
                "label": "Debug",
                "description": "Inspect a value or the complete message"
            },
            "junction": {
                "label": "Junction",
                "description": "Merge wires without changing the message"
            },
            "sequence": {
                "label": "Sequence",
                "description": "Keep downstream steps in order"
            },
            "link": {
                "label": "Link",
                "description": "Jump to matching link nodes by name"
            },
            "html": {
                "label": "HTML",
                "description": "Extract text or links from HTML"
            },
            "xml": {
                "label": "XML",
                "description": "Parse or stringify XML documents"
            },
            "scale": {
                "label": "Scale",
                "description": "Map a number from one range to another"
            },
            "router": {
                "label": "Router",
                "description": "Route to one of four outputs using ordered rules"
            },
            "complete": {
                "label": "Complete",
                "description": "Run after matching nodes complete successfully"
            },
            "catch": {
                "label": "Catch",
                "description": "Run when a matching node fails"
            },
            "status": {
                "label": "Status",
                "description": "Run after the workflow finishes"
            },
            "websocket-request": {
                "label": "WebSocket request",
                "description": "Send a WebSocket message and optionally wait for the reply"
            },
            "tcp-request": {
                "label": "TCP request",
                "description": "Connect to a TCP server, send data and optionally wait for a reply"
            },
            "udp-request": {
                "label": "UDP request",
                "description": "Send a UDP datagram and optionally wait for a reply"
            },
            "file-read": {
                "label": "File read",
                "description": "Read a file from the workflow host"
            },
            "file-write": {
                "label": "File write",
                "description": "Write or append a file on the workflow host"
            },
            "yaml": {
                "label": "YAML",
                "description": "Parse or stringify YAML"
            },
            "rbe": {
                "label": "RBE",
                "description": "Keep array items only when the value changes"
            },
            "combine": {
                "label": "Combine",
                "description": "Combine several context values into one result"
            },
            "exec": {
                "label": "Exec",
                "description": "Run a host command and capture stdout/stderr"
            },
            "http-in": {
                "label": "HTTP in",
                "description": "Start the flow from an HTTP webhook request"
            },
            "http-response": {
                "label": "HTTP response",
                "description": "Send the HTTP response for a webhook request"
            },
            "tcp-in": {
                "label": "TCP in",
                "description": "Start the flow from a TCP message"
            },
            "udp-in": {
                "label": "UDP in",
                "description": "Start the flow from a UDP datagram"
            },
            "websocket-in": {
                "label": "WebSocket in",
                "description": "Start the flow from a WebSocket message"
            },
            "mqtt-in": {
                "label": "MQTT in",
                "description": "Start the flow from an MQTT message"
            },
            "mqtt-out": {
                "label": "MQTT out",
                "description": "Publish the message to an MQTT broker"
            },
            "tcp-out": {
                "label": "TCP out",
                "description": "Send the message to a TCP endpoint"
            },
            "udp-out": {
                "label": "UDP out",
                "description": "Send the message as a UDP datagram"
            },
            "websocket-out": {
                "label": "WebSocket out",
                "description": "Send the message to a WebSocket endpoint"
            },
            "tls": {
                "label": "TLS config",
                "description": "Reusable TLS options for outbound nodes"
            },
            "mqtt": {
                "label": "MQTT broker",
                "description": "Shared MQTT broker connection for MQTT nodes"
            },
            "file-in": {
                "label": "File in",
                "description": "Read a file from the workflow workspace"
            },
            "file-out": {
                "label": "File out",
                "description": "Write a file inside the workflow workspace"
            },
            "watch": {
                "label": "Watch",
                "description": "Start the flow when a file or folder changes"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "Payload fields",
                "topic": "Topic",
                "payloadType": "Payload type",
                "trigger": "Trigger",
                "onceDelay": "Delay before first injection",
                "interval": "Interval",
                "intervalUnit": "Interval unit",
                "repeatCount": "Repeat count",
                "event": "Event name",
                "timeout": "Wait timeout",
                "payloadValue": "Payload value",
                "cron": "Cron expression"
            },
            "task": {
                "action": "Action name",
                "result": "Result when no action",
                "fail": "Mark as failed",
                "retry": "Retries",
                "retryDelay": "Retry delay",
                "timeout": "Timeout"
            },
            "function": {
                "code": "JavaScript code",
                "timeout": "Timeout",
                "initialize": "Initialize code",
                "finalize": "Finalize code"
            },
            "condition": {
                "field": "Value path",
                "operator": "Operator",
                "value": "Compare to"
            },
            "switch": {
                "field": "Value path",
                "value": "Compare to",
                "rules": "Rules",
                "operator": "Operator"
            },
            "parallel": {},
            "join": {
                "mode": "Mode",
                "resultField": "Result field",
                "ignoreEmpty": "Skip empty branches",
                "keyField": "Key field",
                "valueField": "Value field",
                "count": "Branch count",
                "timeout": "Wait timeout"
            },
            "loop": {
                "iterations": "Iterations",
                "delay": "Delay",
                "workflow": "Sub-workflow source"
            },
            "trigger": {
                "delay": "Delay",
                "payload": "Payload (JSON)",
                "emitSecond": "Send a second message",
                "secondDelay": "Second delay",
                "secondPayload": "Second payload",
                "newMessage": "New message"
            },
            "delay": {
                "mode": "Mode",
                "delay": "Delay",
                "randomMin": "Minimum",
                "randomMax": "Maximum",
                "unit": "Unit",
                "rateCount": "Messages per window",
                "rateWindow": "Rate window",
                "rateAction": "Excess messages"
            },
            "log": {
                "message": "Static message",
                "field": "Value path",
                "complete": "Log full context",
                "level": "Level"
            },
            "http-request": {
                "url": "Request URL",
                "method": "Method",
                "headers": "Headers (JSON)",
                "body": "Body",
                "responseType": "Response handling",
                "retry": "Retries",
                "retryDelay": "Retry delay",
                "timeout": "Timeout",
                "authType": "Authentication",
                "username": "Username",
                "password": "Password",
                "token": "Bearer token"
            },
            "assign": {
                "values": "Values (JSON)"
            },
            "transform": {
                "mapping": "Mapping (JSON)",
                "result": "Fixed result (JSON)"
            },
            "template": {
                "template": "Template",
                "syntax": "Syntax",
                "target": "Write result to",
                "output": "Output type"
            },
            "json": {
                "mode": "Mode",
                "field": "Value path",
                "pretty": "Pretty print"
            },
            "csv": {
                "mode": "Mode",
                "field": "Value path",
                "delimiter": "Delimiter",
                "header": "First row is header",
                "columns": "Columns"
            },
            "change": {
                "action": "Action",
                "field": "Field path",
                "value": "Value",
                "rules": "Rules"
            },
            "statistics": {
                "field": "Array path",
                "path": "Item path",
                "operation": "Operation",
                "resultField": "Result field"
            },
            "merge": {
                "fields": "Fields",
                "mode": "Mode",
                "resultField": "Result field"
            },
            "event-emit": {
                "event": "Event name",
                "payload": "Payload (JSON)"
            },
            "event-wait": {
                "event": "Event name",
                "timeout": "Timeout"
            },
            "command": {
                "command": "Command",
                "args": "Arguments",
                "timeout": "Timeout",
                "value": "Argument"
            },
            "split": {
                "field": "Value path",
                "delimiter": "Delimiter",
                "mode": "Mode"
            },
            "map": {
                "field": "Array path",
                "path": "Item path"
            },
            "filter": {
                "field": "Array path",
                "path": "Item path",
                "operator": "Operator",
                "value": "Compare to"
            },
            "sort": {
                "field": "Array path",
                "path": "Item path",
                "order": "Order",
                "numeric": "Numeric compare"
            },
            "range": {
                "from": "From",
                "to": "To",
                "step": "Step"
            },
            "batch": {
                "field": "Array path",
                "size": "Batch size",
                "overlap": "Overlap"
            },
            "trycatch": {
                "timeout": "Timeout"
            },
            "subprocess": {
                "workflow": "Workflow id or JSON",
                "inputs": "Input ports",
                "outputs": "Output ports"
            },
            "comment": {
                "text": "Text"
            },
            "custom": {
                "result": "Result"
            },
            "mqtt-publish": {
                "url": "Broker URL",
                "topic": "Topic",
                "qos": "QoS",
                "timeout": "Timeout (ms)",
                "payload": "Payload",
                "retain": "Retain"
            },
            "mqtt-wait": {
                "url": "Broker URL",
                "topic": "Topic",
                "qos": "QoS",
                "timeout": "Timeout (ms)"
            },
            "redis-command": {
                "url": "Redis URL",
                "command": "Command",
                "args": "Arguments"
            },
            "redis-publish": {
                "url": "Redis URL",
                "channel": "Channel",
                "message": "Message"
            },
            "nats-publish": {
                "servers": "NATS servers",
                "subject": "Subject",
                "payload": "Payload",
                "timeout": "Timeout (ms)"
            },
            "nats-request": {
                "servers": "NATS servers",
                "subject": "Subject",
                "payload": "Payload",
                "timeout": "Timeout (ms)"
            },
            "coap-request": {
                "host": "Host",
                "port": "Port",
                "method": "Method",
                "path": "Path",
                "payload": "Payload",
                "timeout": "Timeout (ms)"
            },
            "gateway-route": {
                "path": "Inbound path",
                "service": "Service",
                "targetUrl": "Target URL",
                "targetPath": "Target path",
                "stripPrefix": "Strip prefix",
                "timeout": "Timeout (ms)",
                "priority": "Priority",
                "headers": "Request headers",
                "responseHeaders": "Response headers",
                "rateLimit": "Rate limit",
                "cache": "Cache",
                "circuitBreaker": "Circuit breaker",
                "bulkhead": "Bulkhead"
            },
            "gateway-condition": {
                "field": "Field",
                "name": "Header / query name",
                "operator": "Operator",
                "value": "Value"
            },
            "gateway-deny": {
                "status": "Status",
                "message": "Message",
                "priority": "Priority",
                "body": "Body"
            },
            "debug": {
                "field": "Value path",
                "complete": "Complete message",
                "level": "Level",
                "console": "Also print to console",
                "active": "Enabled"
            },
            "link": {
                "mode": "Mode",
                "links": "Links"
            },
            "html": {
                "field": "HTML path",
                "mode": "Output",
                "target": "Write result to",
                "tag": "Tag",
                "attribute": "Attribute name"
            },
            "xml": {
                "mode": "Mode",
                "field": "XML path",
                "target": "Write result to",
                "pretty": "Pretty print",
                "attributes": "Include attributes",
                "text": "Include text"
            },
            "scale": {
                "field": "Value path",
                "inMin": "Input minimum",
                "inMax": "Input maximum",
                "outMin": "Output minimum",
                "outMax": "Output maximum",
                "clamp": "Clamp to range",
                "round": "Round result",
                "target": "Write result to"
            },
            "router": {
                "field": "Value path",
                "rules": "Rules",
                "operator": "Operator",
                "value": "Compare to"
            },
            "complete": {
                "scope": "Scope"
            },
            "catch": {
                "scope": "Scope"
            },
            "status": {
                "scope": "Scope"
            },
            "websocket-request": {
                "url": "URL",
                "headers": "Headers",
                "message": "Message fields",
                "payload": "Payload",
                "waitForReply": "Wait for reply",
                "timeout": "Timeout"
            },
            "tcp-request": {
                "host": "Host",
                "port": "Port",
                "payload": "Payload",
                "waitForReply": "Wait for reply",
                "timeout": "Timeout"
            },
            "udp-request": {
                "host": "Host",
                "port": "Port",
                "payload": "Payload",
                "waitForReply": "Wait for reply",
                "timeout": "Timeout"
            },
            "file-read": {
                "path": "File path",
                "encoding": "Encoding",
                "output": "Write result to"
            },
            "file-write": {
                "path": "File path",
                "encoding": "Encoding",
                "content": "Content",
                "append": "Append",
                "createDirs": "Create parent folders"
            },
            "yaml": {
                "mode": "Mode",
                "field": "Value path",
                "target": "Write result to"
            },
            "rbe": {
                "field": "Array path",
                "path": "Item path",
                "mode": "Report"
            },
            "combine": {
                "fields": "Fields",
                "mode": "Mode",
                "separator": "Separator",
                "resultField": "Result field"
            },
            "exec": {
                "command": "Command",
                "args": "Arguments",
                "cwd": "Working directory",
                "env": "Environment",
                "timeout": "Timeout",
                "output": "Write stdout to"
            },
            "http-in": {
                "method": "Method",
                "path": "Path"
            },
            "http-response": {
                "statusCode": "Status code",
                "headers": "Headers",
                "body": "Body path"
            },
            "tcp-in": {
                "host": "Host",
                "port": "Port",
                "reply": "Reply with result"
            },
            "udp-in": {
                "host": "Host",
                "port": "Port",
                "reply": "Reply with result"
            },
            "websocket-in": {
                "host": "Host",
                "port": "Port",
                "path": "Path",
                "reply": "Reply with result"
            },
            "mqtt-in": {
                "url": "Broker URL",
                "topic": "Topic",
                "qos": "QoS",
                "clientId": "Client id",
                "username": "Username",
                "password": "Password",
                "mqtt": "Broker config"
            },
            "mqtt-out": {
                "url": "Broker URL",
                "topic": "Topic",
                "payload": "Payload path",
                "qos": "QoS",
                "retain": "Retain",
                "clientId": "Client id",
                "username": "Username",
                "password": "Password",
                "tls": "TLS config",
                "mqtt": "Broker config"
            },
            "tcp-out": {
                "host": "Host",
                "port": "Port",
                "payload": "Payload path",
                "timeout": "Timeout",
                "tls": "TLS config"
            },
            "udp-out": {
                "host": "Host",
                "port": "Port",
                "payload": "Payload path"
            },
            "websocket-out": {
                "url": "URL",
                "payload": "Payload path",
                "timeout": "Timeout",
                "tls": "TLS config"
            },
            "tls": {
                "ca": "CA certificate",
                "cert": "Client certificate",
                "key": "Client key",
                "servername": "Server name",
                "rejectUnauthorized": "Verify certificate"
            },
            "mqtt": {
                "url": "Broker URL",
                "clientId": "Client id",
                "username": "Username",
                "password": "Password",
                "tls": "TLS config",
                "keepalive": "Keepalive"
            },
            "file-in": {
                "path": "Path",
                "encoding": "Encoding",
                "parse": "Parse"
            },
            "file-out": {
                "path": "Path",
                "payload": "Payload path",
                "encoding": "Encoding",
                "append": "Append",
                "mkdir": "Create folders"
            },
            "watch": {
                "path": "Path",
                "recursive": "Recursive",
                "debounce": "Debounce",
                "event": "Event"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "orders.created",
                "payload": "{ \"value\": 1 }",
                "onceDelay": "0",
                "interval": "1",
                "repeatCount": "1",
                "event": "order.created",
                "timeout": "30",
                "cron": "0 9 * * 1-5"
            },
            "task": {
                "action": "actions.fetch",
                "result": "{ \"ok\": true }"
            },
            "function": {
                "code": "return { ok: true };"
            },
            "condition": {
                "field": "approved",
                "value": "true"
            },
            "switch": {
                "field": "result.status",
                "value": "done"
            },
            "parallel": {},
            "join": {
                "resultField": "joined",
                "keyField": "key",
                "valueField": "value"
            },
            "loop": {
                "workflow": "workflow_id"
            },
            "trigger": {
                "payload": "{ \"ok\": true }",
                "secondPayload": "{ \"done\": true }"
            },
            "delay": {},
            "log": {
                "message": "Flow step completed",
                "field": "result.value"
            },
            "http-request": {
                "url": "https://api.example.com/items",
                "headers": "{ \"Accept\": \"application/json\" }",
                "body": "{ \"name\": \"demo\" }"
            },
            "assign": {
                "values": "{ \"count\": 1 }"
            },
            "transform": {
                "mapping": "{ \"name\": \"input.name\" }"
            },
            "template": {
                "template": "Hello {{name}}",
                "target": "message"
            },
            "json": {
                "field": "value"
            },
            "csv": {
                "field": "value",
                "delimiter": ",",
                "columns": "name, age"
            },
            "change": {
                "field": "variables.name",
                "value": "\"workflow\""
            },
            "statistics": {
                "field": "items",
                "path": "value",
                "resultField": "value"
            },
            "merge": {
                "fields": "a, b",
                "resultField": "value"
            },
            "event-emit": {
                "payload": "{ \"id\": 1 }",
                "event": "order.created"
            },
            "event-wait": {
                "event": "order.created"
            },
            "command": {
                "command": "context.exec",
                "args": "[\"--flag\"]"
            },
            "split": {
                "field": "items",
                "delimiter": ","
            },
            "map": {
                "field": "items",
                "path": "value"
            },
            "filter": {
                "field": "items",
                "path": "value"
            },
            "sort": {
                "field": "items",
                "path": "value"
            },
            "range": {},
            "batch": {
                "field": "items",
                "overlap": "0"
            },
            "trycatch": {},
            "subprocess": {
                "workflow": "workflow_id",
                "inputs": "{ \"orderId\": \"payload.id\" }",
                "outputs": "{ \"total\": \"payload.total\" }"
            },
            "comment": {
                "text": "Canvas note"
            },
            "custom": {
                "result": "{ \"ok\": true }"
            },
            "mqtt-publish": {},
            "mqtt-wait": {},
            "redis-command": {},
            "redis-publish": {},
            "nats-publish": {},
            "nats-request": {},
            "coap-request": {},
            "gateway-route": {
                "path": "/api/users",
                "service": "users-service",
                "targetUrl": "http://127.0.0.1:3001",
                "targetPath": "/users",
                "headers": "{ \"x-gateway\": \"1\" }",
                "responseHeaders": "{ \"x-served-by\": \"gateway\" }",
                "rateLimit": "{ \"limit\": 100, \"windowMs\": 60000 }",
                "cache": "{ \"enabled\": true, \"ttl\": 30000 }",
                "circuitBreaker": "{ \"failureThreshold\": 5 }",
                "bulkhead": "{ \"maxConcurrent\": 20 }"
            },
            "gateway-condition": {
                "name": "x-role",
                "value": "/api/users"
            },
            "gateway-deny": {
                "body": "{ \"error\": \"forbidden\" }"
            },
            "debug": {
                "field": "payload"
            },
            "html": {
                "field": "body",
                "target": "value",
                "tag": "h1",
                "attribute": "href"
            },
            "xml": {
                "field": "value",
                "target": "value"
            },
            "link": {
                "links": "flow-a, flow-b"
            },
            "scale": {
                "field": "value",
                "target": "value"
            },
            "router": {
                "field": "result.status"
            },
            "complete": {
                "scope": "node id or type"
            },
            "catch": {
                "scope": "node id or type"
            },
            "status": {
                "scope": "node id or type"
            },
            "websocket-request": {},
            "tcp-request": {
                "host": "127.0.0.1",
                "port": "9000"
            },
            "udp-request": {
                "host": "127.0.0.1",
                "port": "9000"
            },
            "file-read": {
                "output": "content"
            },
            "file-write": {},
            "exec": {
                "command": "/usr/bin/node",
                "cwd": "./",
                "env": "KEY"
            },
            "combine": {
                "fields": "first, second"
            },
            "yaml": {
                "field": "value",
                "target": "value"
            },
            "rbe": {
                "field": "items",
                "path": "value"
            },
            "http-in": {
                "path": "/orders"
            },
            "http-response": {
                "headers": "{ \"x-flow\": \"done\" }",
                "body": "payload"
            },
            "tcp-in": {
                "host": "0.0.0.0",
                "port": "3000"
            },
            "udp-in": {
                "host": "0.0.0.0",
                "port": "3000"
            },
            "websocket-in": {
                "host": "0.0.0.0",
                "port": "3000",
                "path": "/ws"
            },
            "mqtt-in": {
                "url": "mqtt://broker:1883",
                "topic": "sensors/+/temp",
                "clientId": "auto",
                "mqtt": "mqtt_1"
            },
            "mqtt-out": {
                "url": "mqtt://broker:1883",
                "topic": "sensors/temp",
                "clientId": "auto",
                "tls": "tls_1",
                "mqtt": "mqtt_1"
            },
            "tcp-out": {
                "host": "127.0.0.1",
                "tls": "tls_1"
            },
            "udp-out": {
                "host": "127.0.0.1"
            },
            "websocket-out": {
                "url": "ws://host:port/path",
                "tls": "tls_1"
            },
            "tls": {
                "servername": "broker.example.com"
            },
            "mqtt": {
                "url": "mqtt://broker:1883",
                "clientId": "auto",
                "tls": "tls_1"
            },
            "file-in": {
                "path": "data/input.json"
            },
            "file-out": {
                "path": "data/output.json"
            },
            "watch": {
                "path": "data"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "optional topic carried with the payload",
                "payload": "edit injected object fields as key/value rows",
                "payloadType": "choose the value type; JSON merges into the context",
                "trigger": "choose manual, interval or event triggering",
                "onceDelay": "wait before the first injection",
                "interval": "time between injections",
                "intervalUnit": "unit used by the interval",
                "repeatCount": "number of runs; 0 runs until stopped",
                "event": "event that triggers the injection",
                "timeout": "maximum time to wait for the event",
                "payloadValue": "string, number or boolean value to inject",
                "cron": "Five fields: minute hour day month weekday."
            },
            "task": {
                "action": "name of a function in context.actions; leave empty to return the result below",
                "result": "JSON returned when no action is set",
                "retry": "automatic retries before the step fails",
                "fail": "force this step to fail so error branches can run",
                "retryDelay": "wait time between retries",
                "timeout": "maximum time for this step; 0 means no limit"
            },
            "function": {
                "code": "return the next message; context and input expose the flow context",
                "timeout": "maximum time for this step; 0 means no limit",
                "initialize": "Optional code that runs before the main function. Returned objects are merged into the context.",
                "finalize": "Optional code that runs after the main function for cleanup or metrics."
            },
            "condition": {
                "field": "context path to test, for example approved or user.role",
                "operator": "comparison used to choose the true or false output",
                "value": "value used by the selected operator"
            },
            "switch": {
                "field": "Context value compared against each rule.",
                "value": "Value used by the selected operator.",
                "rules": "Rules are checked from top to bottom; the first match selects the numbered output.",
                "operator": "Comparison used by this rule."
            },
            "parallel": {},
            "join": {
                "mode": "Collect branch results as an array or merge their data objects.",
                "resultField": "Context field that receives the joined value.",
                "ignoreEmpty": "Leave branches without result data out of the joined value.",
                "keyField": "Branch result property used as the object key.",
                "valueField": "Branch result property stored under each key. Empty stores the whole branch result.",
                "count": "How many successful branches are included.",
                "timeout": "Proceed with settled branches after this wait."
            },
            "loop": {
                "iterations": "Number of times to run the sub-workflow.",
                "delay": "Wait between sub-workflow runs.",
                "workflow": "Workflow id, context path, or inline JSON definition to repeat."
            },
            "trigger": {
                "delay": "time to wait before emitting the payload",
                "payload": "JSON emitted when the trigger fires",
                "emitSecond": "Emit another payload after the first one reached the branch.",
                "secondDelay": "Time to wait after the first message before emitting the second.",
                "secondPayload": "Payload merged into the second message.",
                "newMessage": "How concurrent messages through this trigger are handled."
            },
            "delay": {
                "delay": "pause duration before the next node",
                "mode": "fixed waits a set time; random picks a value in the range",
                "randomMin": "minimum random delay",
                "randomMax": "maximum random delay",
                "unit": "unit used by the delay values",
                "rateCount": "How many messages may pass inside the rate window.",
                "rateWindow": "Sliding window used to count messages.",
                "rateAction": "Drop excess messages or queue them until the window frees up."
            },
            "log": {
                "message": "text written when no value path is set",
                "field": "context path to log, for example result.value",
                "complete": "write the complete flow context",
                "level": "log level: info, warn or error"
            },
            "http-request": {
                "url": "absolute endpoint or a host path starting with /",
                "method": "HTTP request method",
                "headers": "JSON object of request headers",
                "body": "request body for POST, PUT or PATCH",
                "responseType": "auto parses JSON when possible; text keeps raw text; JSON fails on invalid JSON",
                "retry": "automatic retries after a failed request",
                "retryDelay": "wait time between retries",
                "timeout": "maximum wait time for the request",
                "authType": "Optional HTTP authentication.",
                "username": "Basic authentication username.",
                "password": "Basic authentication password. Use {{credential:name}} to read a stored credential.",
                "token": "Bearer token. Use {{credential:name}} to read a stored credential."
            },
            "assign": {
                "values": "JSON object merged into flow variables"
            },
            "transform": {
                "mapping": "target field to context path mapping",
                "result": "fixed JSON result"
            },
            "template": {
                "template": "text with placeholders such as {{name}} or {{user.email}}",
                "target": "context field that receives the rendered value",
                "syntax": "Mustache replaces placeholders; plain text is used as-is",
                "output": "text keeps a string; JSON parses the rendered text"
            },
            "json": {
                "field": "context path to parse or stringify",
                "mode": "parse JSON text or stringify a value",
                "pretty": "indent the serialized JSON"
            },
            "csv": {
                "field": "context path to CSV text or an array",
                "delimiter": "single character between columns",
                "mode": "parse CSV text or stringify an array",
                "header": "treat the first row as column names",
                "columns": "Optional comma-separated columns to keep when parsing or stringifying."
            },
            "change": {
                "field": "context path to modify, for example variables.name",
                "value": "new value; JSON is supported",
                "rules": "rules run in order, one change per row",
                "action": "Set replaces, Delete removes, Append adds to a list or string"
            },
            "statistics": {
                "field": "context path to the array to aggregate",
                "path": "property of each item used for the calculation",
                "operation": "count, sum, average, min or max",
                "resultField": "field that receives the result"
            },
            "merge": {
                "fields": "comma-separated context fields to merge",
                "mode": "object merge or array concat",
                "resultField": "field that receives the result"
            },
            "event-emit": {
                "event": "event name shared by emitters and waiters",
                "payload": "JSON data sent with the event"
            },
            "event-wait": {
                "event": "event name to wait for",
                "timeout": "maximum time to wait for the event"
            },
            "command": {
                "args": "Ordered arguments passed to the command.",
                "command": "host command or function name",
                "timeout": "maximum execution time for the command"
            },
            "split": {
                "field": "text or array path to split",
                "delimiter": "separator used when splitting text",
                "mode": "Auto detects arrays and text, or force one mode."
            },
            "map": {
                "path": "property of each item to map",
                "field": "array path to iterate"
            },
            "filter": {
                "field": "array path to filter",
                "path": "item property used for comparison",
                "operator": "comparison operator",
                "value": "value used for comparison"
            },
            "sort": {
                "path": "item property used for sorting",
                "field": "array path to sort",
                "order": "ascending or descending",
                "numeric": "Compare values as numbers instead of text."
            },
            "range": {
                "from": "inclusive start value",
                "to": "exclusive end value",
                "step": "amount added on each step"
            },
            "batch": {
                "size": "number of items per batch",
                "field": "array path to split into batches",
                "overlap": "items repeated at the start of the next batch; 0 disables overlap"
            },
            "trycatch": {
                "timeout": "route to the timeout port after this delay"
            },
            "subprocess": {
                "workflow": "Stored workflow id, context path, or inline definition JSON.",
                "inputs": "Child context key to parent context path.",
                "outputs": "Parent context key to child result path."
            },
            "comment": {},
            "custom": {
                "result": "Value returned by the custom node."
            },
            "mqtt-publish": {},
            "mqtt-wait": {},
            "redis-command": {
                "args": "JSON array of command arguments."
            },
            "redis-publish": {},
            "nats-publish": {},
            "nats-request": {},
            "coap-request": {},
            "gateway-route": {
                "path": "Defaults to the path condition value.",
                "priority": "Lower runs first."
            },
            "gateway-condition": {},
            "gateway-deny": {
                "priority": "Lower runs first."
            },
            "debug": {
                "field": "context path to inspect",
                "complete": "print the complete workflow context",
                "console": "also write to the host console for development",
                "level": "output level: info, warn or error",
                "active": "turn off to keep the node but skip its output"
            },
            "link": {
                "mode": "Send from this node (link out) or receive from matching names (link in).",
                "links": "Comma separated names shared by link-out and link-in nodes."
            },
            "html": {
                "field": "context path containing HTML text",
                "mode": "text strips markup; links collects href and src values",
                "target": "context field that receives the extracted value",
                "tag": "only extract content from this tag; leave empty for the whole document",
                "attribute": "Attribute to collect when output is Attribute, for example href or src."
            },
            "xml": {
                "mode": "parse XML text or serialize an object back to XML",
                "field": "context path containing XML text or an object",
                "target": "context field that receives the result",
                "pretty": "indent serialized XML",
                "attributes": "Include XML attributes as @attrs in the parsed result.",
                "text": "Include element text as #text in the parsed result."
            },
            "scale": {
                "field": "context path of the number to map",
                "inMin": "minimum of the input range",
                "inMax": "maximum of the input range",
                "outMin": "minimum of the output range",
                "outMax": "maximum of the output range",
                "clamp": "keep the result inside the output range",
                "round": "round the result to an integer",
                "target": "field that receives the mapped value"
            },
            "router": {
                "field": "Context value compared against each rule.",
                "rules": "Rules are checked from top to bottom; the first match selects the numbered output.",
                "operator": "Comparison used by this rule.",
                "value": "Value used by the selected operator."
            },
            "complete": {
                "scope": "Only run for this node id or type. Leave empty to match anything."
            },
            "catch": {
                "scope": "Only run for this node id or type. Leave empty to match anything."
            },
            "status": {
                "scope": "Only run for this node id or type. Leave empty to match anything."
            },
            "websocket-request": {
                "url": "WebSocket endpoint, e.g. wss://example.com/socket",
                "headers": "Connection headers, edited as key/value rows",
                "message": "JSON message to send",
                "payload": "text payload to send",
                "waitForReply": "wait for a server reply",
                "timeout": "maximum wait time for the reply"
            },
            "tcp-request": {
                "host": "server host",
                "port": "server port",
                "payload": "text payload to send",
                "waitForReply": "wait for a server reply",
                "timeout": "maximum wait time for the reply"
            },
            "udp-request": {
                "host": "server host",
                "port": "server port",
                "payload": "text payload to send",
                "waitForReply": "wait for a server reply",
                "timeout": "maximum wait time for the reply"
            },
            "file-read": {
                "path": "path relative to the host working directory",
                "encoding": "file encoding",
                "output": "context field that receives the file content"
            },
            "file-write": {
                "path": "path relative to the host working directory",
                "encoding": "file encoding",
                "content": "text written to the file",
                "append": "append instead of overwrite",
                "createDirs": "create parent folders before writing"
            },
            "yaml": {
                "mode": "Parse YAML text or stringify a value.",
                "field": "Context path containing YAML text or an object.",
                "target": "Context field that receives the result."
            },
            "rbe": {
                "field": "Context path to the array to filter.",
                "path": "Property compared between consecutive items.",
                "mode": "Keep the first item and each change of the compared value."
            },
            "combine": {
                "fields": "Comma-separated context paths to combine.",
                "mode": "Object merge, array concat or text join.",
                "separator": "Text placed between joined values.",
                "resultField": "Context field that receives the combined value."
            },
            "exec": {
                "command": "Executable to run on the workflow host.",
                "args": "Arguments passed to the executable, one row per argument.",
                "cwd": "Directory the command runs in. Defaults to the host working directory.",
                "env": "Extra environment variables merged into the host environment.",
                "timeout": "Kill the command after this many milliseconds. 0 waits indefinitely.",
                "output": "Context field that receives the standard output."
            },
            "http-in": {
                "method": "HTTP method that triggers this branch.",
                "path": "Request path this node serves. Leave empty to accept any path."
            },
            "http-response": {
                "statusCode": "HTTP status code returned to the caller.",
                "headers": "Response headers as a JSON object.",
                "body": "Context path used as the response body."
            },
            "tcp-in": {
                "host": "Interface to listen on. Use 0.0.0.0 for all interfaces.",
                "port": "Port to listen on. 0 selects a free port.",
                "reply": "Send the final node result back to the sender."
            },
            "udp-in": {
                "host": "Interface to listen on. Use 0.0.0.0 for all interfaces.",
                "port": "Port to listen on. 0 selects a free port.",
                "reply": "Send the final node result back to the sender."
            },
            "websocket-in": {
                "host": "Interface to listen on. Use 0.0.0.0 for all interfaces.",
                "port": "Port to listen on. 0 selects a free port.",
                "path": "Optional WebSocket upgrade path such as /ws.",
                "reply": "Send the final node result back to the client."
            },
            "mqtt-in": {
                "url": "Inline override; prefer an MQTT broker config node.",
                "topic": "Subscription filter; + and # wildcards are supported.",
                "qos": "Delivery guarantee for the subscription.",
                "clientId": "Optional client id; generated when empty.",
                "username": "Broker username.",
                "password": "Broker password. Use {{credential:name}} to read a stored credential.",
                "mqtt": "Id of an MQTT broker config node shared by every MQTT node; inline settings below override it."
            },
            "mqtt-out": {
                "url": "Inline override; prefer an MQTT broker config node.",
                "topic": "Topic to publish to.",
                "payload": "Context path used as the message payload.",
                "qos": "Delivery guarantee for the publish.",
                "retain": "Ask the broker to keep the last message on the topic.",
                "clientId": "Optional client id; generated when empty.",
                "username": "Broker username.",
                "password": "Broker password. Use {{credential:name}} to read a stored credential.",
                "tls": "Id of a TLS config node; mqtts:// already encrypts the connection.",
                "mqtt": "Id of an MQTT broker config node shared by every MQTT node; inline settings below override it."
            },
            "tcp-out": {
                "payload": "Context path used as the payload.",
                "tls": "Id of a TLS config node; leave empty for plain TCP."
            },
            "udp-out": {
                "payload": "Context path used as the datagram payload."
            },
            "websocket-out": {
                "url": "ws:// or wss:// endpoint.",
                "payload": "Context path used as the message payload.",
                "tls": "Id of a TLS config node; leave empty for plain WebSocket."
            },
            "tls": {
                "ca": "PEM chain; use {{credential:name}} to read a stored secret.",
                "cert": "PEM certificate; use {{credential:name}} to read a stored secret.",
                "key": "PEM private key; use {{credential:name}} to read a stored secret."
            },
            "mqtt": {
                "url": "mqtt:// broker, or mqtts:// for TLS.",
                "clientId": "Optional client id; generated when empty.",
                "username": "Broker username.",
                "password": "Broker password. Use {{credential:name}} to read a stored credential.",
                "tls": "Id of a TLS config node for client certificates.",
                "keepalive": "Seconds between keepalive pings."
            },
            "file-in": {
                "path": "Absolute path or a path inside the workspace root.",
                "encoding": "Read the file as UTF-8 text or base64.",
                "parse": "Parse valid JSON automatically, or keep the raw text."
            },
            "file-out": {
                "path": "Absolute path or a path inside the workspace root.",
                "payload": "Context path used as the file content.",
                "encoding": "Write UTF-8 text or base64 content.",
                "append": "Append instead of replacing the file.",
                "mkdir": "Create missing parent folders."
            },
            "watch": {
                "path": "File or directory to watch (workspace-relative or absolute).",
                "recursive": "Watch nested directories as well.",
                "debounce": "Wait this long before emitting a change.",
                "event": "Restrict to renames or content changes."
            }
        },
        "group": {
            "reliability": "Reliability",
            "options": "Options",
            "delay": "Delay",
            "request": "Request",
            "template": "Template",
            "output": "Output",
            "payload": "Payload",
            "authentication": "Authentication",
            "input-range": "Input range",
            "output-range": "Output range",
            "trigger": "Trigger"
        },
        "option": {
            "truthy": "is truthy",
            "equals": "equals",
            "not-equals": "not equals",
            "gt": "greater than",
            "lt": "less than",
            "fixed": "Fixed delay",
            "random": "Random delay",
            "info": "info",
            "warn": "warn",
            "error": "error",
            "GET": "GET",
            "POST": "POST",
            "PUT": "PUT",
            "PATCH": "PATCH",
            "DELETE": "DELETE",
            "auto": "Auto",
            "json": "JSON",
            "text": "Text",
            "mustache": "Mustache",
            "plain": "Plain text",
            "parse": "Parse",
            "stringify": "Stringify",
            "set": "Set",
            "delete": "Delete",
            "append": "Append",
            "count": "First N branches",
            "sum": "Sum",
            "avg": "Average",
            "min": "Min",
            "max": "Max",
            "object": "Object merge",
            "array": "Branch results array",
            "asc": "Ascending",
            "desc": "Descending",
            "path": "Path",
            "method": "Method",
            "host": "Host",
            "header": "Header",
            "query": "Query",
            "prefix": "prefix",
            "not-prefix": "not prefix",
            "exists": "exists",
            "not-exists": "not exists",
            "links": "Links",
            "string": "String",
            "number": "Number",
            "boolean": "Boolean",
            "none": "None",
            "basic": "Basic",
            "milliseconds": "Milliseconds",
            "seconds": "Seconds",
            "minutes": "Minutes",
            "attribute": "Attribute",
            "contains": "contains",
            "regex": "matches regex",
            "gte": "greater or equal",
            "lte": "less or equal",
            "manual": "Manual / once",
            "interval": "Interval",
            "event": "Event",
            "cron": "Cron schedule",
            "utf8": "UTF-8",
            "base64": "Base64",
            "hex": "Hex",
            "change": "On any change",
            "merge": "Merged object",
            "concat": "Array concat",
            "ms": "ms",
            "s": "s",
            "value": "On value change",
            "ANY": "Any method",
            "out": "Link out",
            "in": "Link in",
            "rate": "Rate limit",
            "drop": "Drop",
            "queue": "Queue",
            "key": "Keys object",
            "parallel": "Run every message",
            "restart": "Restart pending delay",
            "timeout": "Wait with timeout",
            "bearer": "Bearer token",
            "0": "0",
            "1": "1",
            "all": "All changes",
            "rename": "Renames only"
        }
    },
    "zh-CN": {
        "node": {
            "start": {
                "label": "开始",
                "description": "可选的显式入口"
            },
            "end": {
                "label": "结束",
                "description": "可选的显式结束点"
            },
            "inject": {
                "label": "注入",
                "description": "手动、周期、Cron 或事件触发流程"
            },
            "task": {
                "label": "任务",
                "description": "执行命名动作或返回固定结果"
            },
            "function": {
                "label": "函数",
                "description": "使用 JavaScript 处理消息"
            },
            "condition": {
                "label": "条件",
                "description": "根据流程上下文的值分支"
            },
            "switch": {
                "label": "多路分支",
                "description": "按顺序匹配规则并选择四个输出之一"
            },
            "parallel": {
                "label": "并行",
                "description": "并发执行所有输出分支"
            },
            "join": {
                "label": "汇聚",
                "description": "等待所有入分支并合并其结果"
            },
            "loop": {
                "label": "循环",
                "description": "重复执行子工作流"
            },
            "trigger": {
                "label": "触发",
                "description": "延迟后输出数据"
            },
            "delay": {
                "label": "延迟",
                "description": "按固定或随机时间暂停"
            },
            "log": {
                "label": "日志",
                "description": "将消息或值写入执行日志"
            },
            "http-request": {
                "label": "HTTP 请求",
                "description": "调用 HTTP 接口并读取响应"
            },
            "assign": {
                "label": "赋值",
                "description": "将值合并到流程变量"
            },
            "transform": {
                "label": "转换",
                "description": "将上一步结果映射为新结构"
            },
            "template": {
                "label": "模板",
                "description": "根据上下文值渲染文本"
            },
            "json": {
                "label": "JSON",
                "description": "解析或序列化 JSON"
            },
            "csv": {
                "label": "CSV",
                "description": "解析或序列化 CSV 文本"
            },
            "change": {
                "label": "修改属性",
                "description": "设置、删除或追加上下文字段"
            },
            "statistics": {
                "label": "统计",
                "description": "将数组聚合为数值"
            },
            "merge": {
                "label": "合并",
                "description": "合并字段或数组"
            },
            "event-emit": {
                "label": "发送事件",
                "description": "向宿主发布事件"
            },
            "event-wait": {
                "label": "等待事件",
                "description": "等待宿主事件"
            },
            "command": {
                "label": "命令",
                "description": "执行宿主命令或函数"
            },
            "split": {
                "label": "拆分",
                "description": "拆分文本或数组"
            },
            "map": {
                "label": "映射",
                "description": "将每个元素映射为新值"
            },
            "filter": {
                "label": "过滤",
                "description": "保留符合条件的元素"
            },
            "sort": {
                "label": "排序",
                "description": "按字段排序"
            },
            "range": {
                "label": "区间",
                "description": "生成数值区间"
            },
            "batch": {
                "label": "批处理",
                "description": "将元素分批"
            },
            "trycatch": {
                "label": "异常捕获",
                "description": "将失败路由到异常分支"
            },
            "subprocess": {
                "label": "子流程",
                "description": "执行另一个工作流"
            },
            "comment": {
                "label": "注释",
                "description": "画布注释，不执行"
            },
            "custom": {
                "label": "自定义",
                "description": "执行自定义活动或处理器"
            },
            "mqtt-publish": {
                "label": "MQTT 发布",
                "description": "向 MQTT 主题发布消息"
            },
            "mqtt-wait": {
                "label": "MQTT 等待",
                "description": "等待 MQTT 主题的下一条消息"
            },
            "redis-command": {
                "label": "Redis 命令",
                "description": "执行 Redis 命令并返回结果"
            },
            "redis-publish": {
                "label": "Redis 发布",
                "description": "向 Redis 频道发布消息"
            },
            "nats-publish": {
                "label": "NATS 发布",
                "description": "向 NATS 主题发布消息"
            },
            "nats-request": {
                "label": "NATS 请求",
                "description": "发送 NATS 请求并等待回复"
            },
            "coap-request": {
                "label": "CoAP 请求",
                "description": "发送 CoAP 请求并返回响应内容"
            },
            "gateway-route": {
                "label": "网关路由",
                "description": "把匹配的请求转发到微服务或固定上游"
            },
            "gateway-condition": {
                "label": "网关条件",
                "description": "匹配路径、方法、主机、请求头或查询参数"
            },
            "gateway-deny": {
                "label": "网关拒绝",
                "description": "在网关直接拒绝匹配的请求"
            },
            "debug": {
                "label": "调试",
                "description": "查看消息属性或完整消息"
            },
            "junction": {
                "label": "汇合",
                "description": "汇合连线，不改变消息"
            },
            "sequence": {
                "label": "顺序",
                "description": "保持下游步骤顺序执行"
            },
            "link": {
                "label": "链接",
                "description": "按名称跳转到匹配的链接节点"
            },
            "html": {
                "label": "HTML",
                "description": "从 HTML 提取文本或链接"
            },
            "xml": {
                "label": "XML",
                "description": "解析或序列化 XML 文档"
            },
            "scale": {
                "label": "区间映射",
                "description": "将数值从一个区间映射到另一个区间"
            },
            "router": {
                "label": "规则路由",
                "description": "按顺序匹配规则并选择四个输出之一"
            },
            "complete": {
                "label": "完成事件",
                "description": "匹配节点成功完成后运行"
            },
            "catch": {
                "label": "异常事件",
                "description": "匹配节点失败时运行"
            },
            "status": {
                "label": "状态事件",
                "description": "工作流结束后运行"
            },
            "websocket-request": {
                "label": "WebSocket 请求",
                "description": "发送 WebSocket 消息并可等待回复"
            },
            "tcp-request": {
                "label": "TCP 请求",
                "description": "连接 TCP 服务器，发送数据并可等待回复"
            },
            "udp-request": {
                "label": "UDP 请求",
                "description": "发送 UDP 数据报并可等待回复"
            },
            "file-read": {
                "label": "读取文件",
                "description": "读取工作流宿主上的文件"
            },
            "file-write": {
                "label": "写入文件",
                "description": "写入或追加工作流宿主上的文件"
            },
            "yaml": {
                "label": "YAML",
                "description": "解析或序列化 YAML"
            },
            "rbe": {
                "label": "RBE",
                "description": "仅在值变化时保留数组元素"
            },
            "combine": {
                "label": "合并组合",
                "description": "将多个上下文值组合为一个结果"
            },
            "exec": {
                "label": "执行命令",
                "description": "运行宿主命令并捕获标准输出/错误"
            },
            "http-in": {
                "label": "HTTP 入口",
                "description": "从 HTTP webhook 请求启动流程"
            },
            "http-response": {
                "label": "HTTP 响应",
                "description": "为 webhook 请求发送 HTTP 响应"
            },
            "tcp-in": {
                "label": "TCP 入口",
                "description": "从 TCP 消息启动流程"
            },
            "udp-in": {
                "label": "UDP 入口",
                "description": "从 UDP 数据报启动流程"
            },
            "websocket-in": {
                "label": "WebSocket 入口",
                "description": "从 WebSocket 消息启动流程"
            },
            "mqtt-in": {
                "label": "MQTT 输入",
                "description": "从 MQTT 消息启动流程"
            },
            "mqtt-out": {
                "label": "MQTT 输出",
                "description": "把消息发布到 MQTT Broker"
            },
            "tcp-out": {
                "label": "TCP 输出",
                "description": "把消息发送到 TCP 端点"
            },
            "udp-out": {
                "label": "UDP 输出",
                "description": "把消息作为 UDP 数据报发送"
            },
            "websocket-out": {
                "label": "WebSocket 输出",
                "description": "把消息发送到 WebSocket 端点"
            },
            "tls": {
                "label": "TLS 配置",
                "description": "供出站节点复用的 TLS 选项"
            },
            "mqtt": {
                "label": "MQTT Broker",
                "description": "供 MQTT 节点共用的 Broker 连接"
            },
            "file-in": {
                "label": "文件输入",
                "description": "从工作区读取文件"
            },
            "file-out": {
                "label": "文件输出",
                "description": "把内容写入工作区文件"
            },
            "watch": {
                "label": "文件监听",
                "description": "文件或目录变化时启动流程"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "数据字段",
                "topic": "主题",
                "payloadType": "数据类型",
                "trigger": "触发方式",
                "onceDelay": "首次延迟",
                "interval": "间隔",
                "intervalUnit": "间隔单位",
                "repeatCount": "重复次数",
                "event": "事件名称",
                "timeout": "等待超时",
                "payloadValue": "数据值",
                "cron": "Cron 表达式"
            },
            "task": {
                "action": "动作名称",
                "result": "无动作时的结果",
                "fail": "标记失败",
                "retry": "重试次数",
                "retryDelay": "重试间隔",
                "timeout": "超时"
            },
            "function": {
                "code": "JavaScript 代码",
                "timeout": "超时",
                "initialize": "初始化代码",
                "finalize": "收尾代码"
            },
            "condition": {
                "field": "取值路径",
                "operator": "运算符",
                "value": "比较值"
            },
            "switch": {
                "field": "取值路径",
                "value": "比较值",
                "rules": "规则",
                "operator": "运算符"
            },
            "parallel": {},
            "join": {
                "mode": "模式",
                "resultField": "结果字段",
                "ignoreEmpty": "跳过空分支",
                "keyField": "键字段",
                "valueField": "值字段",
                "count": "分支数量",
                "timeout": "等待超时"
            },
            "loop": {
                "iterations": "迭代次数",
                "delay": "延迟",
                "workflow": "子流程来源"
            },
            "trigger": {
                "delay": "延迟",
                "payload": "数据（JSON）",
                "emitSecond": "发送第二条消息",
                "secondDelay": "第二次延迟",
                "secondPayload": "第二条消息内容",
                "newMessage": "新消息处理"
            },
            "delay": {
                "mode": "模式",
                "delay": "延迟",
                "randomMin": "最小值",
                "randomMax": "最大值",
                "unit": "单位",
                "rateCount": "窗口内消息数",
                "rateWindow": "限流窗口",
                "rateAction": "超出消息处理"
            },
            "log": {
                "message": "固定消息",
                "field": "取值路径",
                "complete": "记录完整上下文",
                "level": "级别"
            },
            "http-request": {
                "url": "请求地址",
                "method": "方法",
                "headers": "请求头（JSON）",
                "body": "请求体",
                "responseType": "响应处理",
                "retry": "重试次数",
                "retryDelay": "重试间隔",
                "timeout": "超时",
                "authType": "认证方式",
                "username": "用户名",
                "password": "密码",
                "token": "Bearer Token"
            },
            "assign": {
                "values": "值（JSON）"
            },
            "transform": {
                "mapping": "映射（JSON）",
                "result": "固定结果（JSON）"
            },
            "template": {
                "template": "模板",
                "syntax": "语法",
                "target": "结果写入字段",
                "output": "输出类型"
            },
            "json": {
                "mode": "模式",
                "field": "取值路径",
                "pretty": "格式化输出"
            },
            "csv": {
                "mode": "模式",
                "field": "取值路径",
                "delimiter": "分隔符",
                "header": "首行为表头",
                "columns": "列"
            },
            "change": {
                "action": "操作",
                "field": "字段路径",
                "value": "值",
                "rules": "规则"
            },
            "statistics": {
                "field": "数组路径",
                "path": "元素路径",
                "operation": "操作",
                "resultField": "结果字段"
            },
            "merge": {
                "fields": "字段",
                "mode": "模式",
                "resultField": "结果字段"
            },
            "event-emit": {
                "event": "事件名称",
                "payload": "数据（JSON）"
            },
            "event-wait": {
                "event": "事件名称",
                "timeout": "超时"
            },
            "command": {
                "command": "命令",
                "args": "参数",
                "timeout": "超时",
                "value": "参数"
            },
            "split": {
                "field": "取值路径",
                "delimiter": "分隔符",
                "mode": "模式"
            },
            "map": {
                "field": "数组路径",
                "path": "元素路径"
            },
            "filter": {
                "field": "数组路径",
                "path": "元素路径",
                "operator": "运算符",
                "value": "比较值"
            },
            "sort": {
                "field": "数组路径",
                "path": "元素路径",
                "order": "顺序",
                "numeric": "数值比较"
            },
            "range": {
                "from": "起始",
                "to": "结束",
                "step": "步长"
            },
            "batch": {
                "field": "数组路径",
                "size": "批大小",
                "overlap": "重叠数量"
            },
            "trycatch": {
                "timeout": "超时"
            },
            "subprocess": {
                "workflow": "工作流 ID 或 JSON",
                "inputs": "输入端口",
                "outputs": "输出端口"
            },
            "comment": {
                "text": "文本"
            },
            "custom": {
                "result": "结果"
            },
            "mqtt-publish": {
                "url": "Broker 地址",
                "topic": "主题",
                "qos": "QoS",
                "timeout": "超时（毫秒）",
                "payload": "消息内容",
                "retain": "保留消息"
            },
            "mqtt-wait": {
                "url": "Broker 地址",
                "topic": "主题",
                "qos": "QoS",
                "timeout": "超时（毫秒）"
            },
            "redis-command": {
                "url": "Redis 地址",
                "command": "命令",
                "args": "参数"
            },
            "redis-publish": {
                "url": "Redis 地址",
                "channel": "频道",
                "message": "消息"
            },
            "nats-publish": {
                "servers": "NATS 服务地址",
                "subject": "主题",
                "payload": "消息内容",
                "timeout": "超时（毫秒）"
            },
            "nats-request": {
                "servers": "NATS 服务地址",
                "subject": "主题",
                "payload": "消息内容",
                "timeout": "超时（毫秒）"
            },
            "coap-request": {
                "host": "主机",
                "port": "端口",
                "method": "方法",
                "path": "路径",
                "payload": "请求内容",
                "timeout": "超时（毫秒）"
            },
            "gateway-route": {
                "path": "入口路径",
                "service": "服务名",
                "targetUrl": "上游地址",
                "targetPath": "上游路径",
                "stripPrefix": "去掉入口前缀",
                "timeout": "超时（毫秒）",
                "priority": "优先级",
                "headers": "请求头",
                "responseHeaders": "响应头",
                "rateLimit": "限流",
                "cache": "缓存",
                "circuitBreaker": "熔断",
                "bulkhead": "隔离舱"
            },
            "gateway-condition": {
                "field": "字段",
                "name": "请求头/参数名",
                "operator": "运算符",
                "value": "比较值"
            },
            "gateway-deny": {
                "status": "状态码",
                "message": "消息",
                "priority": "优先级",
                "body": "响应体"
            },
            "debug": {
                "field": "取值路径",
                "complete": "完整消息",
                "level": "级别",
                "console": "同时输出到控制台",
                "active": "启用"
            },
            "link": {
                "mode": "模式",
                "links": "链接名"
            },
            "html": {
                "field": "HTML 路径",
                "mode": "输出",
                "target": "结果写入字段",
                "tag": "标签",
                "attribute": "属性名"
            },
            "xml": {
                "mode": "模式",
                "field": "XML 路径",
                "target": "结果写入字段",
                "pretty": "格式化输出",
                "attributes": "包含属性",
                "text": "包含文本"
            },
            "scale": {
                "field": "取值路径",
                "inMin": "输入最小值",
                "inMax": "输入最大值",
                "outMin": "输出最小值",
                "outMax": "输出最大值",
                "clamp": "限制在区间内",
                "round": "取整",
                "target": "结果写入字段"
            },
            "router": {
                "field": "取值路径",
                "rules": "规则",
                "operator": "运算符",
                "value": "比较值"
            },
            "complete": {
                "scope": "范围"
            },
            "catch": {
                "scope": "范围"
            },
            "status": {
                "scope": "范围"
            },
            "websocket-request": {
                "url": "地址",
                "headers": "请求头",
                "message": "消息字段",
                "payload": "数据",
                "waitForReply": "等待回复",
                "timeout": "超时"
            },
            "tcp-request": {
                "host": "主机",
                "port": "端口",
                "payload": "数据",
                "waitForReply": "等待回复",
                "timeout": "超时"
            },
            "udp-request": {
                "host": "主机",
                "port": "端口",
                "payload": "数据",
                "waitForReply": "等待回复",
                "timeout": "超时"
            },
            "file-read": {
                "path": "文件路径",
                "encoding": "编码",
                "output": "结果写入字段"
            },
            "file-write": {
                "path": "文件路径",
                "encoding": "编码",
                "content": "内容",
                "append": "追加",
                "createDirs": "创建父目录"
            },
            "yaml": {
                "mode": "模式",
                "field": "取值路径",
                "target": "结果写入字段"
            },
            "rbe": {
                "field": "数组路径",
                "path": "元素路径",
                "mode": "上报方式"
            },
            "combine": {
                "fields": "字段",
                "mode": "模式",
                "separator": "分隔符",
                "resultField": "结果字段"
            },
            "exec": {
                "command": "命令",
                "args": "参数",
                "cwd": "工作目录",
                "env": "环境变量",
                "timeout": "超时",
                "output": "标准输出写入字段"
            },
            "http-in": {
                "method": "方法",
                "path": "路径"
            },
            "http-response": {
                "statusCode": "状态码",
                "headers": "响应头",
                "body": "响应体路径"
            },
            "tcp-in": {
                "host": "主机",
                "port": "端口",
                "reply": "回复执行结果"
            },
            "udp-in": {
                "host": "主机",
                "port": "端口",
                "reply": "回复执行结果"
            },
            "websocket-in": {
                "host": "主机",
                "port": "端口",
                "path": "路径",
                "reply": "回复执行结果"
            },
            "mqtt-in": {
                "url": "Broker 地址",
                "topic": "主题",
                "qos": "QoS",
                "clientId": "客户端 ID",
                "username": "用户名",
                "password": "密码",
                "mqtt": "Broker 配置"
            },
            "mqtt-out": {
                "url": "Broker 地址",
                "topic": "主题",
                "payload": "载荷路径",
                "qos": "QoS",
                "retain": "保留消息",
                "clientId": "客户端 ID",
                "username": "用户名",
                "password": "密码",
                "tls": "TLS 配置",
                "mqtt": "Broker 配置"
            },
            "tcp-out": {
                "host": "主机",
                "port": "端口",
                "payload": "载荷路径",
                "timeout": "超时",
                "tls": "TLS 配置"
            },
            "udp-out": {
                "host": "主机",
                "port": "端口",
                "payload": "载荷路径"
            },
            "websocket-out": {
                "url": "URL",
                "payload": "载荷路径",
                "timeout": "超时",
                "tls": "TLS 配置"
            },
            "tls": {
                "ca": "CA 证书",
                "cert": "客户端证书",
                "key": "客户端私钥",
                "servername": "服务端名称",
                "rejectUnauthorized": "校验证书"
            },
            "mqtt": {
                "url": "Broker 地址",
                "clientId": "客户端 ID",
                "username": "用户名",
                "password": "密码",
                "tls": "TLS 配置",
                "keepalive": "心跳间隔"
            },
            "file-in": {
                "path": "路径",
                "encoding": "编码",
                "parse": "解析"
            },
            "file-out": {
                "path": "路径",
                "payload": "载荷路径",
                "encoding": "编码",
                "append": "追加写入",
                "mkdir": "自动创建目录"
            },
            "watch": {
                "path": "路径",
                "recursive": "递归监听",
                "debounce": "去抖",
                "event": "事件类型"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "{ \"value\": 1 }",
                "topic": "orders.created",
                "onceDelay": "0",
                "interval": "1",
                "repeatCount": "1",
                "event": "order.created",
                "timeout": "30",
                "cron": "0 9 * * 1-5"
            },
            "task": {
                "action": "actions.fetch",
                "result": "{ \"ok\": true }"
            },
            "function": {
                "code": "return { ok: true };"
            },
            "condition": {
                "field": "approved",
                "value": "true"
            },
            "switch": {
                "field": "result.status",
                "value": "done"
            },
            "parallel": {},
            "join": {
                "resultField": "joined",
                "keyField": "key",
                "valueField": "value"
            },
            "loop": {
                "workflow": "workflow_id"
            },
            "trigger": {
                "payload": "{ \"ok\": true }",
                "secondPayload": "{ \"done\": true }"
            },
            "delay": {},
            "log": {
                "message": "Flow step completed",
                "field": "result.value"
            },
            "http-request": {
                "url": "https://api.example.com/items",
                "headers": "{ \"Accept\": \"application/json\" }",
                "body": "{ \"name\": \"demo\" }"
            },
            "assign": {
                "values": "{ \"count\": 1 }"
            },
            "transform": {
                "mapping": "{ \"name\": \"input.name\" }"
            },
            "template": {
                "template": "Hello {{name}}",
                "target": "message"
            },
            "json": {
                "field": "value"
            },
            "csv": {
                "field": "value",
                "delimiter": ",",
                "columns": "name, age"
            },
            "change": {
                "field": "variables.name",
                "value": "\"workflow\""
            },
            "statistics": {
                "field": "items",
                "path": "value",
                "resultField": "value"
            },
            "merge": {
                "fields": "a, b",
                "resultField": "value"
            },
            "event-emit": {
                "event": "order.created",
                "payload": "{ \"id\": 1 }"
            },
            "event-wait": {
                "event": "order.created"
            },
            "command": {
                "command": "context.exec",
                "args": "[\"--flag\"]"
            },
            "split": {
                "field": "items",
                "delimiter": ","
            },
            "map": {
                "field": "items",
                "path": "value"
            },
            "filter": {
                "field": "items",
                "path": "value"
            },
            "sort": {
                "field": "items",
                "path": "value"
            },
            "range": {},
            "batch": {
                "field": "items",
                "overlap": "0"
            },
            "trycatch": {},
            "subprocess": {
                "workflow": "workflow_id",
                "inputs": "{ \"orderId\": \"payload.id\" }",
                "outputs": "{ \"total\": \"payload.total\" }"
            },
            "comment": {
                "text": "Canvas note"
            },
            "custom": {
                "result": "{ \"ok\": true }"
            },
            "mqtt-publish": {},
            "mqtt-wait": {},
            "redis-command": {},
            "redis-publish": {},
            "nats-publish": {},
            "nats-request": {},
            "coap-request": {},
            "gateway-route": {},
            "gateway-condition": {},
            "gateway-deny": {},
            "debug": {
                "field": "payload"
            },
            "html": {
                "field": "body",
                "target": "value",
                "tag": "h1",
                "attribute": "href"
            },
            "xml": {
                "field": "value",
                "target": "value"
            },
            "link": {
                "links": "flow-a, flow-b"
            },
            "scale": {
                "field": "value",
                "target": "value"
            },
            "router": {
                "field": "result.status"
            },
            "complete": {
                "scope": "节点 ID 或类型"
            },
            "catch": {
                "scope": "节点 ID 或类型"
            },
            "status": {
                "scope": "节点 ID 或类型"
            },
            "websocket-request": {},
            "tcp-request": {
                "host": "127.0.0.1",
                "port": "9000"
            },
            "udp-request": {
                "host": "127.0.0.1",
                "port": "9000"
            },
            "file-read": {
                "output": "content"
            },
            "file-write": {},
            "exec": {
                "command": "/usr/bin/node",
                "cwd": "./",
                "env": "KEY"
            },
            "combine": {
                "fields": "first, second"
            },
            "yaml": {
                "field": "value",
                "target": "value"
            },
            "rbe": {
                "field": "items",
                "path": "value"
            },
            "http-in": {
                "path": "/orders"
            },
            "http-response": {
                "headers": "{ \"x-flow\": \"done\" }",
                "body": "payload"
            },
            "tcp-in": {
                "host": "0.0.0.0",
                "port": "3000"
            },
            "udp-in": {
                "host": "0.0.0.0",
                "port": "3000"
            },
            "websocket-in": {
                "host": "0.0.0.0",
                "port": "3000",
                "path": "/ws"
            },
            "mqtt-in": {
                "url": "mqtt://broker:1883",
                "topic": "sensors/+/temp",
                "clientId": "auto",
                "mqtt": "mqtt_1"
            },
            "mqtt-out": {
                "url": "mqtt://broker:1883",
                "topic": "sensors/temp",
                "clientId": "auto",
                "tls": "tls_1",
                "mqtt": "mqtt_1"
            },
            "tcp-out": {
                "host": "127.0.0.1",
                "tls": "tls_1"
            },
            "udp-out": {
                "host": "127.0.0.1"
            },
            "websocket-out": {
                "url": "ws://host:port/path",
                "tls": "tls_1"
            },
            "tls": {
                "servername": "broker.example.com"
            },
            "mqtt": {
                "url": "mqtt://broker:1883",
                "clientId": "auto",
                "tls": "tls_1"
            },
            "file-in": {
                "path": "data/input.json"
            },
            "file-out": {
                "path": "data/output.json"
            },
            "watch": {
                "path": "data"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "随数据一起传递的可选主题。",
                "payload": "以键值行编辑要注入的对象。",
                "payloadType": "选择数据的类型；JSON 合并到上下文，其他类型按原值发送。",
                "trigger": "选择手动、周期或事件触发。",
                "onceDelay": "第一次注入前的等待时间。",
                "interval": "两次注入之间的时间。",
                "intervalUnit": "间隔时间单位。",
                "repeatCount": "运行次数；0 表示持续运行直到停止。",
                "event": "触发注入的事件名称。",
                "timeout": "等待事件的最长时间。",
                "payloadValue": "要注入的字符串、数字或布尔值。",
                "cron": "五个字段：分 时 日 月 周。"
            },
            "task": {
                "action": "context.actions 中的函数名，留空则返回“结果”中的值。",
                "result": "未设置动作时直接返回的 JSON。",
                "retry": "失败前的自动重试次数。",
                "fail": "强制此步骤失败，便于测试异常分支。",
                "retryDelay": "两次重试之间的等待时间。",
                "timeout": "此步骤的最长执行时间，0 表示不限制。"
            },
            "function": {
                "code": "返回下一步消息。context 与 input 都是流程上下文。",
                "timeout": "此步骤的最长执行时间，0 表示不限制。",
                "initialize": "可选：在主函数前执行，返回的对象会合并到上下文。",
                "finalize": "可选：在主函数后执行，用于清理或指标。"
            },
            "condition": {
                "field": "要判断的上下文路径，例如 approved 或 user.role。",
                "operator": "选择判断方式，决定进入 true 还是 false 分支。",
                "value": "当前运算符使用的比较值。"
            },
            "switch": {
                "field": "与每条规则比较的上下文值。",
                "value": "当前运算符使用的比较值。",
                "rules": "从上到下依次匹配，第一条命中的规则选择对应编号输出。",
                "operator": "该规则使用的比较方式。"
            },
            "parallel": {},
            "join": {
                "mode": "把分支结果收集为数组，或合并各分支的数据对象。",
                "resultField": "接收合并结果的上下文字段。",
                "ignoreEmpty": "不把没有结果数据的分支计入合并结果。",
                "keyField": "作为对象键的分支结果属性。",
                "valueField": "每个键下保存的分支结果属性；留空保存整个分支结果。",
                "count": "包含多少个成功分支的结果。",
                "timeout": "超过该等待时间后使用已完成分支继续。"
            },
            "loop": {
                "iterations": "子工作流执行次数。",
                "delay": "两次子流程执行之间的等待时间。",
                "workflow": "要重复执行的工作流 ID、上下文路径或内联 JSON 定义。"
            },
            "trigger": {
                "delay": "发送数据前的等待时间。",
                "payload": "触发时输出的 JSON 数据。",
                "emitSecond": "第一条消息到达分支后再发送一条消息。",
                "secondDelay": "第一条消息发送后等待多久再发送第二条。",
                "secondPayload": "合并到第二条消息中的数据。",
                "newMessage": "并发消息到达该触发器时的处理方式。"
            },
            "delay": {
                "delay": "进入下一个节点前的等待时间。",
                "mode": "固定延迟或区间内随机延迟。",
                "randomMin": "随机延迟的最小时间。",
                "randomMax": "随机延迟的最大时间。",
                "unit": "延迟时间的单位。",
                "rateCount": "限流窗口内允许通过的消息数量。",
                "rateWindow": "统计消息数量的滑动窗口。",
                "rateAction": "丢弃超出消息，或排队等待窗口释放。"
            },
            "log": {
                "message": "未设置取值路径时写入的文本。",
                "field": "要记录的上下文路径。",
                "complete": "记录整个流程上下文而不是单个值。",
                "level": "日志级别：info、warn 或 error。"
            },
            "http-request": {
                "url": "绝对地址，或以 / 开头的宿主路径。",
                "method": "HTTP 请求方法。",
                "headers": "JSON 对象形式的请求头。",
                "body": "POST/PUT/PATCH 的请求体。",
                "responseType": "自动：能解析则返回 JSON；文本：保留原文；JSON：解析失败时报错。",
                "retry": "请求失败后的自动重试次数。",
                "retryDelay": "两次重试之间的等待时间。",
                "timeout": "请求的最长等待时间。",
                "authType": "可选的 HTTP 认证方式。",
                "username": "Basic 认证用户名。",
                "password": "Basic 认证密码；使用 {{credential:name}} 读取已保存的凭据。",
                "token": "Bearer Token；使用 {{credential:name}} 读取已保存的凭据。"
            },
            "assign": {
                "values": "合并到流程变量的 JSON 对象。"
            },
            "transform": {
                "mapping": "目标字段到上下文路径的映射。",
                "result": "直接返回的 JSON 结果。"
            },
            "template": {
                "template": "使用 {{name}} 或 {{user.email}} 读取上下文值。",
                "target": "接收渲染结果的上下文字段。",
                "syntax": "Mustache 替换 {{...}} 占位符；纯文本原样输出。",
                "output": "文本保留字符串；JSON 会解析渲染结果。"
            },
            "json": {
                "field": "要解析或序列化的上下文路径。",
                "mode": "解析 JSON 文本，或把值序列化为 JSON。",
                "pretty": "使用缩进输出 JSON。"
            },
            "csv": {
                "field": "CSV 文本或数组的上下文路径。",
                "delimiter": "列之间的单字符分隔符。",
                "mode": "解析 CSV 文本，或把数组序列化为 CSV。",
                "header": "解析时把首行作为字段名。",
                "columns": "可选：解析或序列化时保留的列，逗号分隔。"
            },
            "change": {
                "field": "要修改的上下文路径。",
                "value": "新值，支持 JSON。",
                "rules": "按顺序执行，每行修改一个字段。",
                "action": "Set 替换，Delete 删除，Append 追加到列表或字符串。"
            },
            "statistics": {
                "field": "要聚合的数组的上下文路径。",
                "path": "数组元素中用于计算的属性。",
                "operation": "计数、求和、平均、最小或最大。",
                "resultField": "接收统计结果的字段。"
            },
            "merge": {
                "fields": "要合并的上下文字段，逗号分隔。",
                "mode": "对象合并或数组拼接。",
                "resultField": "接收合并结果的字段。"
            },
            "event-emit": {
                "event": "事件名称，发送与等待端需一致。",
                "payload": "随事件发送的 JSON 数据。"
            },
            "event-wait": {
                "event": "等待的事件名称。",
                "timeout": "等待事件的最长时间。"
            },
            "command": {
                "args": "按顺序传给命令的参数。",
                "command": "宿主注册的命令或函数名。",
                "timeout": "命令的最长执行时间。"
            },
            "split": {
                "field": "要拆分的文本或数组路径。",
                "delimiter": "拆分文本时使用的分隔符。",
                "mode": "自动识别数组或文本，也可强制指定。"
            },
            "map": {
                "path": "每个元素中要映射的属性。",
                "field": "要遍历的数组路径。"
            },
            "filter": {
                "field": "要过滤的数组路径。",
                "path": "用于比较的元素属性。",
                "operator": "比较方式。",
                "value": "比较使用的值。"
            },
            "sort": {
                "path": "用于排序的元素属性。",
                "field": "要排序的数组路径。",
                "order": "升序或降序。",
                "numeric": "按数值而不是文本比较。"
            },
            "range": {
                "from": "区间起始值（包含）。",
                "to": "区间结束值（不包含）。",
                "step": "每次增加的数量。"
            },
            "batch": {
                "size": "每批包含的元素数量。",
                "field": "要分批的数组路径。",
                "overlap": "下一批开头重复上一批末尾的元素数量，0 表示不重叠。"
            },
            "trycatch": {
                "timeout": "超过该时间后进入超时端口。"
            },
            "subprocess": {
                "workflow": "已保存的工作流 ID、上下文路径或内联定义 JSON。",
                "inputs": "子流程上下文键 → 父流程上下文路径。",
                "outputs": "父流程上下文键 → 子流程结果路径。"
            },
            "comment": {},
            "custom": {
                "result": "自定义节点返回的值。"
            },
            "mqtt-publish": {},
            "mqtt-wait": {},
            "redis-command": {
                "args": "命令参数的 JSON 数组。"
            },
            "redis-publish": {},
            "nats-publish": {},
            "nats-request": {},
            "coap-request": {},
            "gateway-route": {
                "path": "默认取路径条件值。",
                "priority": "数值越小越先执行。"
            },
            "gateway-condition": {},
            "gateway-deny": {
                "priority": "数值越小越先执行。"
            },
            "debug": {
                "field": "要查看的上下文路径。",
                "complete": "输出完整流程上下文。",
                "console": "同时写入宿主控制台，便于开发调试。",
                "level": "输出级别：info、warn 或 error。",
                "active": "关闭后保留节点但不再输出。"
            },
            "link": {
                "mode": "从该节点发送（link out），或接收匹配名称的消息（link in）。",
                "links": "link out 与 link in 共享的链接名，逗号分隔。"
            },
            "html": {
                "field": "包含 HTML 文本的上下文路径。",
                "mode": "文本：去除标签；链接：收集 href/src。",
                "target": "接收提取结果的上下文字段。",
                "tag": "只提取该 HTML 标签内的内容，留空则处理整个文档。",
                "attribute": "输出为属性时收集的属性名，例如 href 或 src。"
            },
            "xml": {
                "mode": "解析 XML 文本，或把对象序列化为 XML。",
                "field": "包含 XML 或对象的上下文路径。",
                "target": "接收解析或序列化结果的上下文字段。",
                "pretty": "序列化时使用缩进。",
                "attributes": "解析结果中包含 XML 属性（@attrs）。",
                "text": "解析结果中包含元素文本（#text）。"
            },
            "scale": {
                "field": "要映射的数值路径。",
                "inMin": "输入区间的最小值。",
                "inMax": "输入区间的最大值。",
                "outMin": "输出区间的最小值。",
                "outMax": "输出区间的最大值。",
                "clamp": "把结果限制在输出区间内。",
                "round": "把结果四舍五入为整数。",
                "target": "接收映射结果的字段。"
            },
            "router": {
                "field": "与每条规则比较的上下文值。",
                "rules": "从上到下依次匹配，第一条命中的规则选择对应编号输出。",
                "operator": "该规则使用的比较方式。",
                "value": "当前运算符使用的比较值。"
            },
            "complete": {
                "scope": "仅在该节点 ID 或类型匹配时运行；留空表示任意节点。"
            },
            "catch": {
                "scope": "仅在该节点 ID 或类型匹配时运行；留空表示任意节点。"
            },
            "status": {
                "scope": "仅在该节点 ID 或类型匹配时运行；留空表示任意节点。"
            },
            "websocket-request": {
                "url": "WebSocket 地址，例如 wss://example.com/socket。",
                "headers": "连接请求头，键值行编辑。",
                "message": "发送的 JSON 消息。",
                "payload": "发送的文本数据。",
                "waitForReply": "是否等待服务器返回数据。",
                "timeout": "等待回复的最长时间。"
            },
            "tcp-request": {
                "host": "服务器地址。",
                "port": "服务器端口。",
                "payload": "发送的文本数据。",
                "waitForReply": "是否等待服务器返回数据。",
                "timeout": "等待回复的最长时间。"
            },
            "udp-request": {
                "host": "服务器地址。",
                "port": "服务器端口。",
                "payload": "发送的文本数据。",
                "waitForReply": "是否等待服务器返回数据。",
                "timeout": "等待回复的最长时间。"
            },
            "file-read": {
                "path": "相对于宿主工作目录的文件路径。",
                "encoding": "文件读写编码。",
                "output": "接收文件内容的上下文字段。"
            },
            "file-write": {
                "path": "相对于宿主工作目录的文件路径。",
                "encoding": "文件读写编码。",
                "content": "写入文件的文本。",
                "append": "追加到现有文件而不是覆盖。",
                "createDirs": "写入前自动创建父目录。"
            },
            "yaml": {
                "mode": "解析 YAML 文本，或把值序列化为 YAML。",
                "field": "包含 YAML 文本或对象的上下文路径。",
                "target": "接收结果的上下文字段。"
            },
            "rbe": {
                "field": "要过滤的数组路径。",
                "path": "相邻元素之间比较的属性。",
                "mode": "保留第一个元素以及比较值发生变化的元素。"
            },
            "combine": {
                "fields": "要组合的上下文路径，逗号分隔。",
                "mode": "对象合并、数组拼接或文本连接。",
                "separator": "文本连接时使用的分隔符。",
                "resultField": "接收组合结果的上下文字段。"
            },
            "exec": {
                "command": "在工作流宿主上运行的可执行文件。",
                "args": "传给可执行文件的参数，每行一个。",
                "cwd": "命令运行时的工作目录，默认使用宿主工作目录。",
                "env": "合并到宿主环境中的额外环境变量。",
                "timeout": "超过该毫秒数后终止命令；0 表示一直等待。",
                "output": "接收标准输出的上下文字段。"
            },
            "http-in": {
                "method": "触发该分支的 HTTP 方法。",
                "path": "该节点处理的请求路径，留空表示接受任意路径。"
            },
            "http-response": {
                "statusCode": "返回给调用方的 HTTP 状态码。",
                "headers": "JSON 对象形式的响应头。",
                "body": "作为响应体返回的上下文路径。"
            },
            "tcp-in": {
                "host": "监听网卡地址，0.0.0.0 表示所有网卡。",
                "port": "监听端口，0 表示自动选择空闲端口。",
                "reply": "把最终节点结果回写给发送方。"
            },
            "udp-in": {
                "host": "监听网卡地址，0.0.0.0 表示所有网卡。",
                "port": "监听端口，0 表示自动选择空闲端口。",
                "reply": "把最终节点结果回写给发送方。"
            },
            "websocket-in": {
                "host": "监听网卡地址，0.0.0.0 表示所有网卡。",
                "port": "监听端口，0 表示自动选择空闲端口。",
                "path": "可选的 WebSocket 升级路径，例如 /ws。",
                "reply": "把最终节点结果回写给客户端。"
            },
            "mqtt-in": {
                "url": "内联覆盖项；建议改用 MQTT Broker 配置节点。",
                "topic": "订阅过滤器，支持 + 与 # 通配符。",
                "qos": "订阅的投递保证级别。",
                "clientId": "可选的客户端 ID；留空时自动生成。",
                "username": "Broker 用户名。",
                "password": "Broker 密码；使用 {{credential:name}} 读取已保存的凭据。",
                "mqtt": "供所有 MQTT 节点共用的 Broker 配置节点 id；下方内联字段作为覆盖项。"
            },
            "mqtt-out": {
                "url": "内联覆盖项；建议改用 MQTT Broker 配置节点。",
                "topic": "发布到的主题。",
                "payload": "作为消息载荷的上下文路径。",
                "qos": "发布的投递保证级别。",
                "retain": "要求 Broker 保留该主题的最后一条消息。",
                "clientId": "可选的客户端 ID；留空时自动生成。",
                "username": "Broker 用户名。",
                "password": "Broker 密码；使用 {{credential:name}} 读取已保存的凭据。",
                "tls": "TLS 配置节点 id；mqtts:// 本身已加密连接。",
                "mqtt": "供所有 MQTT 节点共用的 Broker 配置节点 id；下方内联字段作为覆盖项。"
            },
            "tcp-out": {
                "payload": "作为载荷的上下文路径。",
                "tls": "TLS 配置节点 id；留空表示明文 TCP。"
            },
            "udp-out": {
                "payload": "作为数据报载荷的上下文路径。"
            },
            "websocket-out": {
                "url": "ws:// 或 wss:// 端点。",
                "payload": "作为消息载荷的上下文路径。",
                "tls": "TLS 配置节点 id；留空表示明文 WebSocket。"
            },
            "tls": {
                "ca": "PEM 证书链；使用 {{credential:name}} 读取已保存的凭据。",
                "cert": "PEM 证书；使用 {{credential:name}} 读取已保存的凭据。",
                "key": "PEM 私钥；使用 {{credential:name}} 读取已保存的凭据。"
            },
            "mqtt": {
                "url": "mqtt:// 地址；TLS 使用 mqtts://。",
                "clientId": "可选的客户端 ID；留空时自动生成。",
                "username": "Broker 用户名。",
                "password": "Broker 密码；使用 {{credential:name}} 读取已保存的凭据。",
                "tls": "用于客户端证书的 TLS 配置节点 id。",
                "keepalive": "心跳间隔（秒）。"
            },
            "file-in": {
                "path": "绝对路径，或工作区根目录内的相对路径。",
                "encoding": "以 UTF-8 文本或 base64 读取文件。",
                "parse": "自动解析合法 JSON，或保留原始文本。"
            },
            "file-out": {
                "path": "绝对路径，或工作区根目录内的相对路径。",
                "payload": "作为文件内容的上下文路径。",
                "encoding": "写入 UTF-8 文本或 base64 内容。",
                "append": "追加写入而不是覆盖。",
                "mkdir": "自动创建缺失的父目录。"
            },
            "watch": {
                "path": "要监听的文件或目录（工作区相对路径或绝对路径）。",
                "recursive": "同时监听子目录。",
                "debounce": "事件合并等待时间。",
                "event": "只响应重命名或内容变更。"
            }
        },
        "group": {
            "reliability": "可靠性",
            "options": "选项",
            "delay": "延迟",
            "request": "请求",
            "template": "模板",
            "output": "输出",
            "payload": "数据",
            "authentication": "认证",
            "input-range": "输入范围",
            "output-range": "输出范围",
            "trigger": "触发"
        },
        "option": {
            "truthy": "为真",
            "equals": "等于",
            "not-equals": "不等于",
            "gt": "大于",
            "lt": "小于",
            "fixed": "固定延迟",
            "random": "随机延迟",
            "auto": "自动",
            "json": "JSON",
            "text": "文本",
            "mustache": "Mustache",
            "plain": "纯文本",
            "parse": "解析",
            "stringify": "序列化",
            "set": "设置",
            "delete": "删除",
            "append": "追加",
            "count": "前 N 个分支",
            "sum": "求和",
            "avg": "平均",
            "min": "最小",
            "max": "最大",
            "object": "对象合并",
            "array": "分支结果数组",
            "asc": "升序",
            "desc": "降序",
            "path": "路径",
            "method": "方法",
            "host": "主机",
            "header": "请求头",
            "query": "查询参数",
            "prefix": "前缀",
            "not-prefix": "非前缀",
            "exists": "存在",
            "not-exists": "不存在",
            "links": "链接",
            "string": "字符串",
            "number": "数字",
            "boolean": "布尔",
            "none": "无",
            "basic": "Basic",
            "milliseconds": "毫秒",
            "seconds": "秒",
            "minutes": "分钟",
            "attribute": "属性",
            "contains": "包含",
            "regex": "匹配正则",
            "gte": "大于等于",
            "lte": "小于等于",
            "manual": "手动 / 一次",
            "interval": "周期",
            "event": "事件",
            "cron": "Cron 定时",
            "utf8": "UTF-8",
            "base64": "Base64",
            "hex": "Hex",
            "change": "任意变化",
            "merge": "合并对象",
            "concat": "数组拼接",
            "ms": "毫秒",
            "s": "秒",
            "value": "按值变化",
            "info": "信息",
            "warn": "告警",
            "error": "错误",
            "GET": "GET",
            "POST": "POST",
            "PUT": "PUT",
            "PATCH": "PATCH",
            "DELETE": "DELETE",
            "ANY": "任意方法",
            "out": "Link out",
            "in": "Link in",
            "rate": "限流",
            "drop": "丢弃",
            "queue": "排队",
            "key": "按键聚合",
            "parallel": "每条消息都执行",
            "restart": "重启等待中的延迟",
            "timeout": "超时后继续",
            "bearer": "Bearer Token",
            "0": "0",
            "1": "1",
            "all": "All changes",
            "rename": "Renames only"
        }
    }
};
