import { Abstract, isNil } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { defer, Observable, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { OnDispose } from '../lifecycle';
import { InvalidMessageError } from './error';
import { Endpoint } from './endpoint';
import { TransportContext } from './context';

/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<T extends TransportContext> implements OnDispose {

    @Log()
    protected readonly logger!: Logger;
    /**
     * transport handler.
     */
    abstract get endpoint(): Endpoint<T>;
    /**
     * connect.
     */
    abstract connect(): Promise<any>;
    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send<TResponse>(req: T): Observable<TResponse> {
        if (isNil(req)) {
            return throwError(() => new InvalidMessageError());
        }
        return defer(() => this.connect()).pipe(
            concatMap((ctx) => this.endpoint.handle(ctx))
        );
    }


    /**
     * close client.
     */
    abstract close(): Promise<void>;

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}
