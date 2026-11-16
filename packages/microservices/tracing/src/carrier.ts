/**
 * Trace carrier helpers for message brokers.
 *
 * Every broker exposes headers differently (kafkajs Buffers, amqplib plain
 * objects, nats `MsgHdrs`, MQTT 5 user properties). These helpers normalize
 * them into the `Record<string, string>` shape expected by `Tracer`.
 */

function toHeaderString(value: unknown): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.length ? toHeaderString(value[0]) : undefined;
    }
    return String(value);
}

/**
 * Normalize a broker header map (object or nats `MsgHdrs`) into lower-cased
 * string values.
 */
export function normalizeCarrierHeaders(raw: unknown): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!raw) {
        return headers;
    }
    const candidate = raw as { keys?: () => Iterable<string>; get?: (key: string) => unknown };
    if (typeof candidate.keys === 'function' && typeof candidate.get === 'function') {
        for (const key of candidate.keys()) {
            const value = toHeaderString(candidate.get(key));
            if (value !== undefined) {
                headers[String(key).toLowerCase()] = value;
            }
        }
        return headers;
    }
    if (typeof raw !== 'object') {
        return headers;
    }
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        const normalized = toHeaderString(value);
        if (normalized !== undefined) {
            headers[key.toLowerCase()] = normalized;
        }
    }
    return headers;
}

/**
 * Extract trace headers from a raw broker delivery.
 *
 * Supported shapes:
 * - kafkajs `EachMessagePayload` (`message.headers`)
 * - amqplib `ConsumeMessage` (`properties.headers`)
 * - nats `Msg` (`msg.headers`)
 * - MQTT 5 `packet.properties.userProperties`
 * - generic `{ headers }`
 */
export function extractBrokerCarrier(input: any): Record<string, string> {
    if (!input || typeof input !== 'object') {
        return {};
    }
    const candidates = [
        input.message?.headers,
        input.properties?.headers,
        input.msg?.headers,
        input.packet?.properties?.userProperties,
        input.headers
    ];
    for (const candidate of candidates) {
        const headers = normalizeCarrierHeaders(candidate);
        if (Object.keys(headers).length) {
            return headers;
        }
    }
    return {};
}

/**
 * Best-effort destination (topic/subject/routing key) for a broker delivery.
 */
export function brokerDestination(input: any): string | undefined {
    return input?.topic
        ?? input?.subject
        ?? input?.fields?.routingKey
        ?? input?.msg?.subject
        ?? input?.message?.topic
        ?? undefined;
}
