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
                "description": "Start a flow with a fixed payload"
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
                "description": "Route to the output matching a value"
            },
            "parallel": {
                "label": "Parallel",
                "description": "Run all outgoing branches concurrently"
            },
            "join": {
                "label": "Join",
                "description": "Wait for all incoming branches"
            },
            "loop": {
                "label": "Loop",
                "description": "Repeat downstream work"
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
                "description": "Connect distant wire segments by name"
            },
            "html": {
                "label": "HTML",
                "description": "Extract text or links from HTML"
            },
            "xml": {
                "label": "XML",
                "description": "Parse or stringify XML documents"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "Payload (JSON)",
                "topic": "Topic"
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
                "timeout": "Timeout"
            },
            "condition": {
                "field": "Value path",
                "operator": "Operator",
                "value": "Compare to"
            },
            "switch": {
                "field": "Value path",
                "value": "Fallback value"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "Iterations",
                "delay": "Delay"
            },
            "trigger": {
                "delay": "Delay",
                "payload": "Payload (JSON)"
            },
            "delay": {
                "mode": "Mode",
                "delay": "Delay",
                "randomMin": "Minimum",
                "randomMax": "Maximum"
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
                "timeout": "Timeout"
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
                "header": "First row is header"
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
                "args": "Arguments (JSON)",
                "timeout": "Timeout"
            },
            "split": {
                "field": "Value path",
                "delimiter": "Delimiter"
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
                "order": "Order"
            },
            "range": {
                "from": "From",
                "to": "To",
                "step": "Step"
            },
            "batch": {
                "field": "Array path",
                "size": "Batch size"
            },
            "trycatch": {
                "timeout": "Timeout"
            },
            "subprocess": {
                "workflow": "Workflow JSON"
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
                "console": "Also print to console"
            },
            "link": {
                "links": "Link names"
            },
            "html": {
                "field": "HTML path",
                "mode": "Output",
                "target": "Write result to"
            },
            "xml": {
                "mode": "Mode",
                "field": "XML path",
                "target": "Write result to",
                "pretty": "Pretty print"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "orders.created",
                "payload": "{ \"value\": 1 }"
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
            "join": {},
            "loop": {},
            "trigger": {
                "payload": "{ \"ok\": true }"
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
                "delimiter": ","
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
                "field": "items"
            },
            "trycatch": {},
            "subprocess": {},
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
                "target": "value"
            },
            "xml": {
                "field": "value",
                "target": "value"
            },
            "link": {
                "links": "flow-a, flow-b"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "optional label carried with the payload",
                "payload": "JSON merged into the flow context"
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
                "timeout": "maximum time for this step; 0 means no limit"
            },
            "condition": {
                "field": "context path to test, for example approved or user.role",
                "operator": "comparison used to choose the true or false output",
                "value": "value used by the selected operator"
            },
            "switch": {
                "field": "value used to choose an output port",
                "value": "used when no value path is set"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "number of times downstream steps run",
                "delay": "wait time between iterations"
            },
            "trigger": {
                "delay": "time to wait before emitting the payload",
                "payload": "JSON emitted when the trigger fires"
            },
            "delay": {
                "delay": "pause duration before the next node",
                "mode": "fixed waits a set time; random picks a value in the range",
                "randomMin": "minimum random delay",
                "randomMax": "maximum random delay"
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
                "timeout": "maximum wait time for the request"
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
                "header": "treat the first row as column names"
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
                "args": "JSON array passed to the command",
                "command": "host command or function name",
                "timeout": "maximum execution time for the command"
            },
            "split": {
                "field": "text or array path to split",
                "delimiter": "separator used when splitting text"
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
                "order": "ascending or descending"
            },
            "range": {
                "from": "inclusive start value",
                "to": "exclusive end value",
                "step": "amount added on each step"
            },
            "batch": {
                "size": "number of items per batch",
                "field": "array path to split into batches"
            },
            "trycatch": {
                "timeout": "route to the timeout port after this delay"
            },
            "subprocess": {
                "workflow": "workflow definition to execute"
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
                "level": "output level: info, warn or error"
            },
            "link": {
                "links": "optional comma-separated names for remote wires"
            },
            "html": {
                "field": "context path containing HTML text",
                "mode": "text strips markup; links collects href and src values",
                "target": "context field that receives the extracted value"
            },
            "xml": {
                "mode": "parse XML text or serialize an object back to XML",
                "field": "context path containing XML text or an object",
                "target": "context field that receives the result",
                "pretty": "indent serialized XML"
            }
        },
        "group": {
            "reliability": "Reliability",
            "options": "Options",
            "delay": "Delay",
            "request": "Request",
            "template": "Template",
            "output": "Output"
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
            "auto": "Auto (JSON when possible)",
            "json": "Parsed JSON",
            "text": "Text",
            "mustache": "Mustache",
            "plain": "Plain text",
            "parse": "Parse",
            "stringify": "Stringify",
            "set": "Set",
            "delete": "Delete",
            "append": "Append",
            "count": "Count",
            "sum": "Sum",
            "avg": "Average",
            "min": "Min",
            "max": "Max",
            "object": "Object merge",
            "array": "Array concat",
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
            "links": "Links"
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
                "description": "以固定数据启动流程"
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
                "description": "按值路由到匹配的输出"
            },
            "parallel": {
                "label": "并行",
                "description": "并发执行所有输出分支"
            },
            "join": {
                "label": "汇聚",
                "description": "等待所有输入分支完成"
            },
            "loop": {
                "label": "循环",
                "description": "重复执行下游步骤"
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
                "label": "连线",
                "description": "按名称连接画布上的远程连线"
            },
            "html": {
                "label": "HTML",
                "description": "从 HTML 提取文本或链接"
            },
            "xml": {
                "label": "XML",
                "description": "解析或序列化 XML 文档"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "数据（JSON）",
                "topic": "主题"
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
                "timeout": "超时"
            },
            "condition": {
                "field": "取值路径",
                "operator": "运算符",
                "value": "比较值"
            },
            "switch": {
                "field": "取值路径",
                "value": "默认值"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "迭代次数",
                "delay": "延迟"
            },
            "trigger": {
                "delay": "延迟",
                "payload": "数据（JSON）"
            },
            "delay": {
                "mode": "模式",
                "delay": "延迟",
                "randomMin": "最小值",
                "randomMax": "最大值"
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
                "timeout": "超时"
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
                "header": "首行为表头"
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
                "args": "参数（JSON）",
                "timeout": "超时"
            },
            "split": {
                "field": "取值路径",
                "delimiter": "分隔符"
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
                "order": "顺序"
            },
            "range": {
                "from": "起始",
                "to": "结束",
                "step": "步长"
            },
            "batch": {
                "field": "数组路径",
                "size": "批大小"
            },
            "trycatch": {
                "timeout": "超时"
            },
            "subprocess": {
                "workflow": "工作流 JSON"
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
                "console": "同时输出到控制台"
            },
            "link": {
                "links": "连线名称"
            },
            "html": {
                "field": "HTML 路径",
                "mode": "输出",
                "target": "结果写入字段"
            },
            "xml": {
                "mode": "模式",
                "field": "XML 路径",
                "target": "结果写入字段",
                "pretty": "格式化输出"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "{ \"value\": 1 }",
                "topic": "orders.created"
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
            "join": {},
            "loop": {},
            "trigger": {
                "payload": "{ \"ok\": true }"
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
                "delimiter": ","
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
                "field": "items"
            },
            "trycatch": {},
            "subprocess": {},
            "comment": {},
            "custom": {},
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
                "target": "value"
            },
            "xml": {
                "field": "value",
                "target": "value"
            },
            "link": {
                "links": "flow-a, flow-b"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "随数据一起传递的可选标签。",
                "payload": "合并到流程上下文的 JSON 数据。"
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
                "timeout": "此步骤的最长执行时间，0 表示不限制。"
            },
            "condition": {
                "field": "要判断的上下文路径，例如 approved 或 user.role。",
                "operator": "选择判断方式，决定进入 true 还是 false 分支。",
                "value": "当前运算符使用的比较值。"
            },
            "switch": {
                "field": "用于选择输出端口的上下文路径。",
                "value": "未设置取值路径时使用的字面值。"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "重复执行下游步骤的次数。",
                "delay": "每次迭代之间的等待时间。"
            },
            "trigger": {
                "delay": "发送数据前的等待时间。",
                "payload": "触发时输出的 JSON 数据。"
            },
            "delay": {
                "delay": "进入下一个节点前的等待时间。",
                "mode": "固定延迟或区间内随机延迟。",
                "randomMin": "随机延迟的最小时间。",
                "randomMax": "随机延迟的最大时间。"
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
                "timeout": "请求的最长等待时间。"
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
                "header": "解析时把首行作为字段名。"
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
                "args": "传给命令的 JSON 数组。",
                "command": "宿主注册的命令或函数名。",
                "timeout": "命令的最长执行时间。"
            },
            "split": {
                "field": "要拆分的文本或数组路径。",
                "delimiter": "拆分文本时使用的分隔符。"
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
                "order": "升序或降序。"
            },
            "range": {
                "from": "区间起始值（包含）。",
                "to": "区间结束值（不包含）。",
                "step": "每次增加的数量。"
            },
            "batch": {
                "size": "每批包含的元素数量。",
                "field": "要分批的数组路径。"
            },
            "trycatch": {
                "timeout": "超过该时间后进入超时端口。"
            },
            "subprocess": {
                "workflow": "要执行的工作流定义。"
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
                "level": "输出级别：info、warn 或 error。"
            },
            "link": {
                "links": "用于识别远程连线的可选名称，逗号分隔。"
            },
            "html": {
                "field": "包含 HTML 文本的上下文路径。",
                "mode": "文本：去除标签；链接：收集 href/src。",
                "target": "接收提取结果的上下文字段。"
            },
            "xml": {
                "mode": "解析 XML 文本，或把对象序列化为 XML。",
                "field": "包含 XML 或对象的上下文路径。",
                "target": "接收解析或序列化结果的上下文字段。",
                "pretty": "序列化时使用缩进。"
            }
        },
        "group": {
            "reliability": "可靠性",
            "options": "选项",
            "delay": "延迟",
            "request": "请求",
            "template": "模板",
            "output": "输出"
        },
        "option": {
            "truthy": "为真",
            "equals": "等于",
            "not-equals": "不等于",
            "gt": "大于",
            "lt": "小于",
            "fixed": "固定延迟",
            "random": "随机延迟",
            "auto": "自动（能解析则 JSON）",
            "json": "JSON",
            "text": "文本",
            "mustache": "Mustache",
            "plain": "纯文本",
            "parse": "解析",
            "stringify": "序列化",
            "set": "设置",
            "delete": "删除",
            "append": "追加",
            "count": "计数",
            "sum": "求和",
            "avg": "平均",
            "min": "最小",
            "max": "最大",
            "object": "对象合并",
            "array": "数组拼接",
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
            "links": "链接"
        }
    }
};
