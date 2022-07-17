import { RequestPacket } from '@tsdi/core';
import { Writable } from 'stream';

/**
 * incoming request packet.
 */
export interface IncomingRequest<T = any> extends RequestPacket<T> {
    pipe<T extends Writable>(destination: T, options?: { end?: boolean | undefined; }): T;
}
