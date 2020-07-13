import { IocAction, IocPdrsContext, IocPdrsOption } from './IocAction';
import { Type, Token, DecoratorScope } from '../types';
import { ITypeReflect } from '../services/ITypeReflect';
import { CTX_CURR_DECOR, CTX_TARGET_RELF, CTX_TOKEN, CTX_TYPE, CTX_SINGLETON, CTX_CURR_DECOR_SCOPE } from '../context-tokens';
import { isClass, Handler, isArray, isString } from '../utils/lang';
import { IocCompositeAction } from './IocAction';
import { IActionInjector, Action } from './Action';
import { IocCoreService } from '../IocCoreService';
import { Registration } from '../Registration';


/**
 * register action option.
 *
 * @export
 * @interface RegOption
 */
export interface RegOption extends IocPdrsOption {
    /**
     * resolve token.
     */
    token?: Token;
    /**
     * target type.
     */
    type: Type;

    /**
     * custom set singleton or not.
     */
    singleton?: boolean;

}


/**
 * Ioc Register action context.
 *
 * @export
 * @class RegContext
 * @extends {IocActionContext}
 */
export class RegContext<T extends RegOption = RegOption> extends IocPdrsContext<T> {
    /**
     * resolve token.
     *
     */
    get token(): Token {
        return this.getValue(CTX_TOKEN);
    }

    /**
     * target type.
     *
     */
    get type(): Type {
        return this.getValue(CTX_TYPE);
    }

    get currDecoractor(): string {
        return this.getValue(CTX_CURR_DECOR);
    }

    /**
     * custom set singleton or not.
     *
     */
    get singleton(): boolean {
        return this.getValue(CTX_SINGLETON) === true;
    }

    get targetReflect(): ITypeReflect {
        return this.getValue(CTX_TARGET_RELF) ?? this.getTargetReflect();
    }

    protected getTargetReflect() {
        let refl = this.reflects.get(this.type);
        refl && this.context.setValue(CTX_TARGET_RELF, refl);
        return refl;
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.token) {
            this.setValue(CTX_TOKEN, options.token);
        }

        if (options.type) {
            this.setValue(CTX_TYPE, options.type);
        }
        if (options.singleton) {
            this.setValue(CTX_SINGLETON, options.singleton);
        }
        return super.setOptions(options);
    }
}


/**
 * ioc register action.
 *
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 */
export abstract class IocRegAction<T extends RegContext> extends IocAction<T> {

}


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocCompositeAction<T> {

}



/**
 * decorator action registerer.
 *
 */
export abstract class DecorRegisterer<TAction extends Function = Handler> extends IocCoreService {
    protected actionMap: Map<string, (TAction | Type<Action>)[]>;
    protected funcs: Map<string, TAction[]>;
    constructor() {
        super();
        this.actionMap = new Map();
        this.funcs = new Map();
    }

    get size(): number {
        return this.actionMap.size;
    }

    getActions(): Map<string, (TAction | Type<Action>)[]> {
        return this.actionMap;
    }

    getDecorators(): string[] {
        return Array.from(this.actionMap.keys());
    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...Type<Action>[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, ...actions: (TAction | Type<Action>)[]): this {
        this.registing(decorator, actions, (regs, dec) => {
            regs.push(...actions);
            this.actionMap.set(dec, regs);
        });
        return this;
    }

    /**
     * register decorator actions before the action.
     *
     * @param {(string | Function)} decorator
     * @param {TAction | Type<Action>} before
     * @param {...(TAction | Type<Action>)[]} actions
     * @returns {this}
     * @memberof DecoratorRegisterer
     */
    registerBefore(decorator: string | Function, before: TAction | Type<Action>, ...actions: (TAction | Type<Action>)[]): this {
        this.registing(decorator, actions, (regs, dec) => {
            if (before && regs.indexOf(before) > 0) {
                regs.splice(regs.indexOf(before), 0, ...actions);
            } else {
                regs.unshift(...actions);
            }
            this.actionMap.set(dec, regs);
        });
        return this;
    }

    /**
     * register decorator actions after the action.
     *
     * @param {(string | Function)} decorator
     * @param {Type<Action>} after
     * @param {...Type<Action>[]} actions
     * @returns {this}
     * @memberof DecoratorRegisterer
     */
    registerAfter(decorator: string | Function, after: TAction | Type<Action>, ...actions: (TAction | Type<Action>)[]): this {
        this.registing(decorator, actions, (regs, dec) => {
            if (after && regs.indexOf(after) >= 0) {
                regs.splice(regs.indexOf(after) + 1, 0, ...actions);
            } else {
                regs.push(...actions);
            }
            this.actionMap.set(dec, regs);
        });
        return this;
    }

    protected registing(decorator: string | Function, actions: (TAction | Type<Action>)[], reg: (regs: (TAction | Type<Action>)[], dec: string) => void) {
        let dec = this.getKey(decorator);
        this.funcs.delete(dec);
        if (this.actionMap.has(dec)) {
            reg(this.actionMap.get(dec), dec);
        } else {
            this.actionMap.set(dec, actions);
        }
    }

    has(decorator: string | Function, action?: TAction | Type<Action>): boolean {
        let dec = this.getKey(decorator);
        let has = this.actionMap.has(dec);
        if (has && action) {
            return this.actionMap.get(dec).indexOf(action) >= 0;
        }
        return has;
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get<T extends Action>(decorator: string | Function): Type<T>[] {
        return this.actionMap.get(this.getKey(decorator)) as Type<T>[] || [];
    }


    getFuncs(register: IActionInjector, decorator: string | Function): TAction[] {
        let dec = this.getKey(decorator);
        if (!this.funcs.has(dec)) {
            this.funcs.set(dec, this.get(dec).map(a => register.getAction<TAction>(a)).filter(c => c));
        }
        return this.funcs.get(dec) || [];
    }
}



export interface IScopeAction<TAction extends Function = Handler> {
    scope: DecoratorScope;
    action: TAction | Type<Action> | (TAction | Type<Action>)[];
}

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 */
export abstract class DecorsRegisterer<TAction extends Function = Handler> extends IocCoreService {
    protected map: Map<Token, any>;
    constructor(protected registerer: IActionInjector) {
        super()
        this.map = new Map();
    }

    register(decorator: string | Function, ...actions: IScopeAction<TAction>[]): this;
    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...T[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, scope: DecoratorScope, ...actions: (TAction | Type<Action>)[]): this;
    register(decorator: string | Function, scope?: any, ...actions): this {
        if (isString(scope)) {
            this.getRegisterer(scope as DecoratorScope)
                .register(decorator, ...actions);
        } else {
            actions.unshift(scope);
            let scopes: IScopeAction<TAction>[] = actions as IScopeAction<TAction>[];
            scopes.forEach(s => {
                this.getRegisterer(s.scope)
                    .register(decorator, ...(isArray(s.action) ? s.action : [s.action]));
            });
        }
        return this;
    }


    has(decorator: string | Function, scope: DecoratorScope, action?: TAction | Type<Action>): boolean {
        return this.getRegisterer(scope).has(decorator, action);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get<T extends Action>(decorator: string | Function, scope: DecoratorScope): Type<T>[] {
        return this.getRegisterer(scope).get<T>(decorator) || [];
    }

    getFuncs(register: IActionInjector, decorator: string | Function, scope: DecoratorScope): TAction[] {
        return this.getRegisterer(scope).getFuncs(register, decorator);
    }

    setRegisterer(scope: DecoratorScope, registerer: DecorRegisterer<TAction>) {
        let rg = this.getRegistration(scope);
        this.map.set(rg, registerer);
    }

    getRegisterer(scope: DecoratorScope): DecorRegisterer<TAction> {
        let rg = this.getRegistration(scope);
        if (!this.map.has(rg)) {
            this.map.set(rg, this.createRegister());
        }
        return this.map.get(rg);
    }

    protected abstract createRegister(): DecorRegisterer<TAction>;

    protected getRegistration(scope: DecoratorScope): string {
        return new Registration(DecorRegisterer, this.getScopeKey(scope)).toString();
    }

    protected getScopeKey(scope: DecoratorScope): string {
        return scope.toString();
    }

}

/**
 * design decorator register.
 *
 * @export
 * @class DesignRegisterer
 * @extends {DecorsRegisterer}
 */
export class DesignRegisterer extends DecorsRegisterer {
    protected createRegister(): DecorRegisterer {
        return new IocDecorRegisterer() as DecorRegisterer;
    }
}

/**
 * runtiem decorator registerer.
 *
 * @export
 * @class RuntimeRegisterer
 * @extends {DecorsRegisterer}
 */
export class RuntimeRegisterer extends DecorsRegisterer {
    protected createRegister(): DecorRegisterer {
        return new IocDecorRegisterer() as DecorRegisterer;
    }
}



/**
 * ioc decorator registerer.
 */
export class IocDecorRegisterer<T extends Function = Handler> extends DecorRegisterer<T> {

}


/**
 * execute decorator action.
 *
 * @export
 * @class ExecDecoratorAtion
 * @extends {IocAction<RegContext>}
 */
export abstract class ExecDecoratorAtion extends IocRegAction<RegContext> {

    constructor(protected actInjector: IActionInjector) {
        super();
    }

    execute(ctx: RegContext, next?: () => void): void {
        if (ctx.hasValue(CTX_CURR_DECOR)) {
            let decor = this.getScopeRegisterer();
            let currDec = ctx.getValue(CTX_CURR_DECOR);
            let currScope = ctx.getValue(CTX_CURR_DECOR_SCOPE);
            if (decor.has(currDec, currScope)) {
                let actions = decor.getFuncs(this.actInjector, currDec, currScope);
                this.execFuncs(ctx, actions);
            }
        }
        next && next();
    }
    protected abstract getScopeRegisterer(): DecorsRegisterer;
}


export abstract class IocDecorScope<T extends RegContext> extends IocCompositeAction<T> {
    execute(ctx: T, next?: () => void): void {
        this.getDecorators(ctx)
            .forEach(dec => {
                ctx.setValue(CTX_CURR_DECOR, dec);
                ctx.setValue(CTX_CURR_DECOR_SCOPE, this.getDecorScope());
                super.execute(ctx);
            });
        next && next();
    }

    protected getDecorators(ctx: T): string[] {
        let scope = this.getDecorScope();
        return this.getScopeDecorators(ctx, scope);
    }

    protected abstract getScopeDecorators(ctx: T, scope: DecoratorScope): string[]

    protected abstract getDecorScope(): DecoratorScope;
}


export const InitReflectAction = function (ctx: RegContext, next?: () => void): void {
    if (!isClass(ctx.type)) {
        return;
    }
    ctx.reflects.create(ctx.type);
    let targetReflect = ctx.targetReflect;
    if (ctx.singleton) {
        targetReflect.singleton = ctx.singleton;
    }

    if (next) {
        return next();
    }
}
