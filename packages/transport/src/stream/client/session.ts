import { Abstract, EMPTY_OBJ, Injectable, isDefined } from '@tsdi/ioc';
import { IncomingHeaders, InvalidHeaderTokenExecption } from '@tsdi/core';
import { Duplex } from 'stream';
import { ClientStream } from './stream';
import { Session, SessionOpts } from '../session';
import { GoawayExecption, InvalidSessionExecption } from '../../execptions';



/**
 * Client Session options.
 */
export interface ClientSessionOpts extends SessionOpts {
    authority?: string;
    clientId?: string;
}



/**
 * Client Connection.
 */
export class ClientSession extends Session {

    private sid = 1;
    readonly authority: string;
    readonly clientId: string;
    constructor(readonly socket: Duplex, opts: ClientSessionOpts = EMPTY_OBJ) {
        super(socket, opts)
        this.authority = opts.authority ?? '';
        this.clientId = opts.clientId ?? '';
    }

    getNextStreamId(id?: number) {
        if (id) {
            this.sid = id + 1;
            return this.sid;
        }
        return this.sid += 2;
    }


    request(headers: IncomingHeaders, options?: ClientRequsetOpts): ClientStream {
        if (this.destroyed) {
            throw new InvalidSessionExecption('connection destroyed!')
        }
        if (this.closed) {
            throw new GoawayExecption('connection closed!')
        }
        this._updateTimer();

        // if (isDefined(headers)) {
        //     const keys = Object.keys(headers);
        //     for (let i = 0; i < keys.length; i++) {
        //         const header = keys[i];
        //         if (header && !this.packetor.valid(header)) {
        //             this.destroy(new InvalidHeaderTokenExecption('Header name' + header));
        //         }
        //     }
        // }

        return this.strategy.request(this, headers, options ?? {});

    }

}
