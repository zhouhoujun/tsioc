import { LifeScope, DecorSummary } from '../LifeScope';
import { ObjectMap, Token } from '../types';
import { Type } from '../Type';
import { isClass } from '../utils';
import { Singleton } from './decorators';
import { ClassMetadata } from './metadatas';
import { isArray, isString } from 'util';
import { IContainer } from '../IContainer';
import { CoreActions, ActionComponent, ActionComposite } from './actions';
import { DecoratorType } from './factories';
import { Express } from 'development-core';
import { ActionData } from './ActionData';
import { ActionFactory } from './ActionFactory';
import { IocState } from '../index';

export class DefaultLifeScope implements LifeScope {


    decorators: DecorSummary[];
    action: ActionComponent;
    constructor(private container: IContainer) {
        this.decorators = [];
        this.buildAction();
    }


    addAction(action: ActionComponent, type: DecoratorType, ...nodepaths: string[]): LifeScope {
        let types = this.toActionType(type);
        types.split(',').forEach(name => {
            let parent = this.getAtionByName(name);
            nodepaths.forEach(name => {
                parent = parent.find(act => act.name === name);
            });

            parent.add(action);
        });
        return this;
    }

    registerDecorator(decorator: Function, ...actions: string[]) {
        let type = this.getDecoratorType(decorator);
        return this.registerCustomDecorator(decorator, type, ...actions);
    }

    registerCustomDecorator(decorator: Function, type: DecoratorType, ...actions: string[]) {
        let types = this.toActionType(type);
        let name = decorator.toString();
        if (!this.decorators.some(d => d.name === name)) {
            this.decorators.push({
                name: name,
                types: types,
                actions: actions
            });
        }
        return this;
    }

    execute<T>(type: DecoratorType, data: ActionData<T>, ...names: string[]) {
        let types = this.toActionType(type).split(',');
        return this.action.filter<ActionComponent>(act => types.indexOf(act.name) >= 0).forEach(act => {
            names.forEach(name => {
                act = act.find(itm => itm.name === name);
            });
            act.execute(this.container, data);
        });
    }

    getClassDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.getTypeDecorators(this.toActionType(DecoratorType.Class), match);
    }

    getMethodDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.getTypeDecorators(this.toActionType(DecoratorType.Method), match);
    }

    getPropertyDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.getTypeDecorators(this.toActionType(DecoratorType.Property), match);
    }

    getParameterDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.getTypeDecorators(this.toActionType(DecoratorType.Parameter), match);
    }

    getDecoratorType(decirator: any): DecoratorType {
        return decirator.decoratorType || DecoratorType.All;
    }

    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {Type<T>} target
     * @returns {boolean}
     * @memberof Container
     */
    isVaildDependence<T>(target: Type<T>): boolean {
        if (!target) {
            return false;
        }
        if (!isClass(target)) {
            return false;
        }
        return this.getClassDecorators().some(act => Reflect.hasMetadata(act.name, target));

    }

    getAtionByName(name: string): ActionComponent {
        return this.action.find(action => action.name === name) as ActionComponent;
    }

    getClassAction(): ActionComponent {
        return this.getAtionByName(this.toActionType(DecoratorType.Class));
    }
    getMethodAction(): ActionComponent {
        return this.getAtionByName(this.toActionType(DecoratorType.Method));
    }

    getPropertyAction(): ActionComponent {
        return this.getAtionByName(this.toActionType(DecoratorType.Property));
    }
    getParameterAction(): ActionComponent {
        return this.getAtionByName(this.toActionType(DecoratorType.Parameter));
    }

    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {Token<any>>[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(type: Type<T>): Token<any>[] {
        return this.getParameterMetadata(type);
    }

    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {(string | symbol)} propertyKey
     * @returns {Token<any>[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string | symbol): Token<any>[] {
        return this.getParameterMetadata(type, instance, propertyKey);
    }

    isSingletonType<T>(type: Type<T>): boolean {
        if (Reflect.hasOwnMetadata(Singleton.toString(), type)) {
            return true;
        }

        let singleton;
        this.getClassDecorators().forEach((act, key) => {
            if (singleton) {
                return false;
            }
            let metadatas = Reflect.getMetadata(key, type) as ClassMetadata[] || [];
            if (isArray(metadatas)) {
                singleton = metadatas.some(m => m.singleton === true);
            }
            return true;
        })
        return singleton;
    }

    filerDecorators(express?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.decorators.filter(express);
    }

    protected getParameterMetadata<T>(type: Type<T>, instance?: T, propertyKey?: string | symbol): Token<any>[] {
        let data = {
            target: instance,
            targetType: type,
            propertyKey: propertyKey
        } as ActionData<Token<any>[]>;
        this.execute(DecoratorType.Parameter, data, CoreActions.bindParameterType);
        return data.execResult;

    }

    protected getTypeDecorators(decType: string, match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.filerDecorators(value => {
            let flag = (value.types || '').indexOf(decType) >= 0;
            if (flag && match) {
                flag = match(value);
            }
            return flag;
        });
    }

    protected buildAction() {
        let factory = new ActionFactory();

        let action = factory.create('');
        action.add(factory.create(this.toActionType(DecoratorType.Class))
            .add(factory.create(IocState.design)
                .add(factory.create(IocState.runtime))))
            .add(factory.create(this.toActionType(DecoratorType.Method)))
            .add(factory.create(this.toActionType(DecoratorType.Property)))
            .add(factory.create(this.toActionType(DecoratorType.Parameter)));
        this.action = action;

    }


    protected toActionType(type: DecoratorType) {
        let types = [];
        if (type & DecoratorType.Class) {
            types.push('ClassDecorator');
        }
        if (type & DecoratorType.Method) {
            types.push('MethodDecorator');
        }
        if (type & DecoratorType.Property) {
            types.push('PropertyDecorator');
        }
        if (type & DecoratorType.Parameter) {
            types.push('ParameterDecorator');
        }

        return types.join(',');
    }

}
