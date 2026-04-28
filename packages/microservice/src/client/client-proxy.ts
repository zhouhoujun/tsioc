import { Abstract, Injectable, Token } from '@tsdi/ioc';
import { Serializer, Deserializer } from '@tsdi/common/transport';
import { Pattern, TransportConfig } from '@tsdi/common';
import { Observable, defer, mergeMap, throwError, Subject, connectable } from 'rxjs';
import { CircuitBreaker } from '../resilience/circuit-breaker';

export interface MicroserviceClientOptions extends TransportConfig {
    url?: string;
    timeout?: number;
    serializer?: Token<Serializer>;
    deserializer?: Token<Deserializer>;
    circuitBreaker?: CircuitBreaker;
}

@Abstract()
export abstract class MicroserviceClientProxy {
    protected options: MicroserviceClientOptions;
    protected circuitBreaker?: CircuitBreaker;
    
    constructor(options: MicroserviceClientOptions) {
        this.options = options;
        this.circuitBreaker = options.circuitBreaker;
    }
    
    abstract connect(): Promise<void>;
    abstract close(): Promise<void>;
    
    send<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        return defer(async () => this.connect()).pipe(
            mergeMap(() => {
                if (this.circuitBreaker) {
                    return this.circuitBreaker.execute(() => this.doSend<TInput, TResult>(pattern, data));
                }
                return this.doSend<TInput, TResult>(pattern, data);
            })
        );
    }
    
    protected abstract doSend<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult>;
    
    emit<TInput>(pattern: Pattern, data: TInput): Promise<void> {
        const source = defer(async () => this.connect()).pipe(
            mergeMap(() => this.doEmit<TInput>(pattern, data))
        );
        const connectableSource = connectable(source, { connector: () => new Subject<void>() });
        connectableSource.connect();
        return Promise.resolve();
    }
    
    protected abstract doEmit<TInput>(pattern: Pattern, data: TInput): Observable<void>;
}

@Injectable()
export class DefaultMicroserviceClientProxy extends MicroserviceClientProxy {
    private connected = false;
    
    constructor(options: MicroserviceClientOptions) {
        super(options);
    }
    
    async connect(): Promise<void> {
        if (this.connected) return;
        this.connected = true;
    }
    
    async close(): Promise<void> {
        this.connected = false;
    }
    
    protected doSend<TInput, TResult>(pattern: Pattern, data: TInput): Observable<TResult> {
        return throwError(() => new Error('Transport not configured'));
    }
    
    protected doEmit<TInput>(pattern: Pattern, data: TInput): Observable<void> {
        return throwError(() => new Error('Transport not configured'));
    }
}

@Injectable()
export abstract class MicroserviceClientFactory {
    abstract create(options: MicroserviceClientOptions): MicroserviceClientProxy;
}
