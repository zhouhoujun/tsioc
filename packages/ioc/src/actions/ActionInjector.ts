import { Token, Type } from '../types';
import { IActionSetup, Action, IActionInjector } from './Action';
import { isFunction, lang } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { Injector } from '../Injector';

export class ActionInjector extends Injector implements IActionInjector {

    regAction<T extends Action>(type: Type<T>): this {
        if (this.hasTokenKey(type)) {
            return;
        }

        if (lang.isExtendsClass(type, Action)) {
            this.registerAction(type);
            let instance = this.getInstance(type) as T & IActionSetup;
            if (instance instanceof Action && isFunction(instance.setup)) {
                instance.setup();
            }
        }
        return this;
    }

    protected registerAction(type: Type<Action>) {
        let instance = new type(this);
        this.set(type, () => instance);
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

