import { EMPTY_OBJ, isDefined } from '@tsdi/ioc';
import { IncomingHeaders, InvalidHeaderTokenExecption, TransportAboutExecption } from '@tsdi/core';
import { Duplex } from 'stream';
import { Connection, ConnectionOpts } from '../connection';
import { PacketProtocol } from '../packet';
import { ClientStream } from './stream';
import { ev, streamId } from '../consts';
import { GoawayExecption, InvalidSessionExecption } from '../execptions';
import { TransportStreamFlags } from '../stream';


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
        const stream = new ClientStream(this, undefined, {});
        if (options?.endStream) {
            stream.end();
        }
        if (options?.signal) {
            const signal = options.signal;
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

        let strmOpt = TransportStreamFlags.none;
        if (options?.endStream) {
            strmOpt |= TransportStreamFlags.emptyPayload;
        }
        if (options?.waitForTrailers) {
            strmOpt |= TransportStreamFlags.trailers;
        }

        this.requestStreamId(headers, strmOpt);

    }

    protected requestStreamId(headers: IncomingHeaders, streamOptions: TransportStreamFlags) {
        this.write({ cmd: streamId, headers, streamOptions });
    }

}

