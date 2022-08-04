import { Abstract } from '@tsdi/ioc';
import { IncomingHeaders, IncomingStatusHeaders, OutgoingHeaders } from '@tsdi/core';
import { Observable } from 'rxjs';
import { TransportSession, TransportStream } from '../stream';



@Abstract()
export abstract class ClientStream extends TransportStream {
    abstract addListener(event: 'continue', listener: () => {}): this;
    abstract addListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract addListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    abstract addListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract emit(event: 'continue'): boolean;
    abstract emit(event: 'headers', headers: IncomingHeaders & IncomingStatusHeaders, flags: number): boolean;
    abstract emit(event: 'push', headers: IncomingHeaders, flags: number): boolean;
    abstract emit(event: 'response', headers: IncomingHeaders & IncomingStatusHeaders, flags: number): boolean;
    abstract emit(event: string | symbol, ...args: any[]): boolean;
    abstract on(event: 'continue', listener: () => {}): this;
    abstract on(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract on(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    abstract on(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract on(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract once(event: 'continue', listener: () => {}): this;
    abstract once(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract once(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    abstract once(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract once(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependListener(event: 'continue', listener: () => {}): this;
    abstract prependListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract prependListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    abstract prependListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    abstract prependOnceListener(event: 'continue', listener: () => {}): this;
    abstract prependOnceListener(event: 'headers', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract prependOnceListener(event: 'push', listener: (headers: IncomingHeaders, flags: number) => void): this;
    abstract prependOnceListener(event: 'response', listener: (headers: IncomingHeaders & IncomingStatusHeaders, flags: number) => void): this;
    abstract prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

}

export interface ClientRequsetOpts {
    endStream?: boolean | undefined;
    exclusive?: boolean | undefined;
    parent?: number | undefined;
    weight?: number | undefined;
    waitForTrailers?: boolean | undefined;
    signal?: AbortSignal | undefined;
}


@Abstract()
export abstract class ClientSession extends TransportSession {
    abstract get authority(): string;
    abstract request(headers: OutgoingHeaders, options?: ClientRequsetOpts): ClientStream;
}


@Abstract()
export abstract class ClientSessionStreamBuilder {
    abstract build(connectOpts?: Record<string, any>): Observable<ClientSession>;
}
