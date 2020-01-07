import { Token, Type } from '../types';
import { IActionSetup, Action, IActionInjector } from './Action';
import { isFunction, lang } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Injector } from '../Injector';

export class ActionInjector extends Injector implements IActionInjector {

    regAction<T extends Action>(type: Type<T>): this {
        if (this.hasTokenKey(type)) {
            return this;
        }
        this.registerAction(type);
        return this;
    }

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        if (!provide && this.registerAction(type)) {;
            return this;
        }
        this.getContainer().registerIn(this, type, provide, singleton);
        return this;
    }

    protected registerAction(type: Type) {
        if (lang.isExtendsClass(type, Action)) {
            if (this.hasTokenKey(type)) {
                return true;
            }

            let instance = new type(this) as Action & IActionSetup;
            this.set(type, () => instance);
            if (instance instanceof Action && isFunction(instance.setup)) {
                instance.setup();
            }
            return true;
        }
        return false;
    }

    getAction<T extends Function>(target: Token<Action> | Action | Function): T {
        if (target instanceof Action) {
            return target.toAction() as T;
        } else if (isToken(target)) {
            let act = this.get(target);
            return act ? act.toAction() as T : null;
        } else if (isFunction(target)) {
            return target as T
        }
        return null;
    }
}

