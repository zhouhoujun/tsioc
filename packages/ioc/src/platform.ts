import { Abstract } from './metadata/fac';
import { Handle } from './handle';
import { Action } from './action';
import { OnDestroy } from './destroy';
import { Injector, InjectorScope } from './injector';
import { Token } from './tokens';
import { ClassType, Type } from './types';
import { Class } from './metadata/type';
import { ProviderType } from './providers';
import { ModuleRef } from './module.ref';


/**
 * platform of {@link Container}.
 */
@Abstract()
export abstract class Platform implements OnDestroy {
    /**
     * registered modules.
     */
    abstract get modules(): Map<Type, ModuleRef>;
    /*
     * platform injector.
     */
    abstract get injector(): Injector;
    /**
     * set singleton value
     * @param token 
     * @param value 
     */
    abstract registerSingleton<T>(injector: Injector, token: Token<T>, value: T): this;
    /**
     * get singleton instance.
     * @param token 
     */
    abstract getSingleton<T>(token: Token<T>): T;
    /**
     * has singleton or not.
     * @param token 
     */
    abstract hasSingleton(token: Token): boolean;
    /**
     * set injector scope.
     * @param scope 
     * @param injector 
     */
    abstract setInjector(scope: InjectorScope, injector: Injector): void;
    /**
     * get injector the type registered in.
     * @param scope
     */
    abstract getInjector(scope: InjectorScope): Injector;
    /**
     * remove injector of scope.
     * @param scope 
     */
    abstract removeInjector(scope: InjectorScope): void;
    /**
     * get the type private providers.
     * @param type
     */
    abstract getTypeProvider(type: ClassType | Class): ProviderType[];
    /**
     * set type providers.
     * @param type
     * @param providers
     */
    abstract setTypeProvider(type: ClassType | Class, providers: ProviderType[]): void;
    /**
     * clear type provider.
     * @param type 
     */
    abstract clearTypeProvider(type: ClassType): void;
    /**
    * register action, simple create instance via `new type(this)`.
    * @param types
    */
    abstract registerAction(...types: Type<Action>[]): this;
    /**
     * has action.
     * @param token action token.
     */
    abstract hasAction(token: Token): boolean;
    /**
     * get action instace in current .
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    abstract getAction<T>(token: Token<T>, notFoundValue?: T): T
    /**
     * get action handle.
     * @param target target.
     */
    abstract getHandle<T extends Handle>(target: Token<Action>): T;
    /**
     * set value.
     * @param token 
     * @param value 
     * @param provider 
     */
    abstract setActionValue<T>(token: Token<T>, value: T, provider?: Type<T>): this;
    abstract getActionValue<T>(token: Token<T>, notFoundValue?: T): T;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
}
