import { Type } from '../types';
import { Handler, isFunction, lang } from '../utils/lang';
import { Token, isToken } from '../tokens';
import { IActionSetup, Action } from '../Action';
import { Injector } from '../Injector';
import { IActionInjector } from './act';

/**
 * action injector.
 */
export class ActionInjector extends Injector implements IActionInjector {

    regAction<T extends Action>(type: Type<T>): this {
        if (this.hasTokenKey(type)) {
            return this;
        }
        this.registerAction(type);
        return this;
    }

    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this {
        if (!provide && this.registerAction(type)) {
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
            let instance = this.setupAction(type) as Action & IActionSetup;
            if (instance instanceof Action && isFunction(instance.setup)) {
                instance.setup();
            }
            return true;
        }
        return false;
    }

    protected setupAction(type: Type<Action>): Action {
        let instance = new type(this);
        this.setValue(type, instance);
        return instance;
    }

    getAction<T extends Handler>(target: Token<Action> | Action | Function): T {
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

