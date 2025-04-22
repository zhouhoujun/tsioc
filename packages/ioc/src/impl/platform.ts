import { InjectFlags, Token } from '../tokens';
import { Type, ClassType } from '../types';
import { isFunction } from '../utils/chk';
import { get } from '../metadata/refl';
import { Class } from '../metadata/type';
import { Provider, StaticProvider } from '../providers';
import { Injector, InjectorScope } from '../injector';
import { Execption } from '../execption';
import { Platform } from '../platform';
import { ModuleRef } from '../module.ref';
import { LifeScope } from '../lifescope/lifescope';
import { Context } from '../handler';
import { RUNTIME_INTERCEPTORS } from '../lifescope/runtime';
import { DESIGN_INTERECPTORS, registerHandler } from '../lifescope/design';

/**
 * default platform implements {@link Platform}.
 */
export class DefaultPlatform implements Platform {

    // private _actions: Map<Token, any>;
    private _singls: Map<Token, any>;
    private _pdrs: Map<Type, Provider[]>;
    private _scopes: Map<string | Type, Injector>;

    readonly modules = new Map<Type, ModuleRef>();
    private injectors: Injector[];
    private _runtime?: LifeScope;
    private _design?: LifeScope;

    readonly context: Context;

    constructor(readonly injector: Injector) {
        this.context = new Context();
        this._scopes = new Map();
        this._pdrs = new Map();
        // this._actions = new Map();
        this._singls = new Map();
        this.injectors = [injector];
        this._singls.set(Platform, this);
        injector.onDestroy(this);
    }


    get runtime(): LifeScope {
        if (!this._runtime) {
            this._runtime = new LifeScope(this, (ctx) => {
                ctx.instance = new ctx.type(...ctx.args || []);
                return ctx.instance;
            }, RUNTIME_INTERCEPTORS);
        }
        return this._runtime;
    }

    get design(): LifeScope {
        if (!this._design) {
            this._design = new LifeScope(this, registerHandler, DESIGN_INTERECPTORS);
        }
        return this._design;
    }

    register(injector: Injector): void {
        if (this.injectors.indexOf(injector) < 0) {
            this.injectors.push(injector);
            injector.onDestroy(() => this.injectors.splice(this.injectors.indexOf(injector), 1));
        }
    }

    /**
     * register singleton value
     * @param token 
     * @param value 
     */
    registerSingleton<T>(injector: Injector, token: Token<T>, value: T): this {
        if (this._singls.has(token)) {
            throw new Execption('has singleton instance with token:' + token.toString())
        }
        this._singls.set(token, value);
        injector.onDestroy(() => this._singls.delete(token));
        return this
    }
    /**
     * get singleton instance.
     * @param token 
     */
    getSingleton<T>(token: Token<T>): T {
        return this._singls.get(token)
    }
    /**
     * has singleton or not.
     * @param token 
     */
    hasSingleton(token: Token): boolean {
        return this._singls.has(token)
    }

    setInjector(scope: Type | string, injector: Injector) {
        this._scopes.set(scope, injector)
    }

    removeInjector(scope: InjectorScope): void {
        this._scopes.delete(scope)
    }

    getRegisterIn(token: Token): [ClassType, Injector] {
        let type: ClassType | undefined;
        const injector = this.injectors.find(r => {
            type = r.getTokenProvider(token, InjectFlags.Self) as ClassType;
            return type !== null;
        })!;
        return [type!, injector];
    }

    /**
     * get injector
     * @param type
     */
    getInjector<T extends Injector = Injector>(scope?: InjectorScope, defaultInjector?: Injector): T {
        if (!scope) return defaultInjector as T;
        if (scope === 'platform') {
            return this.injector as T
        }
        return (this._scopes.get(scope) ?? defaultInjector) as T
    }

    /**
     * get type provider.
     * @param type
     */
    getTypeProvider(type: Type | Class) {
        const tyRef = isFunction(type) ? get(type) : type;
        const pdrs = tyRef.providers.slice(0);
        tyRef.extendTypes.forEach(t => {
            const tpd = this._pdrs.get(t);
            if (tpd) {
                pdrs.unshift(...tpd)
            }
        })
        return pdrs
    }

    /**
     * set type provider.
     * @param type 
     * @param providers 
     */
    setTypeProvider(type: Type | Class, providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const prds = this._pdrs.get(ty);
        if (prds) {
            prds.push(...providers)
        } else {
            this._pdrs.set(ty, providers)
        }
    }

    removeTypeProvider(type: Type | Class, ...providers: Provider[]): void {
        const ty = isFunction(type) ? type : type.type;
        if (!providers.length) {
            this.clearTypeProvider(ty);
            return;
        }
        const prds = this._pdrs.get(ty);
        if (prds) {
            providers.forEach(p => {
                prds.splice(prds.indexOf(p), 1);
            })
        }

    }

    clearTypeProvider(type: Type) {
        this._pdrs.delete(type)
    }

    onDestroy(): void {
        this._scopes.clear();
        this.modules.clear();
        this._pdrs.clear();
        this._singls.clear()
        this.context.onDestroy();
        this.injectors = [];
    }

}
