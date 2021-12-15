import { Abstract, isNil } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { connectable, defer, Observable, Observer, Subject, throwError } from 'rxjs';
import { Client } from '../../client';
import { OnDispose } from '../../lifecycle';
import { InvalidMessageError } from '../error';
import { mergeMap } from 'rxjs/operators';
import { ReadPacket, WritePacket } from '../packet';


@Abstract()
export abstract class AbstractClient implements Client, OnDispose {

    @Logger() protected logger!: ILogger;
    
    constructor() {

    }

    abstract connect(): Promise<void>;

    abstract onDispose(): Promise<void>;

    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
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

    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
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

    protected abstract publish(
        packet: ReadPacket,
        callback: (packet: WritePacket) => void,
    ): () => void;

    protected abstract dispatchEvent<T = any>(packet: ReadPacket): Promise<T>;


    protected createObserver<T>(
        observer: Observer<T>,
    ): (packet: WritePacket) => void {
        return ({ err, response, isDisposed }: WritePacket) => {
            if (err) {
                return observer.error(this.serializeError(err));
            } else if (response !== undefined && isDisposed) {
                observer.next(this.serializeResponse(response));
                return observer.complete();
            } else if (isDisposed) {
                return observer.complete();
            }
            observer.next(this.serializeResponse(response));
        };
    }

    protected serializeError(err: any): any {
        return err;
    }

    protected serializeResponse(response: any): any {
        return response;
    }

}
