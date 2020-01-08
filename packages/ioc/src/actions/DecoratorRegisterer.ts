import { isString, lang } from '../utils/lang';
import { Action, IActionInjector } from './Action';
import { IocCoreService } from '../IocCoreService';
import { Type } from '../types';

/**
 * decorator action registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {IocCoreService}
 */
export abstract class DecoratorRegisterer<TAction extends Function = lang.Action> extends IocCoreService {
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

/**
 * ioc decorator registerer.
 *
 * @export
 * @class IocDecoratorRegisterer
 * @extends {DecoratorRegisterer<T>}
 * @template T
 */
export class IocDecoratorRegisterer<T extends Function = lang.Action> extends DecoratorRegisterer<T> {

}
