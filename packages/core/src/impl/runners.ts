import { OperationInvoker, isNumber, ReflectiveRef, Type, Injectable, InvocationContext, tokenId, Injector, TypeOf } from '@tsdi/ioc';
import { finalize, lastValueFrom, mergeMap, Observable } from 'rxjs';
import { ApplicationRunners } from '../runners';
import {
    ApplicationDisposeEvent, ApplicationEventMulticaster, ApplicationShutdownEvent,
    ApplicationStartedEvent, ApplicationStartingEvent
} from '../events';
import { Endpoint, runEndpoints } from '../Endpoint';
import { FilterEndpoint } from '../filters/endpoint';
import { Interceptor } from '../Interceptor';
import { Filter } from '../filters/filter';


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
    private _runners: (OperationInvoker | ReflectiveRef)[];
    private _maps: Map<Type, (OperationInvoker | ReflectiveRef)[]>;
    private order = false;
    private _endpoint: FilterEndpoint;
    constructor(private injector: Injector, protected readonly multicaster: ApplicationEventMulticaster) {
        super()
        this._runners = [];
        this._maps = new Map();
        this._endpoint = new FilterEndpoint(injector, APP_RUNNERS_INTERCEPTORS, this, APP_RUNNERS_FILTERS);
    }

    useInterceptor(interceptor: TypeOf<Interceptor>, order?: number): this {
        this._endpoint.use(interceptor, order);
        return this;
    }

    useFilter(filter: TypeOf<Filter>, order?: number | undefined): this {
        this._endpoint.useFilter(filter, order);
        return this;
    }

    attach(runner: OperationInvoker<any> | ReflectiveRef<any>, order?: number | undefined): void {
        const tgref = runner instanceof ReflectiveRef ? runner : runner.typeRef;
        if (!this._maps.has(tgref.type)) {
            this._maps.set(tgref.type, [runner]);
        } else {
            this._maps.get(tgref.type)?.push(runner);
        }

        if (isNumber(order)) {
            this.order = true;
            this._runners.splice(order, 0, runner)
        } else {
            this._runners.push(runner);
        }
    }

    detach(runner: OperationInvoker | ReflectiveRef): void {
        const idx = this._runners.findIndex(o => o === runner);
        if (idx >= 0) {
            this._runners.splice(idx, 1);
        }
    }

    has(runner: OperationInvoker | ReflectiveRef): boolean {
        const tgref = runner instanceof ReflectiveRef ? runner : runner.typeRef;
        return this._maps.has(tgref.type);
    }

    run(context: InvocationContext): Promise<void> {
        return lastValueFrom(
            this.beforeRun()
                .pipe(
                    mergeMap(v => this._endpoint.handle(context.arguments, context)),
                    mergeMap(v => this.afterRun())
                )
        );
    }

    stop(signls?: string): Promise<void> {
        return lastValueFrom(this.onShuwdown(signls)
            .pipe(
                mergeMap(v => this.onDispose()),
                finalize(() => this.onDestroy())
            ))
    }

    onDestroy(): void {
        this._maps.clear();
        this._runners = null!;
    }

    handle(input: any, context: InvocationContext<any>): Observable<any> {
        return runEndpoints(this._runners, context, context.arguments, v => v.done === true)
    }

    equals(target: any): boolean {
        return this === target;
    }

    protected beforeRun(): Observable<any> {
        return this.multicaster.emit(new ApplicationStartingEvent(this));
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
