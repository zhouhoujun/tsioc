
import { Abstract, tokenId } from '@tsdi/ioc';
import { HeaderPacket, Packet } from '@tsdi/common';
import { Decoder, Encoder } from './coding';
import { IEventEmitter } from './stream';




export interface SendOpts extends Record<string, any> {
    /**
     * request observe type.
     */
    observe?: 'body' | 'events' | 'response' | 'emit';
    /**
     * send from server side or not.
     */
    server?: boolean;
}

export const TRANSPORT_SESSION = tokenId<TransportSession>('TRANSPORT_SESSION');

/**
 * transport session.
 */
export interface TransportSession<TSocket = any> extends IEventEmitter {
    /**
     * socket.
     */
    readonly socket: TSocket;
    /**
     * send packet.
     * @param packet 
     * @param options 
     */
    send(packet: Packet, options?: SendOpts): Promise<void>;

    /**
     * write packet.
     * @param chunk 
     * @param packet
     * @param callback
     */
    write(packet: HeaderPacket, chunk: Uint8Array | null, callback?: (err?: any) => void): void;

    /**
     * Adds the `listener` function to the end of the listeners array for the
     * event named `eventName`. No checks are made to see if the `listener` has
     * already been added. Multiple calls passing the same combination of `eventName`and `listener` will result in the `listener` being added, and called, multiple
     * times.
     *
     * ```js
     * server.on('connection', (stream) => {
     *   console.log('someone connected!');
     * });
     * ```
     *
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     *
     * By default, event listeners are invoked in the order they are added. The`emitter.prependListener()` method can be used as an alternative to add the
     * event listener to the beginning of the listeners array.
     *
     * ```js
     * const myEE = new EventEmitter();
     * myEE.on('foo', () => console.log('a'));
     * myEE.prependListener('foo', () => console.log('b'));
     * myEE.emit('foo');
     * // Prints:
     * //   b
     * //   a
     * ```
     * @since v0.1.101
     * @param eventName The name of the event.
     * @param listener The callback function
     */
    on(eventName: string | symbol, listener: (...args: any[]) => void): this;
    on(eventName: 'message', listener: (packet: Packet) => void): this;
    /**
     * Alias for `emitter.on(eventName, listener)`.
     * @since v0.1.26
     */
    addListener(eventName: string | symbol, listener: (...args: any[]) => void): this;
    addListener(eventName: 'message', listener: (packet: Packet) => void): this;
    /**
     * Adds a **one-time**`listener` function for the event named `eventName`. The
     * next time `eventName` is triggered, this listener is removed and then invoked.
     *
     * ```js
     * server.once('connection', (stream) => {
     *   console.log('Ah, we have our first user!');
     * });
     * ```
     *
     * Returns a reference to the `EventEmitter`, so that calls can be chained.
     *
     * By default, event listeners are invoked in the order they are added. The`emitter.prependOnceListener()` method can be used as an alternative to add the
     * event listener to the beginning of the listeners array.
     *
     * ```js
     * const myEE = new EventEmitter();
     * myEE.once('foo', () => console.log('a'));
     * myEE.prependOnceListener('foo', () => console.log('b'));
     * myEE.emit('foo');
     * // Prints:
     * //   b
     * //   a
     * ```
     * @since v0.3.0
     * @param eventName The name of the event.
     * @param listener The callback function
     */
    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
    once(eventName: 'message', listener: (packet: Packet) => void): this;

    destroy(error?: any): void;
}

/**
 * transport session options.
 */
export interface TransportSessionOpts {
    /**
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * packet delimiter flag
     */
    delimiter?: string;
    /**
     * packet size limit.
     */
    maxSize?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;

    encoder?: Encoder;

    decoder?: Decoder;

    zipHeader?: boolean;
}

/**
 * TransportSession factory.
 */
@Abstract()
export abstract class TransportSessionFactory<TSocket = any> {
    /**
     * create transport session.
     * @param socket 
     * @param headers 
     */
    abstract create(socket: TSocket, opts?: TransportSessionOpts): TransportSession<TSocket>;
}

