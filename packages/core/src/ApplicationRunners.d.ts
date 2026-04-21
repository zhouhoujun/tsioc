import { ClassRef, noPointcut, OnDestroy, ProvdierOf, Invocation, AbstractType, InterceptorLike } from '@tsdi/ioc';
import { HandlerAppendService, HandlerOptions } from './handlers/configable';
import { InvocationHandlerOptions } from './invocation';
/**
 * Application runners.
 *
 * 应用程序运行集合
 */
export declare abstract class ApplicationRunners implements HandlerAppendService<AbstractType>, OnDestroy {
    static [noPointcut]: boolean;
    /**
     * runner types size.
     */
    abstract get size(): number;
    /**
     * attach runner
     * @param type
     */
    abstract attach<T>(type: AbstractType<T> | ClassRef<T> | Invocation<T>, options: InvocationHandlerOptions<T>): Invocation<T>;
    /**
     * detach runner
     * @param type
     */
    abstract detach<T>(type: AbstractType<T> | ClassRef<T> | Invocation<T>): void;
    /**
     * has operation or not.
     * @param type
     */
    abstract has<T>(type: AbstractType<T>): boolean;
    /**
     * get Invocation of type.
     * @param type
     */
    abstract getRef<T>(type: AbstractType<T>, idx?: number): Invocation<T>;
    /**
     * get Invocation of type.
     * @param type
     */
    abstract getRefs<T>(type: AbstractType<T>): Invocation<T>[];
    /**
     * run all runners.
     */
    abstract run(type?: AbstractType | AbstractType[]): Promise<void>;
    /**
     * stop all runners.
     */
    abstract stop(): Promise<void>;
    /**
     * use interceptor for this handler.
     * @param inteceptor
     * @param order mutil order
     */
    abstract use(inteceptor: ProvdierOf<InterceptorLike>, order?: number): this;
    /**
     * use interceptor for this handler.
     * @param inteceptors
     */
    abstract use(inteceptors: ProvdierOf<InterceptorLike>[]): this;
    /**
     * use and append hanlder options.
     * @param options
     */
    abstract use(options: HandlerOptions<AbstractType>): this;
    /**
     * destroy.
     */
    abstract onDestroy(): void;
}
