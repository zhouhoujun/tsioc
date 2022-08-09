import { Abstract, isFunction } from '@tsdi/ioc';
import { Writable, Duplex, Transform, DuplexOptions } from 'stream';
import { ProtocolPacket } from './packet';


@Abstract()
export abstract class Connection extends Duplex {

    private _parser: Transform;
    private _generator: Writable;
    private _corked: number;
    private _drained: boolean;
    private _forwarding: boolean;
    constructor(readonly stream: Duplex, private packet: ProtocolPacket, opts?: DuplexOptions) {
        super(opts);
        this._parser = packet.parse(opts);
        this._generator = packet.generate(stream, opts);
        this._corked = 1;
        this._drained = false;
        this._forwarding = false;
        this.bindEvents(opts);
    }

    override cork(): void {
        if (++this._corked === 1) this.emit('cork')
    }

    override uncork(): void {
        if (this._corked && --this._corked === 0) this.emit('uncork')
    }

    protected bindEvents(opts?: DuplexOptions) {
        process.nextTick(() => {
            this.stream.pipe(this._parser)
        });

        this._generator.on('error', this.emit.bind(this, 'error'))
        this._parser.on('error', this.emit.bind(this, 'error'))
        this.stream.on('error', this.emit.bind(this, 'error'))
        this.stream.on('close', this.emit.bind(this, 'close'))
    }

    /**
     * Will be `true` if this `TransportSession` instance has been closed, otherwise`false`.
     */
    abstract readonly closed: boolean;
    /**
     * Gracefully closes the `TransportSession`, allowing any existing streams to
     * complete on their own and preventing new `TransportSession` instances from being
     * created. Once closed, `TransportSession.destroy()`_might_ be called if there
     * are no open `TransportSession` instances.
     *
     * If specified, the `callback` function is registered as a handler for the`'close'` event.
     */
    abstract close(): Promise<void>;

    // addListener(event: 'close', listener: () => void): this;
    // addListener(event: 'error', listener: (err: Error) => void): this;
    // addListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // addListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // addListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // addListener(event: 'ping', listener: () => void): this;
    // addListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // addListener(event: 'timeout', listener: () => void): this;
    // addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._addListener(event, listener);
    // }
    protected _addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.addListener(event, listener);
    }


    // emit(event: 'close'): boolean;
    // emit(event: 'error', err: Error): boolean;
    // emit(event: 'frameError', frameType: number, errorCode: number, streamID: number): boolean;
    // emit(event: 'goaway', errorCode: number, lastStreamID: number, opaqueData: Buffer): boolean;
    // emit(event: 'localSettings', settings: SessionSettings): boolean;
    // emit(event: 'ping'): boolean;
    // emit(event: 'remoteSettings', settings: SessionSettings): boolean;
    // emit(event: 'timeout'): boolean;
    // emit(event: string | symbol, ...args: any[]): boolean {
    //     return this._emit(event, ...args);
    // }
    protected _emit(event: string | symbol, ...args: any[]): boolean {
        return super.emit(event, ...args);
    }

    // on(event: 'close', listener: () => void): this;
    // on(event: 'error', listener: (err: Error) => void): this;
    // on(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // on(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // on(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // on(event: 'ping', listener: () => void): this;
    // on(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // on(event: 'timeout', listener: () => void): this;
    // on(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._on(event, listener);
    // }
    protected _on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    // once(event: 'close', listener: () => void): this;
    // once(event: 'error', listener: (err: Error) => void): this;
    // once(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // once(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // once(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // once(event: 'ping', listener: () => void): this;
    // once(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // once(event: 'timeout', listener: () => void): this;
    // once(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._once(event, listener);
    // }
    protected _once(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.once(event, listener);
    }

    // prependListener(event: 'close', listener: () => void): this;
    // prependListener(event: 'error', listener: (err: Error) => void): this;
    // prependListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // prependListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // prependListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // prependListener(event: 'ping', listener: () => void): this;
    // prependListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // prependListener(event: 'timeout', listener: () => void): this;
    // prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._prependListener(event, listener);
    // }
    protected _prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependListener(event, listener);
    }


    // prependOnceListener(event: 'close', listener: () => void): this;
    // prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    // prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number, streamID: number) => void): this;
    // prependOnceListener(event: 'goaway', listener: (errorCode: number, lastStreamID: number, opaqueData: Buffer) => void): this;
    // prependOnceListener(event: 'localSettings', listener: (settings: SessionSettings) => void): this;
    // prependOnceListener(event: 'ping', listener: () => void): this;
    // prependOnceListener(event: 'remoteSettings', listener: (settings: SessionSettings) => void): this;
    // prependOnceListener(event: 'timeout', listener: () => void): this;
    // prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    //     return this._prependOnceListener(event, listener);
    // }
    protected _prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.prependOnceListener(event, listener);
    }

}

// export interface SessionSettings {
//     headerTableSize?: number | undefined;
//     enablePush?: boolean | undefined;
//     initialWindowSize?: number | undefined;
//     maxFrameSize?: number | undefined;
//     maxConcurrentStreams?: number | undefined;
//     maxHeaderListSize?: number | undefined;
//     enableConnectProtocol?: boolean | undefined;
// }
