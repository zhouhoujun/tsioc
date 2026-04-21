import { Token } from '../tokens';
import { AbstractType } from '../types';
import { ClassRef } from '../metadata/class';
import { Provider, StaticProvider } from '../providers';
import { Injector, InjectorScope } from '../injector';
import { Runtime } from '../runtime';
import { ModuleRef } from '../module.ref';
import { RuntimeHandler } from '../lifescope/handler';
import { ContextToken } from '../context';
import { DefaultContext } from '../handlers/contexts';
import { InvocationFactory } from '../invocation';
/**
 * default runtime implements {@link Runtime}.
 */
export declare class DefaultRuntime extends DefaultContext implements Runtime {
    private _initialize?;
    private _design?;
    constructor(injector: Injector);
    getModules(): Map<AbstractType, ModuleRef>;
    getFactories(): Map<AbstractType, InvocationFactory>;
    getScopes(): Map<InjectorScope, Injector>;
    getProviders(): Map<AbstractType, Provider[]>;
    getInstanceHandler(): RuntimeHandler;
    getRegisterHandler(): RuntimeHandler;
    register(injector: Injector, scope?: InjectorScope): void;
    /**
     * set value
     * @param token
     * @param value
     */
    set<T>(token: Token<T> | ContextToken<T>, value: T, injector?: Injector): this;
    get<T>(token: Token<T> | ContextToken<T>): T;
    removeInjector(scope: InjectorScope): void;
    getRegisterIn(token: Token): Injector | undefined;
    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope?: InjectorScope, defaultInjector?: Injector): T;
    /**
     * get type provider.
     * @param type
     */
    getTypeProvider(type: AbstractType | ClassRef): Provider[];
    /**
     * set type provider.
     * @param type
     * @param providers
     */
    setTypeProvider(type: AbstractType | ClassRef, ...providers: StaticProvider[]): void;
    removeTypeProvider(type: AbstractType | ClassRef, ...providers: Provider[]): void;
    clearTypeProvider(type: AbstractType): void;
    onDestroy(): void;
}
