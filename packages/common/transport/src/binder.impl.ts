import { Abstract, Injectable, Injector } from '@tsdi/ioc';
import { Observable, Subject, defer, from } from 'rxjs';
import { Transport, Pattern, Incoming } from '@tsdi/common';
import { Binder, BinderConfig, Binding, BindingState, ConsumerOptions, ProducerOptions, Serializer, Deserializer, JsonSerializer, JsonDeserializer } from './binder';
import { Logger } from '@tsdi/logger';

/**
 * Abstract Binder implementation.
 * 
 * Binder 抽象基类 - 各协议实现继承此类
 */
@Abstract()
@Injectable()
export abstract class AbstractBinder<
    TConsumerOptions extends ConsumerOptions = ConsumerOptions,
    TProducerOptions extends ProducerOptions = ProducerOptions
> implements Binder<TConsumerOptions, TProducerOptions> {

    protected serializer: Serializer;
    protected deserializer: Deserializer;
    protected logger?: Logger;

    constructor(protected injector: Injector) {
        this.serializer = injector.get(Serializer, new JsonSerializer());
        this.deserializer = injector.get(Deserializer, new JsonDeserializer());
        this.logger = injector.get(Logger, undefined);
    }

    config?: BinderConfig;

    abstract get name(): string;
    abstract get transport(): Transport;

    abstract bindConsumer(
        name: string,
        group: string,
        options?: TConsumerOptions
    ): Binding<Observable<Incoming>>;

    abstract bindProducer(
        name: string,
        options?: TProducerOptions
    ): Binding<(data: any) => Promise<void>>;

    abstract send<TInput, TResult>(
        pattern: Pattern,
        data: TInput
    ): Observable<TResult>;

    abstract emit<TInput>(
        pattern: Pattern,
        data: TInput
    ): Promise<void>;

    /**
     * serialize outgoing data.
     */
    protected serialize<T>(data: T): Buffer | string {
        const contentType = this.config?.contentType ?? 'application/json';
        const result = this.serializer.serialize(data, contentType);
        if (typeof result === 'string' || Buffer.isBuffer(result)) {
            return result;
        }
        throw new Error('Streaming serialization not supported in base implementation');
    }

    /**
     * deserialize incoming data.
     */
    protected deserialize<T>(data: Buffer | string): T {
        const contentType = this.config?.contentType ?? 'application/json';
        return this.deserializer.deserialize<T>(data, contentType);
    }

    /**
     * log helper.
     */
    protected log(message: string, ...args: any[]): void {
        if (this.logger) {
            this.logger.info(message, ...args);
        }
    }

    protected logError(message: string, error: any): void {
        if (this.logger) {
            this.logger.error(message, error);
        }
    }
}

/**
 * Simple binding implementation.
 */
@Injectable()
export class SimpleBinding<TTarget = any> implements Binding<TTarget> {

    private _state: BindingState = BindingState.ACTIVE;

    constructor(
        public name: string,
        public target: TTarget,
        public group?: string,
        private onDestroy?: () => Promise<void>
    ) {}

    get state(): BindingState {
        return this._state;
    }

    pause(): void {
        if (this._state === BindingState.ACTIVE) {
            this._state = BindingState.PAUSED;
        }
    }

    resume(): void {
        if (this._state === BindingState.PAUSED) {
            this._state = BindingState.ACTIVE;
        }
    }

    async unbind(): Promise<void> {
        this._state = BindingState.STOPPED;
        if (this.onDestroy) {
            await this.onDestroy();
        }
    }
}

/**
 * Observable binding implementation for consumers.
 */
@Injectable()
export class ObservableBinding extends SimpleBinding<Observable<Incoming>> {

    private subject = new Subject<Incoming>();

    constructor(
        name: string,
        group?: string,
        onDestroy?: () => Promise<void>
    ) {
        super(name, undefined as any, group, onDestroy);
        this.target = this.subject.asObservable();
    }

    /**
     * emit incoming message to binding.
     */
    emit(incoming: Incoming): void {
        if (this.state === BindingState.ACTIVE) {
            this.subject.next(incoming);
        }
    }

    override async unbind(): Promise<void> {
        await super.unbind();
        this.subject.complete();
    }
}

/**
 * Producer binding implementation.
 */
@Injectable()
export class ProducerBinding extends SimpleBinding<(data: any) => Promise<void>> {

    private sendFn: (data: any) => Promise<void>;

    constructor(
        name: string,
        sendFn: (data: any) => Promise<void>,
        onDestroy?: () => Promise<void>
    ) {
        super(name, sendFn, undefined, onDestroy);
        this.sendFn = sendFn;
    }

    /**
     * send data through this binding.
     */
    send(data: any): Promise<void> {
        if (this.state !== BindingState.ACTIVE) {
            return Promise.reject(new Error('Binding is not active'));
        }
        return this.sendFn(data);
    }
}