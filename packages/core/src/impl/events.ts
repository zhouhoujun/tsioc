import { createContext, getClass, Injector, InvocationContext, tokenId, Type, TypeOf } from '@tsdi/ioc';
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
    private maps: Map<Type, Endpoint[]>;

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

    addListener(event: Type<ApplicationEvent>, endpoint: Endpoint, order = -1): this {
        const endpoints = this.maps.get(event);
        if (endpoints) {
            if (endpoints.some(i => i.equals(endpoint))) return this;
            order >= 0 ? endpoints.splice(order, 0, endpoint) : endpoints.push(endpoint);
        } else {
            this.maps.set(event, [endpoint]);
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

    equals(target: any): boolean {
        return this === target;
    }
}

