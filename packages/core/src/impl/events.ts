import { ArgumentExecption, getClass, Injectable, InjectFlags, Injector, StaticProvider, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { finalize, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes/pipe';
import { Interceptor } from '../Interceptor';
import { Handler } from '../Handler';
import { Filter } from '../filters/filter';
import { CatchFilter } from '../filters/execption.filter';
import { runHandlers } from '../endpoints/runs';
import { GuardHandler } from '../handlers/guards';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventContext, ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { PayloadApplicationEvent } from '../events';


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
export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Handler<ApplicationEventContext> {

    private _handler: GuardHandler<ApplicationEventContext, any>;
    private maps: Map<Type, Handler[]>;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._handler = new GuardHandler(injector, EVENT_MULTICASTER_INTERCEPTORS, this, EVENT_MULTICASTER_GUARDS, EVENT_MULTICASTER_FILTERS);
        this._handler.useFilters(CatchFilter)
    }

    get handler(): Handler<ApplicationEventContext, any> {
        return this._handler
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this._handler.usePipes(pipes);
        return this;
    }

    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this {
        this._handler.useGuards(guards);
        return this;
    }

    useInterceptors(interceptor: TypeOf<Interceptor<ApplicationEventContext, any>> | TypeOf<Interceptor<ApplicationEventContext, any>>[], order?: number): this {
        this._handler.useInterceptors(interceptor, order);
        return this;
    }

    useFilters(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number | undefined): this {
        this._handler.useFilters(filter, order);
        return this;
    }

    addListener(event: Type<ApplicationEvent>, handler: Handler, order = -1): this {
        const endpoints = this.maps.get(event);
        if (endpoints) {
            if (endpoints.some(i => i.equals ? i.equals(handler) : i === handler)) return this;
            order >= 0 ? endpoints.splice(order, 0, handler) : endpoints.push(handler);
        } else {
            this.maps.set(event, [handler]);
        }
        return this;
    }

    removeListener(event: Type<ApplicationEvent>, handler: Handler): this {
        const endpoints = this.maps.get(event);
        if (endpoints) {
            const idx = endpoints.findIndex(i => i.equals ? i.equals(handler) : i === handler);
            if (idx >= 0) {
                endpoints.splice(idx, 1);
            }
        }
        return this;
    }

    emit(value: ApplicationEvent): Observable<any> {
        const ctx = new ApplicationEventContext(this.injector, { payload: value });
        ctx.setValue(getClass(value), value);
        return this.handler.handle(ctx)
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
        return runHandlers(endpoints, context, v => v.done === true);
    }

    clear(): void {
        this.maps.clear();
    }

}

