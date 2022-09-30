import { ClientContext, IncomingHeaders, Incoming, IncomingStatusHeaders, InterceptorType, ListenOpts, TransportRequest, TransportStatus } from '@tsdi/core';
import { Readable, DuplexOptions, Writable } from 'stream';
import { ev, hdr } from '../../consts';
import { HeandersSentExecption, InvalidStreamExecption } from '../../execptions';
import { SteamOptions, StreamStateFlags, StreamTransformor, TransportStream } from '../stream';
import { Connection } from '../../connection';
import { ClientTransportStrategy, TransportClientOpts } from '../../client';
import { Observable } from 'rxjs';


export class ClientStreamStrategy extends ClientTransportStrategy {
    use(interceptor: InterceptorType<Writable, Readable>, order?: number | undefined): this {
        throw new Error('Method not implemented.');
    }
    createConnection(opts: TransportClientOpts): Connection {
        throw new Error('Method not implemented.');
    }
    send(req: TransportRequest<any>, context: ClientContext): Observable<any> {
        const conn = context.get(Connection);
        conn.write(req);
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get status(): TransportStatus {
        throw new Error('Method not implemented.');
    }
    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    isUpdate(incoming: Incoming): boolean {
        throw new Error('Method not implemented.');
    }
    isSecure(incoming: Incoming): boolean {
        throw new Error('Method not implemented.');
    }
    parseURL(incoming: Incoming, opts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    match(protocol: string): boolean {
        throw new Error('Method not implemented.');
    }

}


/**
 * ClientStream
 */
export class ClientStream extends TransportStream {

    constructor(connection: Connection, id: number | undefined, transformor: StreamTransformor, private headers: IncomingHeaders, opts: SteamOptions) {
        super(connection, transformor, { ...opts, client: true });
        if (id !== undefined) {
            this.init(id);
        }
    }

    protected proceed(): void {
        this.request(this.headers);
    }

    request(headers: IncomingHeaders, options?: {
        endStream?: boolean;
        waitForTrailers?: boolean;
    }): void {
        if (this.destroyed || this.isClosed) throw new InvalidStreamExecption();
        if (this.headersSent) throw new HeandersSentExecption();
        const opts = { ...options } as SteamOptions;

        this._sentHeaders = headers;
        this.stats |= StreamStateFlags.headersSent;

        this.write({ id: this.id, headers }, () => {
            const len = headers[hdr.CONTENT_LENGTH];
            const hasPlayload = len ? true : false;
            if (opts.endStream == true || !hasPlayload) {
                opts.endStream = true;
                this.end();
            }
        });
    }

    addListener(event: 'aborted', listener: () => void): this;
    addListener(event: 'close', listener: () => void): this;
    addListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    addListener(event: 'drain', listener: () => void): this;
    addListener(event: 'end', listener: () => void): this;
    addListener(event: 'readable', listener: () => void): this;
    addListener(event: 'pause', listener: () => void): this;
    addListener(event: 'resume', listener: () => void): this;
    addListener(event: 'error', listener: (err: Error) => void): this;
    addListener(event: 'finish', listener: () => void): this;
    addListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    addListener(event: 'pipe', listener: (src: Readable) => void): this;
    addListener(event: 'unpipe', listener: (src: Readable) => void): this;
    addListener(event: 'streamClosed', listener: (code: number) => void): this;
    addListener(event: 'timeout', listener: () => void): this;
    addListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    addListener(event: 'wantTrailers', listener: () => void): this;
    addListener(event: 'continue', listener: () => {}): this;
    addListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    addListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    addListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    addListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._addListener(event, listener);
    }


    emit(event: 'aborted'): boolean;
    emit(event: 'close'): boolean;
    emit(event: 'data', chunk: Buffer | string): boolean;
    emit(event: 'drain'): boolean;
    emit(event: 'end'): boolean;
    emit(event: 'readable'): boolean;
    emit(event: 'continue'): boolean;
    emit(event: 'pause'): boolean;
    emit(event: 'resume'): boolean;
    emit(event: 'error', err: Error): boolean;
    emit(event: 'finish'): boolean;
    emit(event: 'frameError', frameType: number, errorCode: number): boolean;
    emit(event: 'pipe', src: Readable): boolean;
    emit(event: 'unpipe', src: Readable): boolean;
    emit(event: 'streamClosed', code: number): boolean;
    emit(event: 'timeout'): boolean;
    emit(event: 'trailers', trailers: IncomingHeaders, flags: number): boolean;
    emit(event: 'wantTrailers'): boolean;
    emit(event: 'headers', headers: IncomingHeaders & IncomingStatusHeaders, flags: number): boolean;
    emit(event: 'push', headers: IncomingHeaders, flags: number): boolean;
    emit(event: 'response', headers: IncomingHeaders & IncomingStatusHeaders, flags: number): boolean;
    emit(event: string | symbol, ...args: any[]): boolean;
    emit(event: string | symbol, ...args: any[]): boolean {
        return this._emit(event, ...args);
    }


    on(event: 'aborted', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'drain', listener: () => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'readable', listener: () => void): this;
    on(event: 'pause', listener: () => void): this;
    on(event: 'resume', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'finish', listener: () => void): this;
    on(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    on(event: 'pipe', listener: (src: Readable) => void): this;
    on(event: 'unpipe', listener: (src: Readable) => void): this;
    on(event: 'streamClosed', listener: (code: number) => void): this;
    on(event: 'timeout', listener: () => void): this;
    on(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    on(event: 'wantTrailers', listener: () => void): this;
    on(event: 'continue', listener: () => {}): this;
    on(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    on(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    on(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._on(event, listener);
    }


    once(event: 'aborted', listener: () => void): this;
    once(event: 'close', listener: () => void): this;
    once(event: 'data', listener: (chunk: Buffer | string) => void): this;
    once(event: 'drain', listener: () => void): this;
    once(event: 'end', listener: () => void): this;
    once(event: 'readable', listener: () => void): this;
    once(event: 'pause', listener: () => void): this;
    once(event: 'resume', listener: () => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
    once(event: 'finish', listener: () => void): this;
    once(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    once(event: 'pipe', listener: (src: Readable) => void): this;
    once(event: 'unpipe', listener: (src: Readable) => void): this;
    once(event: 'streamClosed', listener: (code: number) => void): this;
    once(event: 'timeout', listener: () => void): this;
    once(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    once(event: 'wantTrailers', listener: () => void): this;
    once(event: 'continue', listener: () => {}): this;
    once(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    once(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    once(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._once(event, listener);
    }

    prependListener(event: 'aborted', listener: () => void): this;
    prependListener(event: 'close', listener: () => void): this;
    prependListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    prependListener(event: 'drain', listener: () => void): this;
    prependListener(event: 'end', listener: () => void): this;
    prependListener(event: 'readable', listener: () => void): this;
    prependListener(event: 'pause', listener: () => void): this;
    prependListener(event: 'resume', listener: () => void): this;
    prependListener(event: 'error', listener: (err: Error) => void): this;
    prependListener(event: 'finish', listener: () => void): this;
    prependListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    prependListener(event: 'pipe', listener: (src: Readable) => void): this;
    prependListener(event: 'unpipe', listener: (src: Readable) => void): this;
    prependListener(event: 'streamClosed', listener: (code: number) => void): this;
    prependListener(event: 'timeout', listener: () => void): this;
    prependListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    prependListener(event: 'wantTrailers', listener: () => void): this;
    prependListener(event: 'continue', listener: () => {}): this;
    prependListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    prependListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    prependListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependListener(event, listener);
    }

    prependOnceListener(event: 'aborted', listener: () => void): this;
    prependOnceListener(event: 'close', listener: () => void): this;
    prependOnceListener(event: 'data', listener: (chunk: Buffer | string) => void): this;
    prependOnceListener(event: 'drain', listener: () => void): this;
    prependOnceListener(event: 'end', listener: () => void): this;
    prependOnceListener(event: 'readable', listener: () => void): this;
    prependOnceListener(event: 'pause', listener: () => void): this;
    prependOnceListener(event: 'resume', listener: () => void): this;
    prependOnceListener(event: 'error', listener: (err: Error) => void): this;
    prependOnceListener(event: 'finish', listener: () => void): this;
    prependOnceListener(event: 'frameError', listener: (frameType: number, errorCode: number) => void): this;
    prependOnceListener(event: 'pipe', listener: (src: Readable) => void): this;
    prependOnceListener(event: 'unpipe', listener: (src: Readable) => void): this;
    prependOnceListener(event: 'streamClosed', listener: (code: number) => void): this;
    prependOnceListener(event: 'timeout', listener: () => void): this;
    prependOnceListener(event: 'trailers', listener: (trailers: IncomingHeaders, flags: number) => void): this;
    prependOnceListener(event: 'wantTrailers', listener: () => void): this;
    prependOnceListener(event: 'continue', listener: () => {}): this;
    prependOnceListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    prependOnceListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    prependOnceListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
        return this._prependOnceListener(event, listener);
    }

}
