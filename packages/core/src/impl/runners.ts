import {
    isNumber, AbstractType, Injectable, token, ClassRef, isFunction, getClassify, ProvdierOf,
    Invocation, ArgumentException, HandlerLike, composeHandlers, Type, InjectUtil,
    toPromise, isArray, InterceptorLike, toMutilProvdierOf
} from '@tsdi/ioc';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartedEvent, ApplicationStartEvent, ApplicationStartupEvent } from '../events';
import { CanHandle } from '../guard';
import { Handler, createRunContext, RunContext } from '../handler';
import { Interceptor } from '../interceptor';
import { Filter } from '../filters/filter';
import { ExceptionHandlerFilter } from '../filters/exception.filter';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { NotHandleException } from '../exceptions';
import { InvocationHandlerOptions } from '../invocation';
import { createInvocationHandler } from './invocation';
import { ApplicationContext } from '../ApplicationContext';
import { HandlerOptions, isHandlerOptions } from '../handlers/configable';


/**
 *  Application runner interceptors multi token
 */
export const APP_RUNNERS_INTERCEPTORS = token<Interceptor[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Application runner filters multi token
 */
export const APP_RUNNERS_FILTERS = token<Filter[]>('APP_RUNNERS_FILTERS');

/**
 *  Application runner guards multi token
 */
export const APP_RUNNERS_GUARDS = token<CanHandle[]>('APP_RUNNERS_GUARDS');

/**
 *  Application runner hanlders multi token.
 */
export const APP_RUNNERS_BACKEND = token<HandlerLike[]>('APP_RUNNERS_BACKEND');


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners implements Handler {
    private _types: AbstractType[];
    private _maps: Map<AbstractType, HandlerLike[]>;
    private _refs: Map<AbstractType, Invocation[]>;
    private _handler: ConfigableHandler;
    constructor(
        private context: ApplicationContext,
        protected readonly multicaster: ApplicationEventMulticaster
    ) {
        super()
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._handler = createHandler(context, this, APP_RUNNERS_BACKEND, APP_RUNNERS_INTERCEPTORS, APP_RUNNERS_GUARDS, APP_RUNNERS_FILTERS, {
            enableTypeChain: true,
            filters: [ExceptionHandlerFilter]
        });
    }

    get size(): number {
        return this._refs.size;
    }

    get handler(): Handler {
        return this._handler
    }

    use(options: ProvdierOf<InterceptorLike> | ProvdierOf<InterceptorLike>[] | HandlerOptions<any>, order?: number): this {
        this._handler.append(
            isArray(options) ? { interceptors: options }
                : ((isHandlerOptions(options) ? options : { interceptors: [toMutilProvdierOf(options as ProvdierOf<InterceptorLike>, order)] }))
        )
        return this;
    }

    attach<T>(type: AbstractType<T> | ClassRef<T> | Invocation<T>, options: InvocationHandlerOptions<T> = {}): Invocation<T> {
        let invocation: Invocation<T>;
        if (type instanceof Invocation) {
            invocation = type;
        } else {
            const target = getClassify(type);

            let injector = this.context.getRuntime().getRegisterIn(target.type);
            if (!injector) {
                injector = this.context;
                InjectUtil.register(injector, target.type as Type);
            }
            invocation = target.createInvocation(injector, options);
        }

        let ends = this._maps.get(invocation.type);
        if (!ends) {
            ends = [];
            this._maps.set(invocation.type, ends);
        }
        this.attachRef(invocation, options.order);
        invocation.onDestroy(() => this.detach(invocation.type));
        const handler = createInvocationHandler(invocation, options);
        ends.push(handler);
        return invocation;
    }


    protected attachRef(tagRef: Invocation, order?: number) {
        const refs = this._refs.get(tagRef.type);
        if (refs) {
            refs.push(tagRef);
        } else {
            this._refs.set(tagRef.type, [tagRef]);
            if (isNumber(order)) {
                this._types.splice(order, 0, tagRef.type)
            } else {
                this._types.push(tagRef.type);
            }
        }

    }

    detach<T>(type: AbstractType<T>): void {
        if (this._destroyed) return;
        this._maps.delete(type);
        this.getRefs(type).forEach(ref => ref.destroy());
        this._refs.delete(type);
        const idx = this._types.indexOf(type);
        if (idx >= 0) {
            this._types.splice(idx, 1);
        }
    }

    has<T>(type: AbstractType<T>): boolean {
        return this._maps.has(type);
    }

    getRef<T>(type: AbstractType<T>, idx = 0): Invocation<T> {
        return this._refs.get(type)?.[idx] ?? null!;
    }

    getRefs<T>(type: AbstractType<T>): Invocation<T>[] {
        return this._refs.get(type) ?? [];
    }

    async run(type?: AbstractType | AbstractType[]): Promise<void> {
        if (type) {
            await toPromise(this._handler.handle(type, createRunContext(this.getRef(type as AbstractType)?.injector ?? this.context)));
        } else {
            await this.startup();
            await this.beforeRun();
            if (this._types?.length) {
                await Promise.all(this._types
                    .filter(ty => this.getRef(ty)?.bootstrap !== false)
                    .map((ty) => toPromise(this._handler.handle(ty, createRunContext(this.getRef(ty)?.injector ?? this.context)))));
            }
            await this.afterRun()
        }
    }

    async stop(signls?: string): Promise<void> {
        try {
            await this.onShutdown(signls);
            await this.onDispose();
        } finally {
            this.onDestroy()
        }
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this._refs.forEach(refs => refs.forEach(ref => ref.destroy()));
        this._refs.clear();
        this._maps.clear();
        this.multicaster.clear();
        this._handler.onDestroy();
        this._types = null!;
    }

    handle(input: AbstractType, context: RunContext): any {
        let handlers: HandlerLike[] | undefined;
        if (isFunction(input)) {
            handlers = this._maps.get(input)
        } else {
            throw new ArgumentException('input type unknow')
        }
        if (handlers && handlers.length) {
            return composeHandlers(handlers)(input, context);
        }
        throw new NotHandleException(context, input);
    }

    protected startup() {
        return this.multicaster.emit(new ApplicationStartupEvent(this));
    }

    protected beforeRun() {
        return this.multicaster.emit(new ApplicationStartEvent(this));
    }

    protected afterRun() {
        return this.multicaster.emit(new ApplicationStartedEvent(this));
    }

    protected onShutdown(signls?: string) {
        return this.multicaster.emit(new ApplicationShutdownEvent(this, signls));
    }

    protected onDispose() {
        return this.multicaster.emit(new ApplicationDisposeEvent(this));
    }

}
