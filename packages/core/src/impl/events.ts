import { ArgumentExecption, getClass, Injectable, InjectFlags, Injector, InvocationContext, StaticProvider, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { finalize, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoint, runEndpoints } from '../Endpoint';
import { Filter } from '../filters/filter';
import { FilterEndpoint } from '../filters/endpoint';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { PayloadApplicationEvent } from '../events';
import { CatchFilter, createEndpointContext } from '../filters';


/**
 *  event multicaster interceptors mutil token.
 */
export const EVENT_MULTICASTER_INTERCEPTORS = tokenId<Interceptor<ApplicationEvent, any>[]>('EVENT_MULTICASTER_INTERCEPTORS');

/**
 *  event multicaster filters mutil token.
 */
export const EVENT_MULTICASTER_FILTERS = tokenId<Filter[]>('EVENT_MULTICASTER_FILTERS');

/**
 *  event multicaster guards mutil token.
 */
export const EVENT_MULTICASTER_GUARDS = tokenId<CanActivate[]>('EVENT_MULTICASTER_GUARDS');

@Injectable()
export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Endpoint<ApplicationEvent> {

    private _endpoint: FilterEndpoint<ApplicationEvent, any>;
    private maps: Map<Type, Endpoint[]>;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._endpoint = new FilterEndpoint(injector, EVENT_MULTICASTER_INTERCEPTORS, this, EVENT_MULTICASTER_GUARDS, EVENT_MULTICASTER_FILTERS);
        this._endpoint.useFilter(CatchFilter)
    }

    get endpoint(): Endpoint<ApplicationEvent, any> {
        return this._endpoint
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this._endpoint.usePipes(pipes);
        return this;
    }

    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this {
        this._endpoint.useGuards(guards);
        return this;
    }

    useInterceptor(interceptor: TypeOf<Interceptor<ApplicationEvent, any>> | TypeOf<Interceptor<ApplicationEvent, any>>[], order?: number): this {
        this._endpoint.useInterceptor(interceptor, order);
        return this;
    }

    useFilter(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number | undefined): this {
        this._endpoint.useFilter(filter, order);
        return this;
    }

    addListener(event: Type<ApplicationEvent>, endpoint: Endpoint, order = -1): this {
        const endpoints = this.maps.get(event);
        if (endpoints) {
            if (endpoints.some(i => i.equals ? i.equals(endpoint) : i === endpoint)) return this;
            order >= 0 ? endpoints.splice(order, 0, endpoint) : endpoints.push(endpoint);
        } else {
            this.maps.set(event, [endpoint]);
        }
        return this;
    }

    emit(value: ApplicationEvent): Observable<any> {
        const ctx = createEndpointContext(this.injector, { arguments: value });
        ctx.setValue(getClass(value), value);
        return this.endpoint.handle(value, ctx)
            .pipe(
                finalize(() => {
                    ctx.destroy();
                })
            );
    }


    publishEvent(event: ApplicationEvent): Observable<any>;
    publishEvent(event: Object): Observable<any>;
    publishEvent(obj: ApplicationEvent | Object): Observable<any> {
        if (!obj) throwError(() => new ArgumentExecption('Event must not be null'));

        // Decorate event as an ApplicationEvent if necessary
        let event: ApplicationEvent;
        if (obj instanceof ApplicationEvent) {
            event = obj
        }
        else {
            event = new PayloadApplicationEvent(this, obj)
        }

        return this.emit(event)
            .pipe(
                mergeMap(res => {
                    const multicaster = this.injector.get(ApplicationEventMulticaster, null, InjectFlags.SkipSelf);
                    if (multicaster) {
                        // Publish event via parent multicaster as well...
                        return multicaster.publishEvent(event)
                            .pipe(
                                map(() => {
                                    return res;
                                })
                            )
                    } else {
                        return of(res);
                    }
                })
            );


    }

    handle(input: ApplicationEvent, context: InvocationContext<any>): Observable<any> {
        const endpoints = this.maps.get(getClass(input));
        return runEndpoints(endpoints, context, input, v => v.done === true);
    }

    clear(): void {
        this.maps.clear();
    }

}

