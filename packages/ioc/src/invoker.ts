import { Injector, MethodType, ProviderType } from './injector';
import { Abstract } from './metadata/fac';
import { Token } from './tokens';
import { Type } from './types';


/**
 * execution, invoke some type method.
 */
@Abstract()
export abstract class Invoker {
    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | T)} target
     * @param {MethodType} propertyKey
     * @param {ProviderType[]} providers
     * @returns {TR}
     */
    abstract invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, providers?: ProviderType[]): TR;
    /**
     * create params instances with IParameter and provider of target type.
     *
     * @param { Injector } injector
     * @param {Type} target target type.
     * @param {string} propertyKey
     * @param {ProviderType[]} providers
     * @returns {any[]}
     */
    abstract createParams(injector: Injector, target: Type, propertyKey: string, providers?: ProviderType[]): any[];

}



export interface InvocationContext {
    // getArguments(): 
}

export interface OperationInvoker {
    invoke(ctx: InvocationContext): any;
}


export interface ReflenceInvoker<T> {
    get type(): Type<T>;
    invoke<TR>(propertyKey: MethodType<T>, providers?: ProviderType[]): TR;
}

// @Abstract()
// export abstract class InvokerFactory<T> {
//     /**
//      * service type.
//      */
//     abstract get type(): Type<T>;
//     abstract create<T>(injector: Injector, providers: ProviderType[]): OperationInvoker<T>;
// }

@Abstract()
export abstract class InvokerFactoryResolver {
    abstract resolve<T>(type: Type<T> | T): ReflenceInvoker<T>;
}

