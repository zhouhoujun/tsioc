import { createContext, getClass, Injector, InvocationContext, InvokerLike, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoint, runInvokers } from '../Endpoint';
import { ApplicationEvent, ApplicationEventMulticaster } from '../events';
import { Filter } from '../filters/filter';
import { FilterEndpoint } from '../filters/endpoint';


/**
 *  event multicaster interceptors
 */
export const EVENT_MULTICASTER_INTERCEPTORS = tokenId<Interceptor<ApplicationEvent, any>[]>('EVENT_MULTICASTER_INTERCEPTORS');

/**
 *  event multicaster filters
 */
export const EVENT_MULTICASTER_FILTERS = tokenId<Filter[]>('EVENT_MULTICASTER_FILTERS');


export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Endpoint<ApplicationEvent> {

    private _endpoint: FilterEndpoint<ApplicationEvent, any>;
    private maps: Map<Type, InvokerLike[]>;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._endpoint = new FilterEndpoint(injector, EVENT_MULTICASTER_INTERCEPTORS, this, EVENT_MULTICASTER_FILTERS);
    }

    get endpoint(): Endpoint<ApplicationEvent, any> {
        return this._endpoint
    }

    useInterceptor(interceptor: TypeOf<Interceptor<ApplicationEvent, any>>, order?: number): this {
        this._endpoint.use(interceptor, order);
        return this;
    }

    useFilter(filter: TypeOf<Filter>, order?: number | undefined): this {
        this._endpoint.useFilter(filter, order);
        return this;
    }

    addListener(event: Type<ApplicationEvent>, invoker: InvokerLike, order = -1): this {
        const handlers = this.maps.get(event);
        if (handlers) {
            if (handlers.indexOf(invoker) >= 0) return this;
            order >= 0 ? handlers.splice(order, 0, invoker) : handlers.push(invoker);
        } else {
            this.maps.set(event, [invoker]);
        }
        return this;
    }

    emit(value: ApplicationEvent): Observable<any> {
        return this.endpoint.handle(value, createContext(this.injector));
    }

    handle(input: ApplicationEvent, context: InvocationContext<any>): Observable<any> {
        const handlers = this.maps.get(getClass(input));
        return runInvokers(handlers, context, input, v => v.done === true);
    }

    clear(): void {
        this.maps.clear();
    }
}

