import {
    isNumber, AbstractType, Injectable, tokenId, Injector, Class, isFunction, getClassify, ProvdierOf, Invocation,
    isArray, ArgumentException, StaticProvider, HandlerLike, composeHandlers, Type
} from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable, of, throwError } from 'rxjs';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartedEvent, ApplicationStartEvent, ApplicationStartupEvent } from '../events';
import { PipeTransform } from '../pipes/pipe';
import { CanHandle } from '../guard';
import { ApplicationHandler } from '../ApplicationHandler';
import { ApplicationInterceptor } from '../ApplicationInterceptor';
import { Filter } from '../filters/filter';
import { ExceptionHandlerFilter } from '../filters/execption.filter';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { HandleContext } from '../handlers/context';
import { NotHandleException } from '../execptions';
import { toObservable } from '../handlers';
import { InvocationHandlerOptions } from '../invocation';
import { createInvocationHandler } from './invocation';


/**
 *  Application runner interceptors multi token
 */
export const APP_RUNNERS_INTERCEPTORS = tokenId<ApplicationInterceptor<HandleContext>[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Application runner filters multi token
 */
export const APP_RUNNERS_FILTERS = tokenId<Filter[]>('APP_RUNNERS_FILTERS');

/**
 *  Application runner guards multi token
 */
export const APP_RUNNERS_GUARDS = tokenId<CanHandle[]>('APP_RUNNERS_GUARDS');


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners implements ApplicationHandler {
    private _types: AbstractType[];
    private _maps: Map<AbstractType, HandlerLike[]>;
    private _refs: Map<AbstractType, Invocation[]>;
    private _handler: ConfigableHandler;
    constructor(
        private injector: Injector,
        protected readonly multicaster: ApplicationEventMulticaster
    ) {
        super()
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._handler = createHandler(injector, this, APP_RUNNERS_INTERCEPTORS, APP_RUNNERS_GUARDS, APP_RUNNERS_FILTERS, null, true);
        this._handler.useFilters(ExceptionHandlerFilter);
    }

    get size(): number {
        return this._refs.size;
    }

    get handler(): ApplicationHandler {
        return this._handler
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this._handler.usePipes(pipes);
        return this;
    }

    useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[], order?: number): this {
        this._handler.useGuards(guards, order);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<ApplicationInterceptor> | ProvdierOf<ApplicationInterceptor>[], order?: number): this {
        this._handler.useInterceptors(interceptor, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this._handler.useFilters(filter, order);
        return this;
    }

    attach<T, TArg>(type: AbstractType<T> | Class<T>, options: InvocationHandlerOptions<T> = {}): Invocation<T> {
        const target = getClassify(type);

        let ends = this._maps.get(target.type);
        if (!ends) {
            ends = [];
            this._maps.set(target.type, ends);
        }
        let injector = this.injector.platform().getRegisterIn(target.type);
        if (!injector) {
            injector = this.injector;
            injector.register(target.type as Type);
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

    run(type?: AbstractType | AbstractType[]): Promise<void> {
        if (type) {
            return lastValueFrom(this._handler.handle(new HandleContext(this.injector, { request:  type  })));
        }
        return lastValueFrom(
            this.startup()
                .pipe(
                    mergeMap(v => this.beforeRun()),
                    mergeMap(v => this._types?.length ? this._handler.handle(new HandleContext(this.injector, { bootstrap: true, request:  this._types })) : of(v)),
                    mergeMap(v => this.afterRun())
                )
        );
    }

    stop(signls?: string): Promise<void> {
        return lastValueFrom(
            this.onShuwdown(signls)
                .pipe(
                    mergeMap(v => this.onDispose()),
                    finalize(() => this.onDestroy())
                )
        );
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this._maps.clear();
        this.multicaster.clear();
        this._handler.onDestroy();
        this._types = null!;
    }

    handle(context: HandleContext): Observable<any> {
        let handlers: HandlerLike[] | undefined;
        if (isFunction(context.request)) {
            handlers = this._maps.get(context.request)
        } else if (isArray(context.request)) {
            handlers = [];
            context.request.forEach(type => {
                handlers = handlers!.concat(this._maps.get(type) ?? []);
            });
        } else {
            return throwError(() => new ArgumentException('input type unknow'))
        }
        if (handlers && handlers.length) {
            return toObservable(composeHandlers(handlers)(context));
        }
        return throwError(() => new NotHandleException(context, context.targetType!));
    }

    protected startup(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartupEvent(this));
    }

    protected beforeRun(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartEvent(this));
    }

    protected afterRun(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartedEvent(this));
    }

    protected onShuwdown(signls?: string): Observable<any> {
        return this.multicaster.emit(new ApplicationShutdownEvent(this, signls));
    }

    protected onDispose(): Observable<any> {
        return this.multicaster.emit(new ApplicationDisposeEvent(this));
    }

}
