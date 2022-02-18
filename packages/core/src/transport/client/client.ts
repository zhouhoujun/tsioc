import { Abstract, InvocationOption, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError, TransportError } from '../error';
import { Pattern, Protocol, ReadPacket, WritePacket } from '../packet';
import { stringify, TransportOption } from '../context';
import { TransportHandler } from '../handler';


/**
 * abstract transport client.
 */
@Abstract()
export abstract class TransportClient<TRequest extends ReadPacket = ReadPacket, TResponse extends WritePacket = WritePacket> implements OnDispose {

    @Logger()
    protected readonly logger!: ILogger;

    /**
     * transport protocol type.
     */
    abstract get protocol(): Protocol;
    /**
     * transport handler.
     */
    abstract get handler(): TransportHandler<TRequest, TResponse>;

    /**
     * connect.
     */
    abstract connect(): Promise<any>;
    /**
     * send message.
     * @param pattern message pattern.
     * @param body send data.
     */
    send<TInput>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResponse> {
        if (isNil(pattern) || isNil(body)) {
            return throwError(() => new InvalidMessageError());
        }
        return defer(async () => this.connect()).pipe(
            mergeMap(
                () => new Observable<TResponse>((observer) => {
                    const callback = this.createObserver(observer);
                    return this.publish(this.serializeRequest(pattern, body), callback);
                })
            ));
    }

    /**
     * emit message
     * @param pattern event pattern.
     * @param body event data.
     */
    emit<TInput = any>(pattern: Pattern, body: TInput, options?: InvocationOption): Observable<TResponse> {
        if (isNil(pattern) || isNil(body)) {
            return throwError(() => new InvalidMessageError());
        }
        const source = defer(async () => this.connect()).pipe(
            mergeMap(() => this.dispatchEvent(this.serializeRequest(pattern, body))),
        );
        const connectableSource = connectable(source, {
            connector: () => new Subject(),
            resetOnDisconnect: false,
        });
        connectableSource.connect();
        return connectableSource;
    }

    /**
     * publish handle.
     * @param ctx transport context.
     * @param callback 
     */
    protected abstract publish(
        req: TRequest,
        callback: (packet: TResponse) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(packet: TRequest): Promise<T>;


    /**
     * close client.
     */
    abstract close(): Promise<void>;


    protected createObserver(
        observer: Observer<TResponse>,
    ): (packet: TResponse) => void {
        return (response: TResponse) => {
            if (response.error) {
                return observer.error(this.serializeError(response.error));
            } else if (response.body !== undefined && response.disposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (response.disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };

    }

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected serializeError(err: any): TransportError {
        return err;
    }

    protected serializeRequest<T = any>(pattern: Pattern, body: T): TRequest {
        return { pattern, body } as TRequest;
    }

    protected serializeResponse(response: any): TResponse {
        return response;
    }

    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}
