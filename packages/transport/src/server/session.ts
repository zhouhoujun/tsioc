import { IncomingHeaders } from '@tsdi/core';
import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import { Readable, Duplex, Transform } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { ev } from '../consts';
import { TransportProtocol } from '../packet';
import { ServerStream } from './stream';

@Abstract()
export abstract class EventStrategy {
    abstract bind(connection: ServerSession, opts: ConnectionOpts): void;
}

export class ServerSession extends Connection {
    private sid = 0;
    constructor(stream: Duplex, packet: TransportProtocol, opts: ConnectionOpts = EMPTY_OBJ, private strategy: EventStrategy) {
        super(stream, packet, opts);

        this.strategy.bind(this, opts);
        // this.stream.on(ev.CONNECT, () => this.emit(ev.CONNECT, this));
        // this._parser.on(ev.DATA, (chunk) => {
        //     if (this.transport.isHeader(chunk)) {
        //         const packet = this.transport.parseHeader(chunk);
        //         const id = this.getNextStreamId(packet.id);
        //         if (id) {
        //             let rstm = this.state.streams.get(id);
        //             if (!rstm) {
        //                 const headers = packet.headers;
        //                 rstm = new ServerStream(this, id, {}, headers);
        //                 this.state.streams.set(id, rstm);
        //                 this.emit(ev.STREAM, rstm, headers)
        //             }
        //         }
        //     }
        // })
    }

    getNextStreamId(id?: number) {
        if (id) {
            this.sid = id + 1;
            return this.sid;
        }
        return this.sid += 2;
    }

    addListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    addListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._addListener(event, listener);
    }

    emit(event: 'connect', session: ServerSession, socket: Duplex): boolean;
    emit(event: 'stream', stream: ServerSession, headers: IncomingHeaders, flags: number): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: string | symbol, ...args: any[]): boolean {
        return this._emit(event, ...args);
    }

    on(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    on(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._on(event, listener);
    }

    once(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    once(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._once(event, listener);
    }

    prependListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    prependListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependListener(event, listener);
    }

    prependOnceListener(event: 'connect', listener: (session: ServerSession, socket: Duplex) => void): this;
    prependOnceListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependOnceListener(event, listener);
    }

}

