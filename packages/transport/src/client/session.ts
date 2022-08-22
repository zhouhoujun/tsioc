import { EMPTY_OBJ, isDefined } from '@tsdi/ioc';
import { IncomingHeaders, InvalidHeaderTokenExecption, OutgoingHeaders, TransportAboutExecption, TransportExecption } from '@tsdi/core';
import { Duplex } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { PacketProtocol } from '../packet';
import { ClientStream } from './stream';
import { ev, streamId } from '../consts';
import { GoawayExecption, InvalidSessionExecption } from '../execptions';


export interface ClientRequsetOpts {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}

export enum RequsetStreamFlags {
    none = 0x0,
    emptyPayload = 0x2,
    trailers = 0x4
}


export interface ClientSessionOpts extends ConnectionOpts {
    authority?: string;
    clientId?: string;
}


export class ClientSession extends Connection {

    readonly authority: string;
    readonly clientId: string;
    private pendingRequestCalls?: Function[];
    constructor(duplex: Duplex, packet: PacketProtocol, opts: ClientSessionOpts = EMPTY_OBJ) {
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
        const stream = new ClientStream(this, undefined, undefined, {});
        const { signal, endStream, waitForTrailers } = options!;
        if (endStream) {
            stream.end();
        }
        if (signal) {
            const aborter = () => {
                stream.destroy(new TransportAboutExecption((signal as any).reason));
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

        if (this.connecting) {
            if (this.pendingRequestCalls) {
                this.pendingRequestCalls.push(() => {
                    this.requestOnConnect(headers, options);
                });
            } else {
                this.pendingRequestCalls = [() => this.requestOnConnect(headers, options)];
                this.once(ev.CONNECT, () => {
                    this.pendingRequestCalls?.forEach(c => c());
                })
            }
        } else {
            this.requestOnConnect(headers, options);
        }
        return stream;

    }

    protected requestOnConnect(headers: IncomingHeaders, options?: ClientRequsetOpts): void {
        if (this.destroyed) return;
        if (this.isClosed) {
            const err = new GoawayExecption('connection closed!');
            this.destroy(err);
            return;
        }

        let strmOpt = RequsetStreamFlags.none;
        if (options?.endStream) {
            strmOpt |= RequsetStreamFlags.emptyPayload;
        }
        if (options?.waitForTrailers) {
            strmOpt |= RequsetStreamFlags.trailers;
        }

        this.requestStreamId(headers, strmOpt);

    }

    protected requestStreamId(headers: IncomingHeaders, streamOptions: RequsetStreamFlags) {
        this.write({ cmd: streamId, headers, streamOptions });
    }

}

