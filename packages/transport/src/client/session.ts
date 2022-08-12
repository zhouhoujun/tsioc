import { Abstract, EMPTY_OBJ } from '@tsdi/ioc';
import { OutgoingHeaders } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Duplex } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { PacketParser } from '../packet';
import { ClientStream } from './stream';


export interface ClientRequsetOpts {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}


export interface ClientSessionOpts extends ConnectionOpts {
    authority?: string;
    clientId?: string;
}

@Abstract()
export abstract class ClientSession extends Connection {

    readonly authority: string;
    readonly clientId: string;
    constructor(duplex: Duplex, parser: PacketParser, opts: ClientSessionOpts = EMPTY_OBJ) {
        super(duplex, parser, opts)
        this.authority = opts.authority ?? '';
        this.clientId = opts.clientId ?? '';
    }

    abstract request(headers: OutgoingHeaders, options?: ClientRequsetOpts): ClientStream;
}


@Abstract()
export abstract class ClientSessionBuilder {
    abstract build(connectOpts?: Record<string, any>): Observable<ClientSession>;
}
