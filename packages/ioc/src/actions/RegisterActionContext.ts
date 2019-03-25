import { Type, Token } from '../types';
import { IocActionContext, ActionContextOption } from './Action';
import { ITypeReflect } from '../services';
import { IIocContainer } from '../IIocContainer';
import { DecoratorType } from '../factories';

/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RegisterActionOption extends ActionContextOption {
    /**
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token<any>;
    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof RegisterActionContext
     */
    targetType: Type<any>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof IocActionContext
     */
    singleton?: boolean;

}

/**
 * Ioc Register action context.
 *
 * @export
 * @class RegisterActionContext
 * @extends {IocActionContext}
 */
export class RegisterActionContext extends IocActionContext {

    /**
     * decors has execute ation.
     *
     * @type {string[]}
     * @memberof DesignActionContext
     */
    classDecors: Map<string, boolean>;

    /**
     * props decors.
     *
     * @type {Map<string, boolean>}
     * @memberof RegisterActionContext
     */
    propsDecors: Map<string, boolean>;

    /**
     * method decors.
     *
     * @type {Map<string, boolean>}
     * @memberof RegisterActionContext
     */
    methodDecors: Map<string, boolean>;

    /**
     * param decors.
     *
     * @type {Map<string, boolean>}
     * @memberof RegisterActionContext
     */
    paramDecors: Map<string, boolean>;

    /**
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token<any>;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof RegisterActionContext
     */
    targetType?: Type<any>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    currDecoractor?: string;
    currDecorType?: DecoratorType;

    constructor(targetType: Type<any>, raiseContainer?: IIocContainer | (() => IIocContainer)) {
        super(raiseContainer);
        this.targetType = targetType;
    }

    /**
     * create register context.
     *
     * @static
     * @param {RegisterActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(options: RegisterActionOption, raiseContainer?: IIocContainer | (() => IIocContainer)): RegisterActionContext {
        let ctx = new RegisterActionContext(options.targetType, raiseContainer);
        ctx.setOptions(options);
        return ctx;
    }

    setOptions(options: RegisterActionOption) {
        super.setOptions(options);
    }

    isClassCompleted() {
        if (this.classDecors) {
            return !Array.from(this.classDecors.values()).some(inj => !inj);
        }
        return false;
    }

    isPropertyCompleted() {
        if (this.propsDecors) {
            return !Array.from(this.propsDecors.values()).some(inj => !inj);
        }
        return false;
    }

    isMethodCompleted() {
        if (this.methodDecors) {
            return !Array.from(this.methodDecors.values()).some(inj => !inj);
        }
        return false;
    }

    isParameterCompleted() {
        if (this.paramDecors) {
            return !Array.from(this.paramDecors.values()).some(inj => !inj);
        }
        return false;
    }


}
