import { Action, IActionSetup } from '../action';
import { ActionProvider, Injector, ProviderType } from '../injector';
import { Token } from '../tokens';
import { Type } from '../types';
import { isFunction } from '../utils/chk';
import { Handler } from '../utils/hdl';
import { isBaseOf } from '../utils/lang';
import { DefaultInjector } from './injector';


/**
 * action injector.
 */
export class ActionProviderImpl extends DefaultInjector implements ActionProvider {

    constructor(providers: ProviderType[], parent: Injector) {
        super(providers, parent, 'provider');
    }

    protected override initParent(parent: Injector) {

    }

    /**
     * get token factory resolve instace in current BaseInjector.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Injector} provider
     * @returns {T}
     */
    override get<T>(key: Token<T>, notFoundValue?: T): T {
        if (isFunction(key) && !this.has(key)) {
            this.registerAction(key as Type);
        }
        return super.get(key, notFoundValue);
    }

    regAction(...types: Type<Action>[]): this {
        types.forEach(type => {
            if (this.has(type)) return;
            this.registerAction(type);
        });
        return this;
    }

    protected override regType<T>(target: Type<T>) {
        if (isBaseOf(target, Action)) {
            this.registerAction(target);
            return;
        }
        super.regType(target);
    }

    getAction<T extends Handler>(target: Token<Action>): T {
        return this.get(target)?.toHandler() as T ?? null;
    }

    protected registerAction(type: Type<Action>) {
        if (this.has(type)) return true;
        const instance = new type(this) as Action & IActionSetup;

        this.setValue(type, instance);
        if (isFunction(instance.setup)) instance.setup();
    }
}
