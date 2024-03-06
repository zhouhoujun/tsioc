import {
    isNumber, Type, Injectable, tokenId, Injector, Class, isFunction, refl, ProvdierOf, getClassName,
    StaticProviders, ReflectiveFactory, isArray, ArgumentExecption, ReflectiveRef, StaticProvider, EMPTY
} from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable, throwError } from 'rxjs';
import { ApplicationRunners, RunnableFactory, RunnableRef } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartedEvent, ApplicationStartEvent, ApplicationStartupEvent } from '../events';
import { PipeTransform } from '../pipes/pipe';
import { CanActivate } from '../guard';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';
import { Filter } from '../filters/filter';
import { ExecptionHandlerFilter } from '../filters/execption.filter';
import { GuardHandler, createGuardHandler } from '../handlers/guards';
import { FnHandler } from '../handlers/handler';
import { runHandlers } from '../handlers/runs';
import { EndpointOptions } from '../endpoints/endpoint.service';
import { EndpointFactoryResolver } from '../endpoints/endpoint.factory';
import { EndpointContext } from '../endpoints/context';


/**
 *  Appplication runner interceptors multi token
 */
export const APP_RUNNERS_INTERCEPTORS = tokenId<Interceptor<EndpointContext>[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Appplication runner filters multi token
 */
export const APP_RUNNERS_FILTERS = tokenId<Filter[]>('APP_RUNNERS_FILTERS');

/**
 *  Appplication runner guards multi token
 */
export const APP_RUNNERS_GUARDS = tokenId<CanActivate[]>('APP_RUNNERS_GUARDS');


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners implements Handler {
    private _types: Type[];
    private _maps: Map<Type, Handler[]>;
    private _refs: Map<Type, ReflectiveRef[]>;
    private _handler: GuardHandler;
    constructor(private injector: Injector, protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._handler = createGuardHandler(injector, this, APP_RUNNERS_INTERCEPTORS, APP_RUNNERS_GUARDS, APP_RUNNERS_FILTERS);
        this._handler.useFilters(ExecptionHandlerFilter);
    }

    get size(): number {
        return this._refs.size;
    }

    get handler(): Handler {
        return this._handler
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this._handler.usePipes(pipes);
        return this;
    }

    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this {
        this._handler.useGuards(guards, order);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this {
        this._handler.useInterceptors(interceptor, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this._handler.useFilters(filter, order);
        return this;
    }

    attach<T, TArg>(type: Type<T> | Class<T>, options: EndpointOptions<TArg> = {}): ReflectiveRef<T> {
        const target = isFunction(type) ? refl.get(type) : type;

        let ends = this._maps.get(target.type);
        if (!ends) {
            ends = [];
            this._maps.set(target.type, ends);
        }
        const hasAdapter = target.providers.some(r => (r as StaticProviders).provide === RunnableRef || (r as StaticProviders).provide === RunnableFactory);
        if (hasAdapter) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const hasFactory = target.providers.some(r => (r as StaticProviders).provide === RunnableFactory);
            const endpoint = new FnHandler((ctx) => hasFactory ? targetRef.resolve(RunnableFactory).create(targetRef).invoke(ctx) : targetRef.resolve(RunnableRef).invoke(ctx));
            ends.push(endpoint);
            this.attachRef(targetRef, options.order);
            targetRef.onDestroy(() => this.detach(target.type));
            return targetRef;
        }

        const runnables = target.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const facResolver = targetRef.resolve(EndpointFactoryResolver);
            const factory = facResolver.resolve(targetRef);
            const endpoints = runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                return factory.create(runnable.method, options)
            });
            ends.push(...endpoints);
            this.attachRef(targetRef, options.order);
            targetRef.onDestroy(() => this.detach(target.type));
            return targetRef;
        }

        throw new ArgumentExecption(getClassName(target.type) + ' is invaild runnable');
    }

    protected attachRef(tagRef: ReflectiveRef, order?: number) {
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

    detach<T>(type: Type<T>): void {
        if (this._destroyed) return;
        this._maps.delete(type);
        this._refs.delete(type);
        const idx = this._types.indexOf(type);
        if (idx >= 0) {
            this._types.splice(idx, 1);
        }
    }

    has<T>(type: Type<T>): boolean {
        return this._maps.has(type);
    }

    getRef<T>(type: Type<T>, idx = 0): ReflectiveRef<T> {
        return this._refs.get(type)?.[idx] ?? null!;
    }

    getRefs<T>(type: Type<T>): ReflectiveRef<T>[] {
        return this._refs.get(type) ?? EMPTY;
    }

    run(type?: Type|Type[]): Promise<void> {
        if (type) {
            return lastValueFrom(this._handler.handle(new EndpointContext(this.injector, { args: { useValue: type } })));
        }
        return lastValueFrom(
            this.startup()
                .pipe(
                    mergeMap(v => this.beforeRun()),
                    mergeMap(v => this._handler.handle(new EndpointContext(this.injector, { bootstrap: true, args: { useValue: this._types } }))),
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

    handle(context: EndpointContext<any>): Observable<any> {
        if (isFunction(context.args)) {
            return runHandlers(this._maps.get(context.args), context, v => v.isDone() === true)
        }
        if (isArray(context.args)) {
            const handlers: Handler[] = [];
            context.args.forEach(type => {
                handlers.push(...this._maps.get(type) || []);
            })
            return runHandlers(handlers, context, v => v.isDone() === true)
        }
        return throwError(() => new ArgumentExecption('input type unknow'))
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
