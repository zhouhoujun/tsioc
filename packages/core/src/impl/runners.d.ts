import { AbstractType, ClassRef, ProvdierOf, Invocation, HandlerLike, InterceptorLike } from '@tsdi/ioc';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { CanHandle } from '../guard';
import { Handler, RunContext } from '../handler';
import { Interceptor } from '../interceptor';
import { Filter } from '../filters/filter';
import { InvocationHandlerOptions } from '../invocation';
import { ApplicationContext } from '../ApplicationContext';
import { HandlerOptions } from '../handlers/configable';
/**
 *  Application runner interceptors multi token
 */
export declare const APP_RUNNERS_INTERCEPTORS: import("@tsdi/ioc").InjectToken<Interceptor<any, any, any>[]>;
/**
 *  Application runner filters multi token
 */
export declare const APP_RUNNERS_FILTERS: import("@tsdi/ioc").InjectToken<Filter<any, any, any>[]>;
/**
 *  Application runner guards multi token
 */
export declare const APP_RUNNERS_GUARDS: import("@tsdi/ioc").InjectToken<CanHandle<any, any>[]>;
/**
 *  Application runner hanlders multi token.
 */
export declare const APP_RUNNERS_BACKEND: import("@tsdi/ioc").InjectToken<HandlerLike[]>;
export declare class DefaultApplicationRunners extends ApplicationRunners implements Handler {
    private context;
    protected readonly multicaster: ApplicationEventMulticaster;
    private _types;
    private _maps;
    private _refs;
    private _handler;
    constructor(context: ApplicationContext, multicaster: ApplicationEventMulticaster);
    get size(): number;
    get handler(): Handler;
    use(options: ProvdierOf<InterceptorLike> | ProvdierOf<InterceptorLike>[] | HandlerOptions<any>, order?: number): this;
    attach<T>(type: AbstractType<T> | ClassRef<T> | Invocation<T>, options?: InvocationHandlerOptions<T>): Invocation<T>;
    protected attachRef(tagRef: Invocation, order?: number): void;
    detach<T>(type: AbstractType<T>): void;
    has<T>(type: AbstractType<T>): boolean;
    getRef<T>(type: AbstractType<T>, idx?: number): Invocation<T>;
    getRefs<T>(type: AbstractType<T>): Invocation<T>[];
    run(type?: AbstractType | AbstractType[]): Promise<void>;
    stop(signls?: string): Promise<void>;
    private _destroyed;
    onDestroy(): void;
    handle(input: AbstractType, context: RunContext): any;
    protected startup(): Promise<false | void>;
    protected beforeRun(): Promise<false | void>;
    protected afterRun(): Promise<false | void>;
    protected onShuwdown(signls?: string): Promise<false | void>;
    protected onDispose(): Promise<false | void>;
}
