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
                "description": "Entry point of the workflow"
            },
            "end": {
                "label": "End",
                "description": "Finish the workflow"
            },
            "inject": {
                "label": "Inject",
                "description": "Start with a fixed payload"
            },
            "task": {
                "label": "Task",
                "description": "Run a named action or return a fixed result"
            },
            "function": {
                "label": "Function",
                "description": "Run trusted JavaScript against the workflow context"
            },
            "condition": {
                "label": "Condition",
                "description": "Branch on a context field"
            },
            "switch": {
                "label": "Switch",
                "description": "Route by a context value"
            },
            "parallel": {
                "label": "Parallel",
                "description": "Run all outgoing branches concurrently"
            },
            "join": {
                "label": "Join",
                "description": "Wait for all incoming branches before continuing"
            },
            "loop": {
                "label": "Loop",
                "description": "Repeat the node body"
            },
            "trigger": {
                "label": "Trigger",
                "description": "Emit a payload after an optional delay"
            },
            "delay": {
                "label": "Delay",
                "description": "Wait before continuing"
            },
            "log": {
                "label": "Log",
                "description": "Record a message"
            },
            "http-request": {
                "label": "HTTP request",
                "description": "Call an HTTP endpoint"
            },
            "assign": {
                "label": "Assign",
                "description": "Merge values into workflow variables"
            },
            "transform": {
                "label": "Transform",
                "description": "Map the previous result"
            },
            "template": {
                "label": "Template",
                "description": "Render a message template"
            },
            "json": {
                "label": "JSON",
                "description": "Parse or stringify JSON"
            },
            "csv": {
                "label": "CSV",
                "description": "Parse or stringify CSV"
            },
            "change": {
                "label": "Change",
                "description": "Set, delete or append a context field"
            },
            "statistics": {
                "label": "Statistics",
                "description": "Aggregate an array (count/sum/avg/min/max)"
            },
            "merge": {
                "label": "Merge",
                "description": "Merge objects or concatenate arrays"
            },
            "event-emit": {
                "label": "Emit event",
                "description": "Emit an event through the workflow event bus"
            },
            "event-wait": {
                "label": "Wait event",
                "description": "Wait for a workflow event"
            },
            "command": {
                "label": "Command",
                "description": "Run a host-provided command executor"
            },
            "split": {
                "label": "Split",
                "description": "Split a string or array into items"
            },
            "map": {
                "label": "Map",
                "description": "Map each array item"
            },
            "filter": {
                "label": "Filter",
                "description": "Keep array items that match a condition"
            },
            "sort": {
                "label": "Sort",
                "description": "Sort an array by a field"
            },
            "range": {
                "label": "Range",
                "description": "Generate a numeric range"
            },
            "batch": {
                "label": "Batch",
                "description": "Split an array into chunks"
            },
            "trycatch": {
                "label": "Try / catch",
                "description": "Route failures to an error branch"
            },
            "subprocess": {
                "label": "Sub workflow",
                "description": "Execute another workflow"
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
                "description": "Inspect a message property or the complete message"
            },
            "junction": {
                "label": "Junction",
                "description": "Route wires without changing the message"
            },
            "sequence": {
                "label": "Sequence",
                "description": "Keep steps in a strict order"
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
                "description": "Parse or stringify XML"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "Payload",
                "topic": "Topic"
            },
            "task": {
                "action": "Action",
                "result": "Mock result",
                "fail": "Fail this step",
                "retry": "Retries",
                "retryDelay": "Retry delay",
                "timeout": "Timeout"
            },
            "function": {
                "code": "Code",
                "timeout": "Timeout"
            },
            "condition": {
                "field": "Field",
                "operator": "Operator",
                "value": "Compare with"
            },
            "switch": {
                "field": "Value field",
                "value": "Value"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "Iterations",
                "delay": "Delay"
            },
            "trigger": {
                "delay": "Delay",
                "payload": "Payload"
            },
            "delay": {
                "mode": "Mode",
                "delay": "Delay",
                "randomMin": "Minimum",
                "randomMax": "Maximum"
            },
            "log": {
                "message": "Message",
                "field": "Message property",
                "complete": "Complete message",
                "level": "Level"
            },
            "http-request": {
                "url": "URL",
                "method": "Method",
                "headers": "Headers",
                "body": "Body",
                "responseType": "Response",
                "retry": "Retries",
                "retryDelay": "Retry delay",
                "timeout": "Timeout"
            },
            "assign": {
                "values": "Values"
            },
            "transform": {
                "mapping": "Mapping",
                "result": "Fixed result"
            },
            "template": {
                "template": "Template",
                "syntax": "Syntax",
                "target": "Target field",
                "output": "Output"
            },
            "json": {
                "mode": "Mode",
                "field": "Field",
                "pretty": "Pretty print"
            },
            "csv": {
                "mode": "Mode",
                "field": "Field",
                "delimiter": "Delimiter",
                "header": "First row is header"
            },
            "change": {
                "action": "Action",
                "field": "Field",
                "value": "Value",
                "rules": "Rules"
            },
            "statistics": {
                "field": "Array field",
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
                "event": "Event",
                "payload": "Payload"
            },
            "event-wait": {
                "event": "Event",
                "timeout": "Timeout"
            },
            "command": {
                "command": "Command",
                "args": "Args",
                "timeout": "Timeout"
            },
            "split": {
                "field": "Field",
                "delimiter": "Delimiter"
            },
            "map": {
                "field": "Array field",
                "path": "Item path"
            },
            "filter": {
                "field": "Array field",
                "path": "Item path",
                "operator": "Operator",
                "value": "Compare with"
            },
            "sort": {
                "field": "Array field",
                "path": "Sort path",
                "order": "Order"
            },
            "range": {
                "from": "From",
                "to": "To",
                "step": "Step"
            },
            "batch": {
                "field": "Array field",
                "size": "Batch size"
            },
            "trycatch": {},
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
                "field": "Output property",
                "complete": "Complete message",
                "level": "Level",
                "console": "Also print to console"
            },
            "link": {
                "links": "Links"
            },
            "html": {
                "field": "HTML field",
                "mode": "Output",
                "target": "Target field"
            },
            "xml": {
                "mode": "Mode",
                "field": "XML field",
                "target": "Target field",
                "pretty": "Pretty print"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "optional topic"
            },
            "task": {
                "action": "actions.fetch",
                "result": "{ \"ok\": true }"
            },
            "function": {},
            "condition": {
                "field": "input.approved",
                "value": "true"
            },
            "switch": {
                "field": "input.type",
                "value": "approved"
            },
            "parallel": {},
            "join": {},
            "loop": {},
            "trigger": {
                "payload": "{ \"key\": \"value\" }"
            },
            "delay": {},
            "log": {
                "message": "Workflow step completed",
                "field": "value"
            },
            "http-request": {
                "url": "https://api.example.com",
                "headers": "{ \"Content-Type\": \"application/json\" }",
                "body": "{ \"name\": \"demo\" }"
            },
            "assign": {},
            "transform": {
                "mapping": "{ \"target\": \"input.source\" }"
            },
            "template": {
                "template": "Hello {{input.name}}",
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
                "field": "variables.name"
            },
            "statistics": {
                "field": "items",
                "path": "value"
            },
            "merge": {
                "fields": "first, second"
            },
            "event-emit": {
                "payload": "{ \"key\": \"value\" }"
            },
            "event-wait": {},
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
                "field": "items"
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
                "field": "value",
                "target": "value"
            },
            "xml": {
                "field": "value",
                "target": "value"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "Optional message topic carried with the payload."
            },
            "task": {
                "action": "Function name in context.actions.",
                "result": "Returned directly when no action is set.",
                "retry": "Automatic retries before the step fails."
            },
            "function": {
                "code": "Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions."
            },
            "condition": {
                "field": "Path to the value to test."
            },
            "switch": {
                "field": "Path to the value used for routing.",
                "value": "Literal value used when no value field is configured."
            },
            "parallel": {},
            "join": {},
            "loop": {},
            "trigger": {
                "delay": "Time to wait before emitting the payload."
            },
            "delay": {
                "delay": "Pause before continuing."
            },
            "log": {
                "message": "Message written to the execution log when no field is set.",
                "field": "Optional context path; logs that value instead of the fixed message.",
                "complete": "Log the complete workflow context instead of one property."
            },
            "http-request": {
                "url": "Absolute endpoint or a path resolved by the host."
            },
            "assign": {},
            "transform": {
                "mapping": "Map context paths into the new result."
            },
            "template": {
                "template": "Use {{path.to.value}} placeholders.",
                "target": "Context field that receives the rendered text."
            },
            "json": {
                "field": "Path to the value to parse or stringify."
            },
            "csv": {
                "field": "Path to the CSV text or array.",
                "delimiter": "Single character used between columns."
            },
            "change": {
                "field": "Context path to modify.",
                "value": "New value or item to append."
            },
            "statistics": {
                "field": "Path to the array to aggregate.",
                "path": "Numeric property of each item."
            },
            "merge": {
                "fields": "Comma-separated paths, e.g. first, second"
            },
            "event-emit": {
                "event": "Event name to publish.",
                "payload": "Optional event payload."
            },
            "event-wait": {
                "event": "Event name to wait for.",
                "timeout": "Route to the timeout port after this delay."
            },
            "command": {
                "args": "Argument array passed to the command."
            },
            "split": {
                "field": "Text or array to split.",
                "delimiter": "Separator used when splitting text."
            },
            "map": {
                "path": "e.g. value or user.name"
            },
            "filter": {},
            "sort": {
                "path": "Property of each item used for ordering."
            },
            "range": {},
            "batch": {
                "size": "Items per batch."
            },
            "trycatch": {},
            "subprocess": {
                "workflow": "Inline workflow definition to execute."
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
                "field": "Context path to print instead of the complete message.",
                "complete": "Print the complete workflow context.",
                "console": "Mirror the message to the host console."
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
                "description": "工作流入口"
            },
            "end": {
                "label": "结束",
                "description": "结束工作流"
            },
            "inject": {
                "label": "注入",
                "description": "以固定数据触发流程"
            },
            "task": {
                "label": "任务",
                "description": "执行命名动作或返回固定结果"
            },
            "function": {
                "label": "函数",
                "description": "对工作流上下文执行受信任的 JavaScript"
            },
            "condition": {
                "label": "条件",
                "description": "根据上下文分支"
            },
            "switch": {
                "label": "多路分支",
                "description": "按上下文值选择分支"
            },
            "parallel": {
                "label": "并行",
                "description": "并发执行所有输出分支"
            },
            "join": {
                "label": "汇聚",
                "description": "等待所有输入分支完成后再继续"
            },
            "loop": {
                "label": "循环",
                "description": "重复执行节点体"
            },
            "trigger": {
                "label": "触发",
                "description": "延迟后输出一次数据"
            },
            "delay": {
                "label": "延迟",
                "description": "等待后继续"
            },
            "log": {
                "label": "日志",
                "description": "记录一条消息"
            },
            "http-request": {
                "label": "HTTP 请求",
                "description": "调用 HTTP 接口"
            },
            "assign": {
                "label": "赋值",
                "description": "将值合并到工作流变量"
            },
            "transform": {
                "label": "转换",
                "description": "映射上一步结果"
            },
            "template": {
                "label": "模板",
                "description": "渲染消息模板"
            },
            "json": {
                "label": "JSON",
                "description": "解析或序列化 JSON"
            },
            "csv": {
                "label": "CSV",
                "description": "解析或序列化 CSV"
            },
            "change": {
                "label": "修改属性",
                "description": "设置、删除或追加上下文字段"
            },
            "statistics": {
                "label": "统计",
                "description": "聚合数组（计数/求和/平均/最小/最大）"
            },
            "merge": {
                "label": "合并",
                "description": "合并对象或拼接数组"
            },
            "event-emit": {
                "label": "发送事件",
                "description": "通过工作流事件总线发送事件"
            },
            "event-wait": {
                "label": "等待事件",
                "description": "等待工作流事件"
            },
            "command": {
                "label": "命令",
                "description": "调用宿主提供的命令执行器"
            },
            "split": {
                "label": "拆分",
                "description": "将字符串或数组拆分为元素"
            },
            "map": {
                "label": "映射",
                "description": "映射数组中的每个元素"
            },
            "filter": {
                "label": "过滤",
                "description": "保留满足条件的数组元素"
            },
            "sort": {
                "label": "排序",
                "description": "按字段排序数组"
            },
            "range": {
                "label": "区间",
                "description": "生成数值区间"
            },
            "batch": {
                "label": "批处理",
                "description": "将数组拆分为批次"
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
                "description": "画布注释，不参与执行"
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
                "description": "仅汇合连线，不改变消息"
            },
            "sequence": {
                "label": "顺序",
                "description": "按严格顺序执行步骤"
            },
            "link": {
                "label": "连线",
                "description": "按名称连接画布上的远程连线"
            },
            "html": {
                "label": "HTML",
                "description": "从 HTML 中提取文本或链接"
            },
            "xml": {
                "label": "XML",
                "description": "解析或序列化 XML"
            }
        },
        "field": {
            "start": {},
            "end": {},
            "inject": {
                "payload": "数据",
                "topic": "主题"
            },
            "task": {
                "action": "动作",
                "result": "模拟结果",
                "fail": "使此步骤失败",
                "retry": "重试次数",
                "retryDelay": "重试间隔",
                "timeout": "超时"
            },
            "function": {
                "code": "代码",
                "timeout": "超时"
            },
            "condition": {
                "field": "字段",
                "operator": "运算符",
                "value": "比较值"
            },
            "switch": {
                "field": "取值字段",
                "value": "值"
            },
            "parallel": {},
            "join": {},
            "loop": {
                "iterations": "迭代次数",
                "delay": "延迟"
            },
            "trigger": {
                "delay": "延迟",
                "payload": "数据"
            },
            "delay": {
                "mode": "模式",
                "delay": "延迟",
                "randomMin": "最小值",
                "randomMax": "最大值"
            },
            "log": {
                "message": "消息",
                "field": "消息属性",
                "complete": "完整消息",
                "level": "级别"
            },
            "http-request": {
                "url": "地址",
                "method": "方法",
                "headers": "请求头",
                "body": "请求体",
                "responseType": "响应解析",
                "retry": "重试次数",
                "retryDelay": "重试间隔",
                "timeout": "超时"
            },
            "assign": {
                "values": "值"
            },
            "transform": {
                "mapping": "映射",
                "result": "固定结果"
            },
            "template": {
                "template": "模板",
                "syntax": "语法",
                "target": "目标字段",
                "output": "输出类型"
            },
            "json": {
                "mode": "模式",
                "field": "字段",
                "pretty": "格式化输出"
            },
            "csv": {
                "mode": "模式",
                "field": "字段",
                "delimiter": "分隔符",
                "header": "首行为表头"
            },
            "change": {
                "action": "操作",
                "field": "字段",
                "value": "值",
                "rules": "规则"
            },
            "statistics": {
                "field": "数组字段",
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
                "event": "事件",
                "payload": "数据"
            },
            "event-wait": {
                "event": "事件",
                "timeout": "超时"
            },
            "command": {
                "command": "命令",
                "args": "参数",
                "timeout": "超时"
            },
            "split": {
                "field": "字段",
                "delimiter": "分隔符"
            },
            "map": {
                "field": "数组字段",
                "path": "元素路径"
            },
            "filter": {
                "field": "数组字段",
                "path": "元素路径",
                "operator": "运算符",
                "value": "比较值"
            },
            "sort": {
                "field": "数组字段",
                "path": "排序路径",
                "order": "顺序"
            },
            "range": {
                "from": "起始",
                "to": "结束",
                "step": "步长"
            },
            "batch": {
                "field": "数组字段",
                "size": "批大小"
            },
            "trycatch": {},
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
                "field": "输出属性",
                "complete": "完整消息",
                "level": "级别",
                "console": "同时输出到控制台"
            },
            "link": {
                "links": "连线名称"
            },
            "html": {
                "field": "HTML 字段",
                "mode": "输出",
                "target": "目标字段"
            },
            "xml": {
                "mode": "模式",
                "field": "XML 字段",
                "target": "目标字段",
                "pretty": "格式化输出"
            }
        },
        "fieldPlaceholder": {
            "start": {},
            "end": {},
            "inject": {},
            "task": {
                "action": "actions.fetch"
            },
            "function": {},
            "condition": {},
            "switch": {},
            "parallel": {},
            "join": {},
            "loop": {},
            "trigger": {},
            "delay": {},
            "log": {},
            "http-request": {},
            "assign": {},
            "transform": {},
            "template": {},
            "json": {},
            "csv": {},
            "change": {},
            "statistics": {},
            "merge": {},
            "event-emit": {},
            "event-wait": {},
            "command": {},
            "split": {},
            "map": {},
            "filter": {},
            "sort": {},
            "range": {},
            "batch": {},
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
                "field": "value",
                "target": "value"
            },
            "xml": {
                "field": "value",
                "target": "value"
            }
        },
        "fieldDescription": {
            "start": {},
            "end": {},
            "inject": {
                "topic": "随数据一起传递的可选消息主题。"
            },
            "task": {
                "action": "context.actions 中的函数名。",
                "result": "未配置动作时直接返回该结果。",
                "retry": "步骤失败前的自动重试次数。"
            },
            "function": {
                "code": "受信任代码。`context` 是工作流上下文，`input` 是上一步结果。按 Ctrl+Space 获取上下文和变量提示。"
            },
            "condition": {
                "field": "要判断的值路径。"
            },
            "switch": {
                "field": "用于分支判断的取值路径。",
                "value": "未设置取值字段时使用的字面值。"
            },
            "parallel": {},
            "join": {},
            "loop": {},
            "trigger": {
                "delay": "发送数据前的等待时间。"
            },
            "delay": {
                "delay": "继续执行前的等待时间。"
            },
            "log": {
                "message": "未设置字段时写入执行日志的消息。",
                "field": "可选的上下文路径，用该值代替固定消息写入日志。",
                "complete": "记录完整工作流上下文，而不是单个属性。"
            },
            "http-request": {
                "url": "绝对地址或由宿主解析的路径。"
            },
            "assign": {},
            "transform": {
                "mapping": "将上下文路径映射到新的结果。"
            },
            "template": {
                "template": "使用 {{path.to.value}} 占位符。",
                "target": "接收渲染结果的上文字段。"
            },
            "json": {
                "field": "要解析或序列化的值路径。"
            },
            "csv": {
                "field": "CSV 文本或数组的路径。",
                "delimiter": "列之间的单字符分隔符。"
            },
            "change": {
                "field": "要修改的上下文路径。",
                "value": "新值或要追加的内容。"
            },
            "statistics": {
                "field": "要聚合的数组路径。",
                "path": "每个元素的数值属性。"
            },
            "merge": {
                "fields": "逗号分隔的路径，例如 first, second。"
            },
            "event-emit": {
                "event": "要发布的事件名。",
                "payload": "可选的事件数据。"
            },
            "event-wait": {
                "event": "要等待的事件名。",
                "timeout": "超过该时间后进入超时端口。"
            },
            "command": {
                "args": "传给命令的参数数组。"
            },
            "split": {
                "field": "要拆分的文本或数组。",
                "delimiter": "拆分文本时使用的分隔符。"
            },
            "map": {
                "path": "例如 value 或 user.name。"
            },
            "filter": {},
            "sort": {
                "path": "用于排序的元素属性。"
            },
            "range": {},
            "batch": {
                "size": "每批包含的元素数量。"
            },
            "trycatch": {},
            "subprocess": {
                "workflow": "要执行的内联工作流定义。"
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
                "field": "打印的上下文属性路径；留空时打印完整消息。",
                "complete": "打印完整工作流上下文。",
                "console": "同时输出到宿主控制台。"
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
