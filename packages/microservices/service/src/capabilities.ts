import { token } from '@tsdi/ioc';
import { Transport, TransportConfig } from '@tsdi/common';

export type TransportDelivery = 'at-most-once' | 'at-least-once' | 'both';
export type TransportOrdering = 'none' | 'connection' | 'topic' | 'partition';

/**
 * Declared semantics of one transport. The matrix is intentionally explicit:
 * callers must not infer reliability or ordering from the protocol name.
 */
export interface TransportCapabilities {
    transport: Transport;
    name: string;
    requestResponse: boolean;
    publishSubscribe: boolean;
    streaming: boolean;
    delivery: TransportDelivery;
    consumerIdempotency: boolean;
    ordering: TransportOrdering;
    maxPayloadBytes?: number;
    notes?: string;
}

export interface TransportCapabilityReport {
    capabilities: TransportCapabilities;
    warnings: string[];
}

/**
 * Optional provider exposed by `provideService` so admin/doctor can show the
 * exact capabilities of a running service.
 */
export const SERVICE_CAPABILITIES = token<TransportCapabilityReport[]>('SERVICE_CAPABILITIES');

const MATRIX: Record<number, TransportCapabilities> = {
    [Transport.HTTP]: {
        transport: Transport.HTTP,
        name: 'HTTP',
        requestResponse: true,
        publishSubscribe: false,
        streaming: true,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'none',
        notes: 'SSE/response streaming supported; retries are opt-in at the gateway/client.'
    },
    [Transport.gRPC]: {
        transport: Transport.gRPC,
        name: 'gRPC',
        requestResponse: true,
        publishSubscribe: false,
        streaming: true,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'connection',
        notes: 'Unary and three streaming modes; deadlines/cancellation supported.'
    },
    [Transport.TCP]: {
        transport: Transport.TCP,
        name: 'TCP',
        requestResponse: true,
        publishSubscribe: false,
        streaming: true,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'connection',
        notes: 'Ordered per connection only; reconnect drops unacknowledged work.'
    },
    [Transport.UDP]: {
        transport: Transport.UDP,
        name: 'UDP',
        requestResponse: true,
        publishSubscribe: false,
        streaming: false,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'none',
        notes: 'No delivery or ordering guarantees.'
    },
    [Transport.WS]: {
        transport: Transport.WS,
        name: 'WebSocket',
        requestResponse: true,
        publishSubscribe: true,
        streaming: true,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'connection'
    },
    [Transport.Redis]: {
        transport: Transport.Redis,
        name: 'Redis',
        requestResponse: true,
        publishSubscribe: true,
        streaming: true,
        delivery: 'both',
        consumerIdempotency: false,
        ordering: 'topic',
        notes: 'pubsub is at-most-once; delivery:"stream" is at-least-once with XACK/XAUTOCLAIM.'
    },
    [Transport.NATS]: {
        transport: Transport.NATS,
        name: 'NATS',
        requestResponse: true,
        publishSubscribe: true,
        streaming: true,
        delivery: 'both',
        consumerIdempotency: true,
        ordering: 'topic',
        notes: 'core is at-most-once; delivery:"jetstream" is at-least-once with idempotency support.'
    },
    [Transport.MQTT]: {
        transport: Transport.MQTT,
        name: 'MQTT',
        requestResponse: true,
        publishSubscribe: true,
        streaming: false,
        delivery: 'at-least-once',
        consumerIdempotency: true,
        ordering: 'topic',
        notes: 'QoS1/2 redelivery is at-least-once; opt-in idempotency uses packet.messageId + payload hash (QoS0 has no id).'
    },
    [Transport.Kafka]: {
        transport: Transport.Kafka,
        name: 'Kafka',
        requestResponse: true,
        publishSubscribe: true,
        streaming: true,
        delivery: 'both',
        consumerIdempotency: true,
        ordering: 'partition',
        notes: 'Default commit is at-most-once; delivery:"at-least-once" enables manual commit + retry/DLQ.'
    },
    [Transport.CoAP]: {
        transport: Transport.CoAP,
        name: 'CoAP',
        requestResponse: true,
        publishSubscribe: true,
        streaming: false,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'none',
        notes: 'Observe is supported; delivery depends on CON/ACK retries.'
    },
    [Transport.AMQP]: {
        transport: Transport.AMQP,
        name: 'AMQP',
        requestResponse: true,
        publishSubscribe: true,
        streaming: false,
        delivery: 'both',
        consumerIdempotency: true,
        ordering: 'topic',
        notes: 'Retry queue/DLX and message-id idempotency supported.'
    },
    [Transport.MCP]: {
        transport: Transport.MCP,
        name: 'MCP',
        requestResponse: true,
        publishSubscribe: false,
        streaming: true,
        delivery: 'at-most-once',
        consumerIdempotency: false,
        ordering: 'connection'
    }
};

/** Declared capabilities for a protocol, or `undefined` for unknown transports. */
export function getTransportCapabilities(transport: Transport): TransportCapabilities | undefined {
    const capabilities = MATRIX[transport];
    return capabilities ? { ...capabilities } : undefined;
}

/**
 * Inspect transport configs and surface semantic gaps instead of letting
 * callers assume every broker has the same delivery/idempotency behavior.
 */
export function inspectTransportCapabilities(configs: TransportConfig[]): TransportCapabilityReport[] {
    return (configs ?? []).map(config => {
        const capabilities = getTransportCapabilities(config.transport);
        const warnings: string[] = [];
        if (!capabilities) {
            warnings.push(`unknown transport '${String(config.transport)}'; capability matrix has no entry`);
            return {
                capabilities: {
                    transport: config.transport,
                    name: String(config.transport),
                    requestResponse: false,
                    publishSubscribe: false,
                    streaming: false,
                    delivery: 'at-most-once',
                    consumerIdempotency: false,
                    ordering: 'none'
                },
                warnings
            };
        }
        if (capabilities.delivery === 'at-most-once' && config.microservice) {
            warnings.push(`${capabilities.name}: at-most-once delivery; use retries/idempotency at a higher layer if side effects matter`);
        }
        if (!capabilities.consumerIdempotency && config.microservice) {
            warnings.push(`${capabilities.name}: consumer idempotency is not supported; duplicate deliveries can repeat side effects`);
        }
        return { capabilities, warnings };
    });
}
