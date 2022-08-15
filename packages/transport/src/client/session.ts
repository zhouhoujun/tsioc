import { EMPTY_OBJ } from '@tsdi/ioc';
import { InvalidHeaderToken, OutgoingHeaders, TransportAboutError, TransportError } from '@tsdi/core';
import { Duplex } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { PacketParser } from '../packet';
import { ClientStream } from './stream';
import { ev } from '../consts';


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


export class ClientSession extends Connection {

    readonly authority: string;
    readonly clientId: string;
    constructor(duplex: Duplex, packet: PacketParser, opts: ClientSessionOpts = EMPTY_OBJ) {
        super(duplex, packet, opts)
        this.authority = opts.authority ?? '';
        this.clientId = opts.clientId ?? '';
    }

    request(headers: OutgoingHeaders, options?: ClientRequsetOpts): ClientStream {
        if (this.destroyed) {
            throw new TransportError('connection destroyed!')
        }
        if (this.closed) {
            throw new TransportError('connection closed!')
        }
        const keys = Object.keys(headers);
        for (let i = 0; i < keys.length; i++) {
            const header = keys[i];
            if (header && !this.packet.valid(header)) {
                this.destroy(new InvalidHeaderToken('Header name' + header));
            }
        }
        const stream = new ClientStream(this, this.packet.generateId(), options);
        const { signal, endStream, waitForTrailers } = options!;
        if (endStream) {
            stream.end();
        }
        if (signal) {
            const aborter = () => {
                stream.destroy(new TransportAboutError((signal as any).reason));
            }
            if (signal.aborted) {
                aborter();
            } else {
                signal.addEventListener(ev.ABOUT, aborter);
                stream.once(ev.CLOSE, () => {
                    signal.removeEventListener(ev.ABOUT, aborter);
                });
            }
        }
        return stream;

    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

