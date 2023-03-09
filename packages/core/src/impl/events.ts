import { createContext, getClass, Injector, InvokerLike, isType, Token, tokenId, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Interceptor, runInvokers } from '../Interceptor';
import { ApplicationEvent, ApplicationEventMulticaster } from '../events';
import { Endpoint } from '../Endpoint';

export const EVENT_MULTICASTER_INTERCEPTORS = tokenId<Interceptor<ApplicationEvent, any>[]>('EVENT_MULTICASTER_INTERCEPTORS');

export class DefaultEventMulticaster extends ApplicationEventMulticaster {

    private _chain?: Endpoint<ApplicationEvent, any>;
    private maps: Map<Type, InvokerLike[]>;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
    }

    // get endpoint(): Endpoint<ApplicationEvent, any> {
    //     if (!this._chain) {
    //         this._chain = this.buildEndpoint();
    //     }
    //     return this._chain
    // }

    use(interceptor: TypeOf<Interceptor<ApplicationEvent, any>>, order?: number): this {
        this.multiOrder(EVENT_MULTICASTER_INTERCEPTORS, interceptor, order);
        return this;
    }

    addListener(event: Type<ApplicationEvent>, invoker: InvokerLike, order = -1): void {
        const handlers = this.maps.get(event);
        if (handlers) {
            if (handlers.indexOf(invoker) >= 0) return;
            order >= 0 ? handlers.splice(order, 0, invoker) : handlers.push(invoker);
        } else {
            this.maps.set(event, [invoker]);
        }
    }

    emit(value: ApplicationEvent): Observable<any> {
        const handlers = this.maps.get(getClass(value));
        return runInvokers(handlers, createContext(this.injector), value, v => v.done === true)
    }

    clear(): void {
        this.maps.clear();
    }

    protected multiOrder<T>(provide: Token, target: Type<T> | T, multiOrder?: number) {
        if (isType(target)) {
            this.injector.inject({ provide, useClass: target, multi: true, multiOrder })
        } else {
            this.injector.inject({ provide, useValue: target, multi: true, multiOrder })
        }
    }
}

