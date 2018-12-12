import { MethodMetadata, ActionComponent, ActionData, DecoratorType } from './core';
import { Type, Express } from './types';
import { IParameter } from './IParameter';
import { InjectToken } from './InjectToken';

/**
 * Decorator summary.
 *
 * @export
 * @interface DecorSummary
 */
export interface DecorSummary {
    /**
     * decorator name.
     *
     * @type {string}
     * @memberof DecorSummary
     */
    name: string;
    /**
     * decorator types.
     *
     * @type {string}
     * @memberof DecorSummary
     */
    types: string;
    /**
     * decorator registed actions.
     *
     * @type {string[]}
     * @memberof DecorSummary
     */
    actions: string[];
}

/**
 * life scope interface symbol.
 * it is a symbol id, you can register yourself MethodAccessor for this.
 */
export const LifeScopeToken = new InjectToken<LifeScope>('DI_LifeScope');

/**
 * life scope of decorator.
 *
 * @export
 * @interface LifeScope
 */
export interface LifeScope {
    /**
     * execute the action work.
     *
     * @template T
     * @param {ActionData<T>} data execute data;
     * @param {string} names execute action name.
     * @memberof ActionComponent
     */
    execute<T>(data: ActionData<T>, ...names: string[]);

    /**
     * execute the action work route with parent container.
     *
     * @template T
     * @param {ActionData<T>} data
     * @param {...string[]} names
     * @memberof LifeScope
     */
    routeExecute<T>(data: ActionData<T>, ...names: string[]);

    /**
     * register action.
     *
     * @param {ActionComponent} action the action.
     * @param {...string[]} express the path  of action point to add the action.
     * @returns {this}
     * @memberof LifeScope
     */
    addAction(action: ActionComponent, ...nodepaths: string[]): this;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {...string[]} actions action names.
     * @returns {this}
     * @memberof LifeScope
     */
    registerDecorator(decorator: Function, ...actions: string[]): this;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {DecoratorType} type  custom set decorator type.
     * @param {...string[]} actions action names.
     * @returns {this}
     * @memberof LifeScope
     */
    registerCustomDecorator(decorator: Function, type: DecoratorType, ...actions: string[]): this;

    /**
     * filter match decorators.
     *
     * @param {Express<DecorSummary, boolean>} express
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    filerDecorators(express: Express<DecorSummary, boolean>): DecorSummary[];


    /**
     * get class decorators
     *
     * @param {Type<any>} type
     * @param {Express<DecorSummary, boolean>} [match]
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    getClassDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[];

    /**
     * get method decorators
     *
     * @param {Type<any>} type
     * @param {Express<DecorSummary, boolean>} [match]
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    getMethodDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[];

    /**
     * get property decorators
     *
     * @param {Type<any>} type
     * @param {Express<DecorSummary, boolean>} [match]
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    getPropertyDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[];

    /**
     * get parameter decorators
     *
     * @param {Type<any>} type
     * @param {string} propertyKey
     * @param {Express<DecorSummary, boolean>} [match]
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    getParameterDecorators(target: any, propertyKey: string, match?: Express<DecorSummary, boolean>): DecorSummary[];


    /**
     * get decorator type.
     *
     * @param {*} decorator
     * @returns {DecoratorType}
     * @memberof LifeScope
     */
    getDecoratorType(decorator: any): DecoratorType;

    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {any} target
     * @returns {boolean}
     * @memberof LifeScope
     */
    isVaildDependence<T>(target: any): boolean;

    /**
     * is singleton or not.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {boolean}
     * @memberof LifeScope
     */
    isSingletonType<T>(type: Type<T>): boolean;

    /**
     * get action by name.
     *
     * @param {string} name
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getAtionByName(name: string): ActionComponent;

    /**
     * get class action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getClassAction(): ActionComponent;

    /**
     * get method action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getMethodAction(): ActionComponent;

    /**
     * get propert action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getPropertyAction(): ActionComponent;

    /**
     * get parameter action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getParameterAction(): ActionComponent;

    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames<T>(type: Type<T>, propertyKey: string): string[];

    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(type: Type<T>): IParameter[];

    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string): IParameter[];


    /**
     * get method metadatas
     *
     * @template T
     * @param {Type<T>} type
     * @param {(string | symbol)} propertyKey
     * @returns {MethodMetadata[]}
     * @memberof LifeScope
     */
    getMethodMetadatas<T>(type: Type<T>, propertyKey: string | symbol): MethodMetadata[];

    /**
     * convert decorator type to action name.
     *
     * @param {DecoratorType} type
     * @returns {string}
     * @memberof LifeScope
     */
    toActionName(type: DecoratorType): string;
}
