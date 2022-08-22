import { IncomingHeaders, OutgoingHeaders } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Readable, Duplex, Transform } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { ev } from '../consts';
import { PacketProtocol } from '../packet';
import { ServerStream } from './stream';


export class ServerSession extends Connection {
    constructor(stream: Duplex, packet: PacketProtocol, opts: ConnectionOpts = EMPTY_OBJ) {
        super(stream, packet, opts);

        this.stream.on(ev.CONNECT, () => this.emit(ev.CONNECT, this));
        this._parser.on(ev.DATA, (chunk) => {
            if (this.packet.isHeader(chunk)) {
                const packet = this.packet.parseHeader(chunk);
                const id = this.getNextId();
                if (id) {
                    let stream = this.state.streams.get(id);
                    if (!stream) {
                        stream = new ServerStream(this, id, {}, packet.headers as OutgoingHeaders);
                        this.state.streams.set(id, stream);
                    }
                    this.emit(ev.STREAM, stream, packet.headers)
                }
            }
        })
    }

    getNextId(): number {
        return this.packet.getNextStreamId()
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

