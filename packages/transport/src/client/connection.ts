import { Abstract, EMPTY_OBJ, Injectable, isDefined, isString } from '@tsdi/ioc';
import { IncomingHeaders, InvalidHeaderTokenExecption } from '@tsdi/core';
import { Duplex } from 'stream';
import { TransportProtocol } from '../protocol';
import { Connection, ConnectionOpts } from '../connection';
import { GoawayExecption, InvalidSessionExecption } from '../execptions';
import { ClientStream } from './stream';
import { SteamOptions } from '../stream';


/**
 * Client Request options.
 */
export interface ClientRequsetOpts extends SteamOptions {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}



@Abstract()
export abstract class RequestStrategy {
    abstract request(connection: ClientConnection, headers: IncomingHeaders, options: ClientRequsetOpts): ClientStream;
}

/**
 * Client Session options.
 */
export interface ClientConnectionOpts extends ConnectionOpts {
    authority?: string;
    clientId?: string;
}



/**
 * Client Connection.
 */
export class ClientConnection extends Connection {

    private sid = 1;
    readonly authority: string;
    readonly clientId: string;
    constructor(duplex: Duplex, transport: TransportProtocol, opts: ClientConnectionOpts = EMPTY_OBJ, private strategy: RequestStrategy) {
        super(duplex, transport, opts)
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
        if (this.isClosed) {
            throw new GoawayExecption('connection closed!')
        }
        this._updateTimer();

        if (isDefined(headers)) {
            const keys = Object.keys(headers);
            for (let i = 0; i < keys.length; i++) {
                const header = keys[i];
                if (header && !this.transport.valid(header)) {
                    this.destroy(new InvalidHeaderTokenExecption('Header name' + header));
                }
            }
        }

        return this.strategy.request(this, headers, options ?? {});

    }
}

@Injectable()
export class DefaultRequestStrategy extends RequestStrategy {
    request(connection: ClientConnection, headers: IncomingHeaders, options: ClientRequsetOpts): ClientStream {
        const id = connection.getNextStreamId();
        const stream = new ClientStream(connection, id, headers, options);
        return stream;
    }

}