import { EMPTY_OBJ, isDefined } from '@tsdi/ioc';
import { IncomingHeaders, InvalidHeaderTokenExecption } from '@tsdi/core';
import { Duplex } from 'stream';
import { PacketProtocol } from '../packet';
import { Connection, ConnectionOpts } from '../connection';
import { GoawayExecption, InvalidSessionExecption } from '../execptions';
import { ClientStream } from './stream';
import { ClientBuilder } from './builder';


/**
 * Client Request options.
 */
export interface ClientRequsetOpts {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}


/**
 * Client Session options.
 */
export interface ClientSessionOpts extends ConnectionOpts {
    authority?: string;
    clientId?: string;
}

/**
 * Client Session.
 */
export class ClientSession extends Connection {

    readonly authority: string;
    readonly clientId: string;
    constructor(duplex: Duplex, packet: PacketProtocol, opts: ClientSessionOpts = EMPTY_OBJ, private builder: ClientBuilder) {
        super(duplex, packet, opts)
        this.authority = opts.authority ?? '';
        this.clientId = opts.clientId ?? '';
    }

    request(headers: IncomingHeaders, options?: ClientRequsetOpts): ClientStream {
        if (this.destroyed) {
            throw new InvalidSessionExecption('connection destroyed!')
        }
        if (this.isClosed) {
            throw new GoawayExecption('connection closed!')
        }
        this._updateTimer();

        if (isDefined(headers)) {
            const keys = Object.keys(headers);
            for (let i = 0; i < keys.length; i++) {
                const header = keys[i];
                if (header && !this.packet.valid(header)) {
                    this.destroy(new InvalidHeaderTokenExecption('Header name' + header));
                }
            }
        }

        return this.builder.request(this, headers, options);

    }
}

