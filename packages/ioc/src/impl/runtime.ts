import { InjectFlags, Token } from '../tokens';
import { AbstractType } from '../types';
import { isFunction, isNil } from '../utils/chk';
import { ClassRef, getClassify } from '../metadata/class';
import { Provider, StaticProvider } from '../providers';
import { EnvironmentInjector, Injector, InjectorScope } from '../injector';
import { Exception } from '../exception';
import { Runtime } from '../runtime';
import { ModuleRef } from '../module.ref';
import { RuntimeHandler } from '../lifescope/handler';
import { Context, ContextToken } from '../handlers/Context';
import { DefaultContext, RunContext } from '../handlers/contexts';
import { INITIALIZE_INTERCEPTORS, instanceHandler } from './initialize';
import { DESIGN_INTERECPTORS } from './design';
import { InvocationFactory } from '../invocation';
import { nonEnumerable } from '../metadata/decor';
import { DefaultResolver, getParameterResolveHanlder } from './resolver';
import { DEFAULTA_RESOLVER } from '../resolver';


/**
 * default runtime implements {@link Runtime}.
 */
export class DefaultRuntime extends DefaultContext implements Runtime {

    @nonEnumerable
    private _initialize?: RuntimeHandler;

    @nonEnumerable
    private _design?: RuntimeHandler;

    constructor(injector: Injector) {
        super()
        this.set(EnvironmentInjector, injector);
        this.set(Runtime, this);
        this.set(INJECTORS, [injector]);
        this.set(DEFAULTA_RESOLVER, new DefaultResolver(getParameterResolveHanlder(this)));
        injector.onDestroy(this);
    }

    getModules(): Map<AbstractType, ModuleRef> {
        return this.get(MODULES);
    }

    getFactories(): Map<AbstractType, InvocationFactory> {
        return this.get(FACTORIES);
    }

    getScopes(): Map<InjectorScope, Injector> {
        return this.get(SCOPES);
    }

    getProviders(): Map<AbstractType, Provider[]> {
        return this.get(PROVIDERS);
    }


    getInstanceHandler(): RuntimeHandler {
        if (!this._initialize) {
            this._initialize = new RuntimeHandler(instanceHandler, INITIALIZE_INTERCEPTORS);
        }
        return this._initialize;
    }

    getRegisterHandler(): RuntimeHandler {
        if (!this._design) {
            this._design = new RuntimeHandler<ClassRef, any, Context>((typeRef) => typeRef, DESIGN_INTERECPTORS);
        }
        return this._design;
    }

    register(injector: Injector, scope?: InjectorScope): void {
        const injectors = this.get(INJECTORS);
        if (injectors.indexOf(injector) < 0) {
            injectors.push(injector);
            injector.onDestroy(() => injectors.splice(injectors.indexOf(injector), 1));
        }
        if(scope) {
            this.get(SCOPES).set(scope, injector);
        }
    }

    /**
     * set value
     * @param token 
     * @param value 
     */
    override set<T>(token: Token<T> | ContextToken<T>, value: T, injector?: Injector): this {
        if (this.map.has(token)) {
            throw new Exception('has value with token:' + token.toString())
        }
        this.map.set(token, value);
        if (injector) injector.onDestroy(() => this.delete(token));
        return this
    }

    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    override get<T>(token: Token<T> | ContextToken<T>): T {
        if (token instanceof ContextToken && !this.map.has(token)) {
            const value = token.defaultValue();
            if (!isNil(value)) this.map.set(token, value);
            return value;
        }
        return this.map.get(token) ?? null;
    }

    removeInjector(scope: InjectorScope): void {
        this.get(SCOPES).delete(scope)
    }

    getRegisterIn(token: Token): Injector | undefined {
        return this.get(INJECTORS).find(r => r.has(token, InjectFlags.Self)) //!!Operator.getTokenProvider(r, token, InjectFlags.Self));
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope?: InjectorScope, defaultInjector?: Injector): T {
        if (!scope) return defaultInjector as T;
        if (scope === 'platform') {
            return this.get<any>(EnvironmentInjector) as T
        }
        return (this.get(SCOPES).get(scope) ?? defaultInjector) as T
    }

    /**
     * get type provider.
     * @param type
     */
    getTypeProvider(type: AbstractType | ClassRef) {
        const tyRef = getClassify(type);
        const pdrs = tyRef.providers.slice(0);
        const pdMap = this.getProviders();
        tyRef.extendTypes.forEach(t => {
            const tpd = pdMap.get(t);
            if (tpd) {
                pdrs.unshift(tpd)
            }
        })
        return pdrs
    }

    /**
     * set type provider.
     * @param type 
     * @param providers 
     */
    setTypeProvider(type: AbstractType | ClassRef, ...providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const pdMap = this.getProviders();
        const prds = pdMap.get(ty);
        if (prds) {
            prds.push(providers)
        } else {
            pdMap.set(ty, providers)
        }
    }

    removeTypeProvider(type: AbstractType | ClassRef, ...providers: Provider[]): void {
        const ty = isFunction(type) ? type : type.type;
        if (!providers.length) {
            this.clearTypeProvider(ty);
            return;
        }
        const prds = this.getProviders().get(ty);
        if (prds) {
            providers.forEach(p => {
                prds.splice(prds.indexOf(p), 1);
            })
        }

    }

    clearTypeProvider(type: AbstractType) {
        this.getProviders().delete(type)
    }

    onDestroy(): void {
        this.getScopes().clear();
        this.getModules().clear();
        this.getFactories().clear();
        this.getProviders().clear();
        super.onDestroy();
    }

}



const INJECTORS = new ContextToken<Injector[]>(() => []);
const SCOPES = new ContextToken<Map<InjectorScope, Injector>>(() => new Map());
const MODULES = new ContextToken<Map<AbstractType, ModuleRef>>(() => new Map());
const FACTORIES = new ContextToken<Map<AbstractType, InvocationFactory>>(() => new Map());
const PROVIDERS = new ContextToken<Map<AbstractType, Provider[]>>(() => new Map());
