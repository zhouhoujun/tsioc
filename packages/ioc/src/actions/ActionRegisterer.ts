import { Token, Factory, Type } from '../types';
import { IIocContainer, ContainerFactory } from '../IIocContainer';
import { IActionSetup, Action, IActionInjector } from './Action';
import { BaseInjector } from '../BaseInjector';
import { isFunction, isUndefined, lang } from '../utils/lang';
import { isToken } from '../utils/isToken';

export class ActionRegisterer extends BaseInjector implements IActionInjector {
    constructor(private factory: ContainerFactory) {
        super();
    }

    getFactory<T extends IIocContainer>(): ContainerFactory<T> {
        return this.factory as ContainerFactory<T>;
    }

    register<T>(token: Token<T>, value?: Factory<T>): this {
        let key = this.getTokenKey(token);
        if (this.hasTokenKey(key)) {
            return;
        }

        if (isUndefined(value) && lang.isExtendsClass(token, Action)) {
            this.registerAction(token as Type);
        } else {
            this.factory().registerFactory(this, token, value);
        }

        let instance = this.getInstance(key) as T & IActionSetup;
        if (instance instanceof Action && isFunction(instance.setup)) {
            instance.setup();
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

// /**
//  * action registerer.
//  *
//  * @export
//  * @class ActionRegisterer
//  */
// export class ActionRegisterer1 extends IocCoreService {
//     private maps: Map<Type, any>;

//     constructor(private container: IIocContainer) {
//         super()
//         this.maps = new Map();
//     }

//     /**
//      * has action type or not.
//      *
//      * @param {Type<T>} type
//      * @returns {boolean}
//      * @memberof ActionRegisterer
//      */
//     has<T>(type: Type<T>): boolean {
//         return this.maps.has(type);
//     }

//     /**
//      * get action of type.
//      *
//      * @template T
//      * @param {Type<T>} type
//      * @returns {T}
//      * @memberof ActionRegisterer
//      */
//     get<T>(type: Type<T>): T {
//         return this.maps.get(type) as T || null;
//     }

//     /**
//      * register action.
//      *
//      * @param {Type<T>} action
//      * @param {boolean} [setup]
//      * @returns {this}
//      * @memberof ActionRegisterer
//      */
//     register<T>(action: Type<T>): this {
//         if (this.maps.has(action)) {
//             return this;
//         }
//         let instance = new action() as T & IActionSetup;
//         this.maps.set(action, instance);
//         if (setup) {
//             this.setup(instance);
//         }
//         return this;
//     }

//     protected setup(action: IActionSetup) {
//         if (isFunction(action.setup)) {
//             action.setup(this.container);
//         }
//     }
// }
