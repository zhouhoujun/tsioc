import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { lang } from '../utils';
import { Type } from '../types';
/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 * @export
 * @abstract
 * @class IocRegisterScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export abstract class IocRegisterScope<T extends RegisterActionContext> extends IocCompositeAction<T> {
    abstract setup();

    protected registerAction(action: Type<any>) {
        if (lang.isExtendsClass(action, IocRegisterScope)) {
            this.container.registerSingleton(action, () => new action(this.container));
            this.container.get<IocRegisterScope<any>>(action).setup();
        } else {
            super.registerAction(action);
        }
    }
}
