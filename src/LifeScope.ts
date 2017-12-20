import { Metadate, ProviderMetadata, ActionComponent, ActionData, DecoratorType } from './core';
import { Type } from './Type';
import { Token, Express } from './types';
import { IParameter } from './IParameter';

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
     * @param {DecoratorType} type action for decorator type.
     * @param {ActionData<T>} data execute data;
     * @param {string} names execute action name.
     * @memberof ActionComponent
     */
    execute<T>(type: DecoratorType, data: ActionData<T>, ...names: string[]);

    /**
     * register action.
     *
     * @param {ActionComponent} action the action.
     * @param {DecoratorType} type action for decorator type.
     * @param {...string[]} express the path  of action point to add the action.
     * @returns {LifeScope}
     * @memberof LifeScope
     */
    addAction(action: ActionComponent, type: DecoratorType, ...nodepaths: string[]): LifeScope;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {...string[]} actions action names.
     * @memberof LifeScope
     */
    registerDecorator(decorator: Function, ...actions: string[]): LifeScope;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {DecoratorType} type  custom set decorator type.
     * @param {...string[]} actions action names.
     * @memberof LifeScope
     */
    registerCustomDecorator(decorator: Function, type: DecoratorType, ...actions: string[]): LifeScope;

    /**
     * filter match decorators.
     *
     * @param {Express<DecorSummary, boolean>} express
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    filerDecorators(express: Express<DecorSummary, boolean>): DecorSummary[];

    getClassDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getMethodDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getPropertyDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getParameterDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];


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
     * @param {(string | symbol)} propertyKey
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string | symbol): IParameter[];
}
