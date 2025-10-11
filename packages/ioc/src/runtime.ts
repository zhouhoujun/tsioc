import { Abstract } from './metadata/fac';
import { ClassRef } from './metadata/class';
import { OnDestroy } from './destroy';
import { Token } from './tokens';
import { AbstractType } from './types';
import { Provider } from './providers';
import { Injector, InjectorScope } from './injector';
import { ModuleRef } from './module.ref';
import { HandlerScope } from './lifescope/lifescope';
import { Context } from './handler';

/**
 * Runtime of {@link Injector}.
 */
@Abstract()
export abstract class Runtime implements OnDestroy {
    /**
     * registered modules.
     */
    abstract get modules(): Map<AbstractType, ModuleRef>;
    /*
     * platform injector.
     */
    abstract get injector(): Injector;

    abstract get initialize(): HandlerScope;
    abstract get design(): HandlerScope;

    abstract get context(): Context;

    /**
     * register injector.
     * @param token 
     * @param value 
     */
    abstract register(injector: Injector): void;
    /**
     * set singleton value
     * @param token 
     * @param value 
     */
    abstract setSingleton<T>(injector: Injector, token: Token<T>, value: T): this;
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
     * get token prodider type and the injector the type register in.
     * @param token
     * @returns prodider type and the injector the type register in.
     */
    abstract getRegisterIn(token: Token): Injector | undefined;
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
