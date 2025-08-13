import { InjectFlags, Token } from '../tokens';
import { AbstractType, Empty } from '../types';
import { isFunction } from '../utils/chk';
import { getClassify } from '../metadata/refl';
import { Class } from '../metadata/class';
import { Provider, StaticProvider } from '../providers';
import { Injector, InjectorScope } from '../injector';
import { Exception } from '../exception';
import { Platform } from '../platform';
import { ModuleRef } from '../module.ref';
import { HandlerScope } from '../lifescope/lifescope';
import { Context } from '../handler';
import { RUNTIME_INTERCEPTORS } from '../lifescope/runtime';
import { DESIGN_INTERECPTORS, registerHandler } from '../lifescope/design';
import { InvocationFactory } from '../invocation';

/**
 * default platform implements {@link Platform}.
 */
export class DefaultPlatform implements Platform {

    private _singls: Map<Token, any>;
    private _pdrs: Map<AbstractType, Provider[]>;
    private _scopes: Map<string | AbstractType, Injector>;

    readonly modules = new Map<AbstractType, ModuleRef>();
    readonly factories = new Map<AbstractType, InvocationFactory>();
    private injectors: Injector[];
    private _runtime?: HandlerScope;
    private _design?: HandlerScope;

    readonly context: Context;

    constructor(readonly injector: Injector) {
        this.context = new Context();
        this._scopes = new Map();
        this._pdrs = new Map();
        this._singls = new Map();
        this.injectors = [injector];
        this._singls.set(Platform, this);
        injector.onDestroy(this);
    }


    get runtime(): HandlerScope {
        if (!this._runtime) {
            this._runtime = new HandlerScope(this, (ctx) => {
                ctx.instance = new ctx.type(...ctx.args || Empty);
                return ctx.instance;
            }, RUNTIME_INTERCEPTORS);
        }
        return this._runtime;
    }

    get design(): HandlerScope {
        if (!this._design) {
            this._design = new HandlerScope(this, registerHandler, DESIGN_INTERECPTORS);
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
    setSingleton<T>(injector: Injector, token: Token<T>, value: T): this {
        if (this._singls.has(token)) {
            throw new Exception('has singleton instance with token:' + token.toString())
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

    setInjector(scope: AbstractType | string, injector: Injector) {
        this._scopes.set(scope, injector)
    }

    removeInjector(scope: InjectorScope): void {
        this._scopes.delete(scope)
    }

    getRegisterIn(token: Token): Injector | undefined {
        return this.injectors.find(r => !!r.getTokenProvider(token, InjectFlags.Self));
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
    getTypeProvider(type: AbstractType | Class) {
        const tyRef = getClassify(type);
        const pdrs = tyRef.providers.slice(0);
        tyRef.extendTypes.forEach(t => {
            const tpd = this._pdrs.get(t);
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
    setTypeProvider(type: AbstractType | Class, ...providers: StaticProvider[]) {
        const ty = isFunction(type) ? type : type.type;
        const prds = this._pdrs.get(ty);
        if (prds) {
            prds.push(providers)
        } else {
            this._pdrs.set(ty, providers)
        }
    }

    removeTypeProvider(type: AbstractType | Class, ...providers: Provider[]): void {
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

    clearTypeProvider(type: AbstractType) {
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
