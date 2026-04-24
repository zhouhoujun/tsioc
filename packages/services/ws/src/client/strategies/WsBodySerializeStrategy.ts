/**
 * WsBodySerializeStrategy
 * WebSocket body serializer using JSON for message payloads.
 * Bilingual JSDoc: English + Chinese explanations.
 */
import { IBodySerializeStrategy } from '@tsdi/common/client/strategies';

/**
 * WsBodySerializeStrategy implements JSON-based serialization for WS payloads.
 * WS message payloads are typically JSON objects or strings.
 *
 * 鉴于 WebSocket 通常传输 JSON 字符串，本策略提供简单的 JSON 序列化/反序列化能力。
 */
export class WsBodySerializeStrategy implements IBodySerializeStrategy {
  /**
   * Serialize a body into a string payload for WS transmission.
   * @param body - The payload to serialize.
   * @returns A string representation suitable for WebSocket.send.
   */
  serialize(body: any): string {
    try {
      return JSON.stringify(body);
    } catch (e) {
      // Fallback to string conversion if JSON fails
      return String(body);
    }
  }

  /**
   * Deserialize a WS message payload into an object if possible.
   * @param raw - Raw message string received via WS.
   * @returns The deserialized object, or the original string on failure.
   */
  deserialize(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      // If it's not JSON, return as-is
      return raw;
    }
  }
}
