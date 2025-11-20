import {
    ArgumentException, composeHandlers, getType, InjectFlags, HandlerLike,
    Injector, ProvdierOf, StaticProvider, tokenId, AbstractType, ContextToken,
    HandleResult,  promiseOf
} from '@tsdi/ioc';
import { CanHandle } from '../guard';
import { PipeTransform } from '../pipes/pipe';
import { Interceptor } from '../ApplicationInterceptor';
import { Handler, createRunableContext, RunableContext } from '../ApplicationHandler';
import { Filter } from '../filters/filter';
import { ExceptionHandlerFilter } from '../filters/execption.filter';
import { ConfigableHandler, createHandler } from '../handlers/configable.impl';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster, EventInterceptorLike } from '../ApplicationEventMulticaster';
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

export const WITH_SELF = new ContextToken(() => false);


export class DefaultEventMulticaster extends ApplicationEventMulticaster implements Handler<ApplicationEvent> {

    private _handler: ConfigableHandler<ApplicationEvent>;
    private maps: Map<AbstractType, HandlerLike[]>;
    protected _children: ApplicationEventMulticaster[];

    readonly parent: ApplicationEventMulticaster | null;

    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
        this._children = [];
        this._handler = createHandler(injector, this, EVENT_MULTICASTER_INTERCEPTORS, EVENT_MULTICASTER_GUARDS, EVENT_MULTICASTER_FILTERS, null, true);
        this._handler.useFilters(ExceptionHandlerFilter);
        this.parent = this.injector.get(ApplicationEventMulticaster, null, InjectFlags.SkipSelf);
        if (this.parent) {
            const parent = this.parent;
            const multicaster = this as ApplicationEventMulticaster;
            parent.attach(multicaster);
            injector.onDestroy(() => {
                parent.detach(multicaster);
            })
        }
    }

    get handler(): ConfigableHandler<ApplicationEvent> {
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

    useInterceptors(interceptors: ProvdierOf<EventInterceptorLike> | ProvdierOf<EventInterceptorLike>[], order?: number): this {
        this._handler.useInterceptors(interceptors, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this._handler.useFilters(filter, order);
        return this;
    }

    addListener(event: AbstractType<ApplicationEvent>, handler: HandlerLike, order = -1): this {
        const handlers = this.maps.get(event);
        if (handlers) {
            if (handlers.some(i => (i as Handler).equals ? (i as Handler).equals?.(handler) : i === handler)) return this;
            order >= 0 ? handlers.splice(order, 0, handler) : handlers.push(handler);
        } else {
            this.maps.set(event, [handler]);
        }
        return this;
    }

    removeListener(event: AbstractType<ApplicationEvent>, handler: Handler): this {
        const handlers = this.maps.get(event);
        if (handlers) {
            const idx = handlers.findIndex(i => (i as Handler).equals ? (i as Handler).equals?.(handler) : i === handler);
            if (idx >= 0) {
                handlers.splice(idx, 1);
            }
        }
        return this;
    }

    emit(event: ApplicationEvent): Promise<void | false>;
    emit(event: Object): Promise<void | false>;
    emit(obj: ApplicationEvent | Object): Promise<void | false> {
        return this.publishEvent(obj)
    }


    publishEvent(event: ApplicationEvent, context?: RunableContext): Promise<void | false>;
    publishEvent(event: Object, context?: RunableContext): Promise<void | false>;
    async publishEvent(obj: ApplicationEvent | Object, context?: RunableContext): Promise<void | false> {
        if (!obj) throw new ArgumentException('Event must not be null');

        // Decorate event as an ApplicationEvent if necessary
        let event: ApplicationEvent;
        if (obj instanceof ApplicationEvent) {
            event = obj
        } else {
            event = new PayloadApplicationEvent(this, obj)
        }

        context ??= createRunableContext(this.handler.context ?? this.injector);
        context.set(WITH_SELF, true);
        let res = await this.downward(event, context);
        if (res === false || !event.propagation) return false;

        context.set(WITH_SELF, false);
        res = await this.bubbleup(event, context);
        return res;
    }

    async downward(event: ApplicationEvent, context: RunableContext): Promise<void | false> {
        let res: undefined | false;
        if (context.get(WITH_SELF)) {
            res = await promiseOf(this.handler.handle(event, context))
        }
        if (res === false || !event.propagation) return false;
        if (this._children.length) {
            return promiseOf(composeHandlers(this._children.map(r => (event, context) => r.downward(event, context)), (r, next, input, ctx) => {
                if (!event.propagation) return false;
                return next(event, ctx ?? context);
            })(event, context));
        }
    }

    async bubbleup(event: ApplicationEvent, context: RunableContext): Promise<void | false> {
        let res: undefined | false;
        if (context.get(WITH_SELF)) {
            res = await promiseOf(this.handler.handle(event, context))
        }
        if (res === false || !event.propagation) return false;
        if (this.parent) {
            // Publish event via parent multicaster as well...
            return await this.parent.bubbleup(event, context)
        }
    }

    handle(event: ApplicationEvent, context: RunableContext): HandleResult<void | false> {
        const handlers = this.maps.get(getType(event));
        if (!handlers || !handlers.length) return;

        return composeHandlers(handlers, (r, next, input, ctx) => {
            if (r !== false || event.propagation) {
                return next(event, ctx ?? context);
            }
            return r;
        })(event, context);
    }

    clear(): void {
        this.maps.clear();
        this._handler.onDestroy()
    }

}

