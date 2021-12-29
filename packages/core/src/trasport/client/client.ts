import { Abstract, Inject, isNil, Providers } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError } from '../error';
import { TrasportResponse, TrasportEvent, TrasportRequest, ReadPacket, WritePacket } from '../packet';
import { Deserializer, EmptyDeserializer } from '../deserializer';
import { Serializer, EmptySerializer } from '../serializer';
import { Pattern, stringify } from '../pattern';


/**
 * abstract clinent.
 */
@Abstract()
@Providers([
    { provide: Serializer, useClass: EmptySerializer },
    { provide: Deserializer, useClass: EmptyDeserializer }
])
export abstract class AbstractClient implements Client, OnDispose {

    @Logger() protected readonly logger!: ILogger;

    @Inject() protected serializer!: Serializer<TrasportEvent | TrasportRequest>;
    @Inject() protected deserializer!: Deserializer<TrasportResponse>;

    protected routing = new Map<string, Function>();

    constructor() {

    }

    abstract connect(): Promise<any>;

    abstract onDispose(): Promise<void>;

    send<TResult = any, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (isNil(pattern) || isNil(data)) {
            return throwError(() => new InvalidMessageError());
        }

        return defer(async () => this.connect()).pipe(
            mergeMap(
                () => new Observable<TResult>((observer) => {
                    const callback = this.createObserver(observer);
                    return this.publish({ pattern, data }, callback);
                })
            )
        );

    }

    emit<TResult = any, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (isNil(pattern) || isNil(data)) {
            return throwError(() => new InvalidMessageError());
        }
        const source = defer(async () => this.connect()).pipe(
            mergeMap(() => this.dispatchEvent({ pattern, data })),
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
     * @param packet 
     * @param callback 
     */
    protected abstract publish(
        packet: ReadPacket,
        callback: (packet: WritePacket) => void,
    ): () => void;

    /**
     * dispatch event.
     * @param packet 
     */
    protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;


    protected createObserver<T>(
        observer: Observer<T>,
    ): (packet: WritePacket) => void {
        return ({ err, response, disposed }: WritePacket) => {
            if (err) {
                return observer.error(this.serializeError(err));
            } else if (response !== undefined && disposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (disposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };
    }

    protected normalizePattern(pattern: Pattern): string {
        return stringify(pattern);
    }

    protected serializeError(err: any): any {
        return err;
    }

    protected serializeResponse(response: any): any {
        return response;
    }
}
