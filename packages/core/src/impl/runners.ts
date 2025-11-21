import {
    isNumber, AbstractType, Injectable, tokenId, ClassRef, isFunction, getClassify, ProvdierOf, Invocation,
    ArgumentException, StaticProvider, HandlerLike, composeHandlers, Type, Operator,
    HandleResult, promiseOf,
    isArray,
    InterceptorLike,
    toMutilProvdierOf
} from '@tsdi/ioc';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartedEvent, ApplicationStartEvent, ApplicationStartupEvent } from '../events';
import { PipeTransform } from '../pipes/pipe';
import { CanHandle } from '../guard';
import { Handler, createRunableContext, RunableContext } from '../handler';
import { Interceptor } from '../interceptor';
import { Filter } from '../filters/filter';
import { ExceptionHandlerFilter } from '../filters/execption.filter';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { NotHandleException } from '../execptions';
import { InvocationHandlerOptions } from '../invocation';
import { createInvocationHandler } from './invocation';
import { ApplicationContext } from '../ApplicationContext';
import { HandlerOptions, isHandlerOptions } from '../handlers/configable';


/**
 *  Application runner interceptors multi token
 */
export const APP_RUNNERS_INTERCEPTORS = tokenId<Interceptor[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Application runner filters multi token
 */
export const APP_RUNNERS_FILTERS = tokenId<Filter[]>('APP_RUNNERS_FILTERS');

/**
 *  Application runner guards multi token
 */
export const APP_RUNNERS_GUARDS = tokenId<CanHandle[]>('APP_RUNNERS_GUARDS');


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
        this._handler = createHandler(context, this, APP_RUNNERS_INTERCEPTORS, APP_RUNNERS_GUARDS, APP_RUNNERS_FILTERS, {
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

    attach<T, TArg>(type: AbstractType<T> | ClassRef<T>, options: InvocationHandlerOptions<T> = {}): Invocation<T> {
        const target = getClassify(type);

        let ends = this._maps.get(target.type);
        if (!ends) {
            ends = [];
            this._maps.set(target.type, ends);
        }
        let injector = this.context.getRuntime().getRegisterIn(target.type);
        if (!injector) {
            injector = this.context;
            Operator.register(injector, target.type as Type);
        }
        const invocation = target.createInvocation(injector, options);
        this.attachRef(invocation, options.order);
        invocation.onDestroy(() => this.detach(target.type));
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
            await promiseOf(this._handler.handle(type, createRunableContext(this.getRef(type as AbstractType)?.context ?? this.context, true)));
        } else {
            await this.startup();
            await this.beforeRun();
            if (this._types?.length) {
                await Promise.all(this._types.map((ty) => promiseOf(this._handler.handle(ty, createRunableContext(this.getRef(ty)?.context ?? this.context, true)))));
            }
            await this.afterRun()
        }
    }

    async stop(signls?: string): Promise<void> {
        try {
            await this.onShuwdown(signls);
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

    handle(input: AbstractType, context: RunableContext): HandleResult<any> {
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

    protected onShuwdown(signls?: string) {
        return this.multicaster.emit(new ApplicationShutdownEvent(this, signls));
    }

    protected onDispose() {
        return this.multicaster.emit(new ApplicationDisposeEvent(this));
    }

}
