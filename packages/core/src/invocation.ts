import { Abstract, Type, Invocation, OnDestroy, Destroyable, DestroyCallback, Class, ProvidedInMetadata } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandlerOptions } from './handlers/configable';


/**
 * Invocation handler
 */
@Abstract()
export abstract class InvocationHandler<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationOptions = InvocationOptions,
    TContext = any> extends AbstractConfigableHandler<TInput, TOutput, TOptions, TContext> {
    /**
     * opteration invoker.
     */
    abstract get invoker(): Invocation;

    /**
     * is this equals to target or not
     * @param target 
     */
    abstract equals(target: any): boolean;
}


/**
 * Invocation Handler factory.
 */
@Abstract()
export abstract class InvocationHanlderFactory<T> implements OnDestroy, Destroyable {

    abstract get invoker(): Invocation<T>;

    abstract create<TArg>(propertyKey: string, options?:  InvocationOptions<TArg>): InvocationHandler;


    destroy(): void {
        this.invoker.destroy();
    }
    get destroyed(): boolean {
        return this.invoker.destroyed;
    }

    onDestroy(callback?: DestroyCallback): void {
        this.invoker.onDestroy(callback);
    }
}

/**
 * Invocation Handler factory resolver.
 */
@Abstract()
export abstract class InvocationHanlderFactoryResolver {
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Invocation<T>): InvocationHanlderFactory<T>;
    /**
     * resolve endpoint factory.
     * @param type factory type
     * @param injector injector
     * @param categare factory categare
     */
    abstract resolve<T>(type: Type<T> | Class<T>): InvocationHanlderFactory<T>;
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
export interface InvocationOptions<T = any> extends ConfigableHandlerOptions<T>, ProvidedInMetadata {
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
