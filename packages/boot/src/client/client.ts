import { Abstract } from '@tsdi/ioc';
import { Client, Disposable } from '@tsdi/core';
import { ILogger, Logger } from '@tsdi/logs';
import { Observable } from 'rxjs';

@Abstract()
export abstract class AbstractClient extends Client implements Disposable {

    @Logger() protected logger!: ILogger;

    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        throw new Error('Method not implemented.');
    }
    emit<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult> {
        throw new Error('Method not implemented.');
    }

    dispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}