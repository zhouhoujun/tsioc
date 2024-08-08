import { ArgumentExecption, getClass, InjectFlags, Injector, ProvdierOf, StaticProvider, tokenId, Type } from '@tsdi/ioc';
import { forkJoin, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { CanHandle } from '../guard';
import { PipeTransform } from '../pipes/pipe';
import { Interceptor } from '../Interceptor';
import { Handler } from '../Handler';
import { Filter } from '../filters/filter';
import { ExecptionHandlerFilter } from '../filters/execption.filter';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { PayloadApplicationEvent } from '../events';


/**
 *  event multicaster interceptors multi token.
 */
export const EVENT_MULTICASTER_INTERCEPTORS = tokenId<Interceptor<ApplicationEvent, any>[]>('EVENT_MULTICASTER_INTERCEPTORS');

/**
 *  event multicaster filters multi token.
 */
export const EVENT_MULTICASTER_FILTERS = tokenId<Filter[]>('EVENT_MULTICASTER_FILTERS');

/**
 *  event multicaster guards multi token.
 */
export const EVENT_MULTICASTER_GUARDS = tokenId<CanHandle[]>('EVENT_MULTICASTER_GUARDS');


export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Handler<ApplicationEvent> {

    private _handler: ConfigableHandler<ApplicationEvent, any>;
    private maps: Map<Type, Handler[]>;
    protected _children: ApplicationEventMulticaster[];

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._children = [];
        this._handler = createHandler(injector, this, EVENT_MULTICASTER_INTERCEPTORS, EVENT_MULTICASTER_GUARDS, EVENT_MULTICASTER_FILTERS);
        this._handler.useFilters(ExecptionHandlerFilter)
    }

    get handler(): Handler<ApplicationEvent, any> {
        return this._handler
    }


    attach(eventMulticaster: ApplicationEventMulticaster): this {
        if (this._children.indexOf(eventMulticaster) < 0) {
            this._children.push(eventMulticaster);
        }
        return this;
    }
    detach(eventMulticaster: ApplicationEventMulticaster): this {
        this._children.splice(this._children.indexOf(eventMulticaster), 1);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this._handler.usePipes(pipes);
        return this;
    }

    useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[]): this {
        this._handler.useGuards(guards);
        return this;
    }

    useInterceptors(interceptors: ProvdierOf<Interceptor<ApplicationEvent, any>> | ProvdierOf<Interceptor<ApplicationEvent, any>>[], order?: number): this {
        this._handler.useInterceptors(interceptors, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this._handler.useFilters(filter, order);
        return this;
    }

    addListener(event: Type<ApplicationEvent>, handler: Handler, order = -1): this {
        const handlers = this.maps.get(event);
        if (handlers) {
            if (handlers.some(i => i.equals ? i.equals(handler) : i === handler)) return this;
            order >= 0 ? handlers.splice(order, 0, handler) : handlers.push(handler);
        } else {
            this.maps.set(event, [handler]);
        }
        return this;
    }

    removeListener(event: Type<ApplicationEvent>, handler: Handler): this {
        const handlers = this.maps.get(event);
        if (handlers) {
            const idx = handlers.findIndex(i => i.equals ? i.equals(handler) : i === handler);
            if (idx >= 0) {
                handlers.splice(idx, 1);
            }
        }
        return this;
    }

    emit(event: ApplicationEvent): Observable<void | false>;
    emit(event: Object): Observable<void | false>;
    emit(obj: ApplicationEvent | Object): Observable<void | false> {
        return this.publishEvent(obj)
    }


    publishEvent(event: ApplicationEvent): Observable<void | false>;
    publishEvent(event: Object): Observable<void | false>;
    publishEvent(obj: ApplicationEvent | Object): Observable<void | false> {
        if (!obj) throwError(() => new ArgumentExecption('Event must not be null'));

        // Decorate event as an ApplicationEvent if necessary
        let event: ApplicationEvent;
        if (obj instanceof ApplicationEvent) {
            event = obj
        } else {
            event = new PayloadApplicationEvent(this, obj)
        }


        return this.downward(event, true)
            .pipe(
                mergeMap(res => {
                    if (res === false || !event.propagation) return of(false);
                    return this.bubbleup(event)
                })
            ) as Observable<void | false>;
    }

    downward(event: ApplicationEvent, withSelf?: boolean): Observable<void | false> {
        return (withSelf ? this.handler.handle(event) : of(undefined))
            .pipe(
                mergeMap(res => {
                    if (res === false || !event.propagation) return of(false);
                    if (this._children.length) {
                        return forkJoin(this._children.map(r => r.downward(event, true)))
                            .pipe(
                                map(r => {
                                    if (!event.propagation) return false;
                                })
                            );
                    }
                    return of(undefined)
                })) as Observable<void | false>;
    }

    bubbleup(event: ApplicationEvent, withSelf?: boolean): Observable<void | false> {
        return (withSelf ? this.handler.handle(event) : of(undefined))
            .pipe(
                mergeMap(res => {
                    if (res === false || !event.propagation) return of(false);
                    const multicaster = this.injector.get(ApplicationEventMulticaster, null, InjectFlags.SkipSelf);
                    if (multicaster) {
                        // Publish event via parent multicaster as well...
                        return multicaster.bubbleup(event, true)
                    }
                    return of(undefined);
                })) as Observable<void | false>;
    }

    handle(event: ApplicationEvent): Observable<void | false> {
        const handlers = this.maps.get(getClass(event));
        if (!handlers || !handlers.length) return of(undefined);

        return handlers.reduce(($obs, h) => {
            return $obs.pipe(
                mergeMap(r => {
                    if (r !== false || !event.propagation) {
                        return h.handle(event)
                    }
                    return of(r);
                })
            )
        }, of(undefined))
    }

    clear(): void {
        this.maps.clear();
        this._handler.onDestroy()
    }

}

