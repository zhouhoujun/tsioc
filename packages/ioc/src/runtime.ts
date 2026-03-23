import { ClassRef } from './metadata/class';
import { OnDestroy } from './destroy';
import { Token } from './tokens';
import { AbstractType } from './types';
import { Provider } from './providers';
import { Injector, InjectorScope } from './injector';
import { ModuleRef } from './module.ref';
import { RuntimeHandler } from './lifescope/handler';
import { Context, ContextToken } from './context';

/**
 * Runtime of {@link Injector}.
 */
export abstract class Runtime implements OnDestroy {
    /**
     * registered modules.
     */
    abstract getModules(): Map<AbstractType, ModuleRef>;

    /**
     * registered injectors.
     */
    abstract getScopes(): Map<InjectorScope, Injector>;

    /**
     * registered providers.
     */
    abstract getProviders(): Map<AbstractType, Provider[]>;

    /**
     * create instance handler.
     */
    abstract getInstanceHandler(): RuntimeHandler<ClassRef, Context>;
    /**
     * register handler.
     */
    abstract getRegisterHandler(): RuntimeHandler<ClassRef, Context>;

    /**
     * register injector.
     * @param token 
     * @param value 
     */
    abstract register(injector: Injector, scope?: InjectorScope): void;
    /**
     * set singleton value
     * @param token 
     * @param value 
     */
    abstract set<T>(token: Token<T> | ContextToken<T>, value: T, injector?: Injector): this;
    /**
     * get singleton instance.
     * @param token 
     */
    abstract get<T>(token: Token<T> | ContextToken<T>): T;
    /**
     * has singleton or not.
     * @param token 
     */
    abstract has(token: Token | ContextToken): boolean;
    /**
     * get token prodider type and the injector the type register in.
     * @param token
     * @returns prodider type and the injector the type register in.
     */
    abstract getRegisterIn(token: Token): Injector | undefined;
    // /**
    //  * set injector scope.
    //  * @param scope 
    //  * @param injector 
    //  */
    // abstract setInjector(scope: InjectorScope, injector: Injector): void;
    /**
     * get injector the type registered in.
     * @param scope
     */
    abstract getInjector<T extends Injector = Injector>(scope?: InjectorScope, defaultInjector?: Injector): T;
    /**
     * remove injector of scope.
     * @param scope 
     */
    abstract removeInjector(scope: InjectorScope): void;
    /**
     * get the type private providers.
     * @param type
     */
    abstract getTypeProvider(type: AbstractType | ClassRef): Provider[];
    /**
     * set type providers.
     * @param type
     * @param providers
     */
    abstract setTypeProvider(type: AbstractType | ClassRef, ...providers: Provider[]): void;
    /**
     * remove type providers.
     * @param type
     * @param providers
     */
    abstract removeTypeProvider(type: AbstractType | ClassRef, ...providers: Provider[]): void;
    /**
     * clear type provider.
     * @param type 
     */
    abstract clearTypeProvider(type: AbstractType): void;
    /**
     * destroy hook.
     */
    abstract onDestroy(): void;
}
