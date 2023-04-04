import {
    isNumber, Type, Injectable, InvocationContext, tokenId, Injector, Class, isFunction, refl, ProvdierOf, getClassName,
    ClassType, StaticProviders, ReflectiveFactory, isArray, ArgumentExecption, ReflectiveRef, StaticProvider
} from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable, throwError } from 'rxjs';
import { ApplicationRunners, RunnableRef } from '../ApplicationRunners';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationDisposeEvent, ApplicationShutdownEvent, ApplicationStartedEvent, ApplicationStartEvent, ApplicationStartupEvent } from '../events';
import { PipeTransform } from '../pipes/pipe';
import { CanActivate } from '../guard';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';
import { Filter } from '../filters/filter';
import { CatchFilter } from '../filters/execption.filter';
import { GuardHandler } from '../handlers/guards';
import { FnHandler } from '../handlers/handler';
import { EndpointOptions } from '../endpoints/endpoint.service';
import { EndpointFactoryResolver } from '../endpoints/endpoint.factory';
import { runHandlers } from '../endpoints/runs';
import { EndpointContext } from '../endpoints/context';


/**
 *  Appplication runner interceptors mutil token
 */
export const APP_RUNNERS_INTERCEPTORS = tokenId<Interceptor<EndpointContext>[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Appplication runner filters mutil token
 */
export const APP_RUNNERS_FILTERS = tokenId<Filter[]>('APP_RUNNERS_FILTERS');

/**
 *  Appplication runner guards mutil token
 */
export const APP_RUNNERS_GUARDS = tokenId<CanActivate[]>('APP_RUNNERS_GUARDS');


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners implements Handler {
    private _types: ClassType[];
    private _maps: Map<ClassType, Handler[]>;
    private _refs: Map<ClassType, ReflectiveRef>;
    private _handler: GuardHandler;
    constructor(private injector: Injector, protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._handler = new GuardHandler(injector, APP_RUNNERS_INTERCEPTORS, this, APP_RUNNERS_GUARDS, APP_RUNNERS_FILTERS);
        this._handler.useFilters(CatchFilter);
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
        if (this._maps.has(target.type)) {
            return this._refs.get(target.type)!;
        }


        const hasAdapter = target.providers.some(r => (r as StaticProviders).provide === RunnableRef);
        if (hasAdapter) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const endpoint = new FnHandler((ctx) => targetRef.resolve(RunnableRef).invoke(ctx));
            this._maps.set(target.type, [endpoint]);
            this.attachRef(targetRef, options.order);
            targetRef.onDestroy(()=> this.detach(target.type as Type));
            return targetRef;
        }

        const runnables = target.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const facResolver = targetRef.resolve(EndpointFactoryResolver);
            const endpoints = runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                const factory = facResolver.resolve(targetRef);
                return factory.create(runnable.method, options)
            });
            this._maps.set(target.type, endpoints);
            this.attachRef(targetRef, options.order);
            targetRef.onDestroy(()=> this.detach(target.type as Type));
            return targetRef;
        }

        throw new ArgumentExecption(getClassName(target.type) + ' is invaild runnable');
    }

    protected attachRef(tagRef: ReflectiveRef, order?: number) {
        this._refs.set(tagRef.type, tagRef);
        if (isNumber(order)) {
            this._types.splice(order, 0, tagRef.type)
        } else {
            this._types.push(tagRef.type);
        }
    }

    detach<T>(type: Type<T>): void {
        if(this._destroyed) return;
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

    getRef<T>(type: Type<T>): ReflectiveRef<T> {
       return this._refs.get(type) || null!;
    }

    run(type?: Type): Promise<void> {
        if (type) {
            return lastValueFrom(this._handler.handle(new EndpointContext(this.injector, { payload: { useValue: type } })));
        }
        return lastValueFrom(
            this.startup()
                .pipe(
                    mergeMap(v => this.beforeRun()),
                    mergeMap(v => this._handler.handle(new EndpointContext(this.injector, { payload: { useValue: this._types } }))),
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
        if(this._destroyed) return;
        this._destroyed = true;
        this._maps.clear();
        this.multicaster.clear();
        this._types = null!;
    }

    handle(context: InvocationContext<any>): Observable<any> {
        if (isFunction(context.payload)) {
            return runHandlers(this._maps.get(context.payload), context, v => v.done === true)
        }
        if (isArray(context.payload)) {
            const handlers: Handler[] = [];
            context.payload.forEach(type => {
                handlers.push(...this._maps.get(type) || []);
            })
            return runHandlers(handlers, context, v => v.done === true)
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
