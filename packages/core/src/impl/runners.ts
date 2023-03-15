import {
    isNumber, Type, Injectable, InvocationContext, tokenId, Injector, TypeOf, Class, isFunction, refl,
    ClassType, StaticProviders, ReflectiveFactory, createContext, isArray, ArgumentExecption, ReflectiveRef
} from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable, throwError } from 'rxjs';
import { ApplicationRunners, RunnableRef } from '../runners';
import {
    ApplicationDisposeEvent, ApplicationEventMulticaster, ApplicationShutdownEvent,
    ApplicationStartedEvent, ApplicationStartEvent
} from '../events';
import { Endpoint, FnEndpoint, runEndpoints } from '../Endpoint';
import { FilterEndpoint } from '../filters/endpoint';
import { Interceptor } from '../Interceptor';
import { Filter } from '../filters/filter';
import { BootstrapOption, EndpointFactoryResolver } from '../filters/endpoint.factory';
import { getClassName } from 'packages/ioc/src/utils/lang';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes/pipe';


/**
 *  Appplication runner interceptors
 */
export const APP_RUNNERS_INTERCEPTORS = tokenId<Interceptor[]>('APP_RUNNERS_INTERCEPTORS');

/**
 *  Appplication runner filters
 */
export const APP_RUNNERS_FILTERS = tokenId<Filter[]>('APP_RUNNERS_FILTERS');


@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners implements Endpoint {
    private _types: ClassType[];
    private _maps: Map<ClassType, Endpoint[]>;
    private _refs: Map<ClassType, ReflectiveRef>;
    private _endpoint: FilterEndpoint;
    constructor(private injector: Injector, protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._types = [];
        this._maps = new Map();
        this._refs = new Map();
        this._endpoint = new FilterEndpoint(injector, APP_RUNNERS_INTERCEPTORS, this, APP_RUNNERS_FILTERS);
    }

    usePipes(pipes: TypeOf<PipeTransform> | TypeOf<PipeTransform>[]): this {

        return this;
    }

    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this {
        this._endpoint.useGuards(guards);
        return this;
    }

    useInterceptor(interceptor: TypeOf<Interceptor> | TypeOf<Interceptor>[], order?: number): this {
        this._endpoint.use(interceptor, order);
        return this;
    }

    useFilter(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number | undefined): this {
        this._endpoint.useFilter(filter, order);
        return this;
    }

    attach<T>(type: Type<T> | Class<T>, options: BootstrapOption = {}): ReflectiveRef<T> {
        const target = isFunction(type) ? refl.get(type) : type;
        if (this._maps.has(target.type)) {
            return this._refs.get(target.type)!;
        }


        const hasAdapter = target.providers.some(r => (r as StaticProviders).provide === RunnableRef);
        if (hasAdapter) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const endpoint = new FnEndpoint((input, ctx) => targetRef.resolve(RunnableRef).invoke(ctx));
            this._maps.set(target.type, [endpoint]);
            this.attachRef(targetRef, options.order);
            return targetRef;
        }

        const runnables = target.runnables.filter(r => !r.auto);
        if (runnables && runnables.length) {
            const targetRef = this.injector.get(ReflectiveFactory).create(target, this.injector, options);
            const facResolver = targetRef.resolve(EndpointFactoryResolver);
            const endpoints = runnables.sort((a, b) => (a.order || 0) - (b.order || 0)).map(runnable => {
                const factory = facResolver.resolve(targetRef, 'runnable');
                return factory.create(runnable.method, options)
            });
            this._maps.set(target.type, endpoints);
            this.attachRef(targetRef, options.order);
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

    getRef<T>(type: Type<T>): ReflectiveRef<T> | null {
        return this._refs.get(type) || null;
    }

    run(type?: Type): Promise<void> {
        if (type) {
            return lastValueFrom(this._endpoint.handle(type, createContext(this.injector)));
        }
        return lastValueFrom(
            this.beforeRun()
                .pipe(
                    mergeMap(v => this._endpoint.handle(this._types, createContext(this.injector))),
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

    onDestroy(): void {
        this._maps.clear();
        this._types = null!;
    }

    handle(input: any, context: InvocationContext<any>): Observable<any> {
        if (isFunction(input)) {
            return runEndpoints(this._maps.get(input), context, input, v => v.done === true)
        }
        if (isArray(input)) {
            const endpoints: Endpoint[] = [];
            input.forEach(type => {
                endpoints.push(...this._maps.get(type) || []);
            })
            return runEndpoints(endpoints, context, input, v => v.done === true)
        }
        return throwError(() => new ArgumentExecption('input type unknow'))
    }

    equals(target: any): boolean {
        return this === target;
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
