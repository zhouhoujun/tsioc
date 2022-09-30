// import { IncomingHeaders } from '@tsdi/core';
// import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
// import { Duplex } from 'stream';
// import { Connection, ConnectionOpts, Packetor } from '../connection';
// import { ev } from '../consts';
// import { ServerStream } from './stream';

// @Abstract()
// export abstract class EventStrategy {
//     abstract bind(connection: ServerConnection, opts: ConnectionOpts): void;
// }

// export class ServerConnection extends Connection {
//     private sid = 0;
//     constructor(stream: Duplex, packetor: Packetor, opts: ConnectionOpts = EMPTY_OBJ) {
//         super(stream, packetor, opts);
//         this.stream.on(ev.CONNECTION, this.emit.bind(this, ev.CONNECTION));
//     }

//     getNextStreamId(id?: number) {
//         if (id) {
//             this.sid = id + 1;
//             return this.sid;
//         }
//         return this.sid += 2;
//     }

//     addListener(event: 'connect', listener: (session: ServerConnection, socket: Duplex) => void): this;
//     addListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
//     addListener(event: string | symbol, listener: (...args: any[]) => void): this;
//     addListener(event: string | symbol, listener: (...args: any[]) => void): this {
//         return this._addListener(event, listener);
//     }

//     emit(event: 'connect', session: ServerConnection, socket: Duplex): boolean;
//     emit(event: 'stream', stream: ServerConnection, headers: IncomingHeaders, flags: number): boolean;
//     emit(event: string | symbol, ...args: any[]): boolean;
//     emit(event: string | symbol, ...args: any[]): boolean {
//         return this._emit(event, ...args);
//     }

//     on(event: 'connect', listener: (session: ServerConnection, socket: Duplex) => void): this;
//     on(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
//     on(event: string | symbol, listener: (...args: any[]) => void): this;
//     on(event: string | symbol, listener: (...args: any[]) => void): this {
//         return this._on(event, listener);
//     }

//     once(event: 'connect', listener: (session: ServerConnection, socket: Duplex) => void): this;
//     once(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
//     once(event: string | symbol, listener: (...args: any[]) => void): this;
//     once(event: string | symbol, listener: (...args: any[]) => void): this {
//         return this._once(event, listener);
//     }

//     prependListener(event: 'connect', listener: (session: ServerConnection, socket: Duplex) => void): this;
//     prependListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
//     prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
//     prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
//         return this._prependListener(event, listener);
//     }

//     prependOnceListener(event: 'connect', listener: (session: ServerConnection, socket: Duplex) => void): this;
//     prependOnceListener(event: 'stream', listener: (stream: ServerStream, headers: IncomingHeaders, flags: number) => void): this;
//     prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
//     prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
//         return this._prependOnceListener(event, listener);
//     }

// }

