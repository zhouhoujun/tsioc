import { Abstract, Type, InvocationContext, OperationInvoker, tokenId, OnDestroy, Destroyable, ReflectiveRef, DestroyCallback, Injector, Class } from '@tsdi/ioc';
import { CanActivate } from './guard';
import { Interceptor } from './Interceptor';
import { Filter } from './filters/filter';
import { ConfigableHandler, ConfigableHandlerOptions } from './handlers/configable';
import { BehaviorSubject, Observable, Subject, filter, takeUntil } from 'rxjs';


/**
 * Invocation handler
 */
@Abstract()
export abstract class InvocationHandler<
    TInput extends InvocationContext = InvocationContext,
    TOutput = any,
    TOptions extends InvocationOptions = InvocationOptions,
    TContext = any> extends ConfigableHandler<TInput, TOutput, TOptions, TContext> {
    /**
     * opteration invoker.
     */
    abstract get invoker(): OperationInvoker;

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals(target: any): boolean;
}

export class InvocationArgs {

    private destory$ = new Subject<void>();
    private _next$ = new BehaviorSubject<any>(null);
    private _inputs: any[];
    readonly changed: Observable<any>;

    get inputs(): any[] {
        return this._inputs;
    }

    constructor() {
        this._inputs = [];
        this.changed = this._next$.pipe(
            takeUntil(this.destory$),
            filter(r => r !== null)
        )
    }

    next<TInput>(input: TInput): this {
        if (this._inputs[0] != input) {
            this._inputs.unshift(input);
            this.onNext(input);
        }
        return this;
    }

    protected onNext(data: any) {
        this._next$.next(data);
    }

    first<TInput>(): TInput {
        return this._inputs[this._inputs.length - 1]
    }

    last<TInput>(): TInput {
        return this._inputs[0];
    }

    onDestroy(): void {
        this._inputs = [];
        this.destory$.next();
        this.destory$.complete();

    }
}


/**
 * Invocation Handler factory.
 */
@Abstract()
export abstract class InvocationFactory<T> implements OnDestroy, Destroyable {

    abstract get typeRef(): ReflectiveRef<T>;

    abstract create<TArg>(propertyKey: string, options: InvocationOptions<TArg>): InvocationHandler;


    destroy(): void {
        this.typeRef.destroy();
    }
    get destroyed(): boolean {
        return this.typeRef.destroyed;
    }

    onDestroy(callback?: DestroyCallback): void {
        this.typeRef.onDestroy(callback);
    }
}

/**
 * Invocation Handler factory resolver.
 */
@Abstract()
export abstract class InvocationFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: ReflectiveRef<T>): InvocationFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>, injector: Injector): InvocationFactory<T>;
}





/**
 * Respond 
 */
@Abstract()
export abstract class Respond<TInput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, value: T): void;
}

/**
 * Respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond<TInput = any> {
    /**
     * respond with handled data.
     * @param input input data.
     * @param value handled returnning value
     * @param responseType response type
     */
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response'): void;
}



/**
 * Invocation Handler options.
 * 
 * 终结点配置
 */
export interface InvocationOptions<T = any, TArg = any> extends ConfigableHandlerOptions<T, TArg> {
    /**
     * the endpoint run times limit. 
     */
    limit?: number;
    /**
     * auto bootstrap endpoint attached. default true.
     */
    bootstrap?: boolean;
    /**
     * endpoint order
     */
    order?: number;
    /**
     * endpoint handler response as.
     */
    response?: 'body' | 'header' | 'response' | Type<Respond<T>> | ((input: T, returnning: any) => void)
}


export const OPERA_INTERCEPTORS = tokenId<Interceptor[]>('OPERA_INTERCEPTORS');
export const OPERA_GUARDS = tokenId<CanActivate[]>('OPERA_GUARDS');
export const OPERA_FILTERS = tokenId<Filter[]>('OPERA_FILTERS');