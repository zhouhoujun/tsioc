import { Abstract } from '@tsdi/ioc';
import { Duplex } from 'stream';
import { Observable } from 'rxjs';


@Abstract()
export abstract class TransportStream extends Duplex {
    abstract readPacket(): Observable<any>;
}



@Abstract()
export abstract class ClientStreamBuilder {
    abstract build(connectOpts?: Record<string, any>): Observable<TransportStream>;
}


/**
 * Listen options.
 */
@Abstract()
export abstract class ListenOpts {

    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;
}


@Abstract()
export abstract class ServerStreamBuilder {
    abstract build(listenOpts: ListenOpts): Observable<TransportStream>;
}
