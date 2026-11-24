import { registerWorkflowNodeHandlers } from '../workflow-node-handlers';
import { runHttp } from '../http';
import {
    configNode,
    fileInNode,
    fileOutNode,
    httpInNode,
    httpResponseNode,
    inboundNode,
    mqttOutNode,
    tailNode,
    transportOutNode,
    watchNode
} from '../network-nodes';

/** Network transports, file IO, HTTP and config-node handlers. */
registerWorkflowNodeHandlers({
    'http-request': ({ node, context }) => runHttp(node, context),
    'http-in': ({ node, context }) => httpInNode(node, context),
    'tcp-in': ({ node, context }) => inboundNode(node, context),
    'udp-in': ({ node, context }) => inboundNode(node, context),
    'websocket-in': ({ node, context }) => inboundNode(node, context),
    'mqtt-in': ({ node, context }) => inboundNode(node, context),
    'tcp-out': ({ node, context }) => transportOutNode(node, context),
    'udp-out': ({ node, context }) => transportOutNode(node, context),
    'websocket-out': ({ node, context }) => transportOutNode(node, context),
    'file-in': ({ node, context }) => fileInNode(node, context),
    'file-out': ({ node, context }) => fileOutNode(node, context),
    'watch': ({ node, context }) => watchNode(node, context),
    'tail': ({ node, context }) => tailNode(node, context),
    'global-config': ({ node, context }) => configNode(node, context),
    'mqtt': ({ node, context }) => configNode(node, context),
    'websocket': ({ node, context }) => configNode(node, context),
    'tls': ({ node, context }) => configNode(node, context),
    'mqtt-out': ({ node, context }) => mqttOutNode(node, context),
    'http-response': ({ node, context }) => httpResponseNode(node, context)
});
