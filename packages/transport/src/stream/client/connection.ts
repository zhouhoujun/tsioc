// import { Abstract, EMPTY_OBJ, Injectable, isDefined } from '@tsdi/ioc';
// import { IncomingHeaders, InvalidHeaderTokenExecption } from '@tsdi/core';
// import { Duplex } from 'stream';
// import { Connection, ConnectionOpts, Packetor } from '../../connection';
// import { ClientStream } from './stream';
// import { SteamOptions } from '../stream/stream';




// @Abstract()
// export abstract class RequestStrategy {
//     abstract request(connection: ClientConnection, headers: IncomingHeaders, options: ClientRequsetOpts): ClientStream;
// }

// /**
//  * Client Session options.
//  */
// export interface ClientConnectionOpts extends ConnectionOpts {
//     authority?: string;
//     clientId?: string;
// }



// /**
//  * Client Connection.
//  */
// export class ClientConnection extends Connection {

//     private sid = 1;
//     readonly authority: string;
//     readonly clientId: string;
//     constructor(duplex: Duplex, packetor: Packetor, opts: ClientConnectionOpts = EMPTY_OBJ, private strategy: RequestStrategy) {
//         super(duplex, packetor, opts)
//         this.authority = opts.authority ?? '';
//         this.clientId = opts.clientId ?? '';
//     }

//     getNextStreamId(id?: number) {
//         if (id) {
//             this.sid = id + 1;
//             return this.sid;
//         }
//         return this.sid += 2;
//     }


//     request(headers: IncomingHeaders, options?: ClientRequsetOpts): ClientStream {
//         if (this.destroyed) {
//             throw new InvalidSessionExecption('connection destroyed!')
//         }
//         if (this.isClosed) {
//             throw new GoawayExecption('connection closed!')
//         }
//         this._updateTimer();

//         // if (isDefined(headers)) {
//         //     const keys = Object.keys(headers);
//         //     for (let i = 0; i < keys.length; i++) {
//         //         const header = keys[i];
//         //         if (header && !this.packetor.valid(header)) {
//         //             this.destroy(new InvalidHeaderTokenExecption('Header name' + header));
//         //         }
//         //     }
//         // }

//         return this.strategy.request(this, headers, options ?? {});

//     }

// }

// @Injectable()
// export class DefaultRequestStrategy extends RequestStrategy {
//     request(connection: ClientConnection, headers: IncomingHeaders, options: ClientRequsetOpts): ClientStream {
//         const id = connection.getNextStreamId();
//         const stream = new ClientStream(connection, id, headers, options);
//         return stream;
//     }

// }
