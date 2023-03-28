import { ArgumentExecption, getClass, Injectable, InjectFlags, Injector, StaticProvider, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { finalize, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoint } from '../Endpoint';
import { Filter } from '../filters/filter';
import { GuardsEndpoint } from '../endpoints/guards.endpoint';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventContext, ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { PayloadApplicationEvent } from '../events';
import { CatchFilter } from '../filters/execption.filter';
import { runEndpoints } from '../endpoints/runs';


/**
 *  event multicaster interceptors mutil token.
 */
export const EVENT_MULTICASTER_INTERCEPTORS = tokenId<Interceptor<ApplicationEventContext, any>[]>('EVENT_MULTICASTER_INTERCEPTORS');

/**
 *  event multicaster filters mutil token.
 */
export const EVENT_MULTICASTER_FILTERS = tokenId<Filter[]>('EVENT_MULTICASTER_FILTERS');

/**
 *  event multicaster guards mutil token.
 */
export const EVENT_MULTICASTER_GUARDS = tokenId<CanActivate[]>('EVENT_MULTICASTER_GUARDS');

@Injectable()
export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Endpoint<ApplicationEventContext> {

    private _endpoint: GuardsEndpoint<ApplicationEventContext, any>;
    private maps: Map<Type, Endpoint[]>;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._endpoint = new GuardsEndpoint(injector, EVENT_MULTICASTER_INTERCEPTORS, this, EVENT_MULTICASTER_GUARDS, EVENT_MULTICASTER_FILTERS);
        this._endpoint.useFilters(CatchFilter)
    }

    get endpoint(): Endpoint<ApplicationEventContext, any> {
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

    useInterceptors(interceptor: TypeOf<Interceptor<ApplicationEventContext, any>> | TypeOf<Interceptor<ApplicationEventContext, any>>[], order?: number): this {
        this._endpoint.useInterceptors(interceptor, order);
        return this;
    }

    useFilters(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number | undefined): this {
        this._endpoint.useFilters(filter, order);
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
        const ctx = new ApplicationEventContext(this.injector, { payload: value });
        ctx.setValue(getClass(value), value);
        return this.endpoint.handle(ctx)
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

    handle(context: ApplicationEventContext): Observable<any> {
        const endpoints = this.maps.get(getClass(context.payload));
        return runEndpoints(endpoints, context, v => v.done === true);
    }

    clear(): void {
        this.maps.clear();
    }

}

