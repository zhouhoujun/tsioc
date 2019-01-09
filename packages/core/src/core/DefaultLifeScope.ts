import { LifeScope, DecorSummary } from '../LifeScope';
import { Type, ObjectMap, Token, IocState, Express } from '../types';
import { isClass, isAbstractClass, isArray, lang } from '../utils';
import { Singleton } from './decorators/Singleton';
import { MethodMetadata } from './metadatas';
import { IContainer } from '../IContainer';
import { CoreActions, ActionComponent, LifeState } from './actions';
import {
    DecoratorType, getOwnParamerterNames, getOwnMethodMetadata, hasOwnClassMetadata,
    getMethodDecorators, getClassDecorators, getPropDecorators, getParamDecorators
} from './factories';
import { ActionData } from './ActionData';
import { ActionFactory } from './ActionFactory';
import { IParameter } from '../IParameter';
import { MetaAccessorToken } from './IMetaAccessor';


/**
 * default implement life scope.
 *
 * @export
 * @class DefaultLifeScope
 * @implements {LifeScope}
 */
export class DefaultLifeScope implements LifeScope {
    decorators: DecorSummary[];
    action: ActionComponent;
    constructor(private container: IContainer) {
        this.decorators = [];
        this.buildAction();
    }

    addAction(action: ActionComponent, ...nodepaths: string[]): this {
        let parent = this.action;
        nodepaths.forEach(pathname => {
            parent = parent.find(act => act.name === pathname);
        });
        if (parent) {
            parent.add(action);
        }

        return this;
    }

    registerDecorator(decorator: Function, ...actions: string[]): this {
        let type = this.getDecoratorType(decorator);
        return this.registerCustomDecorator(decorator, type, ...actions);
    }

    registerCustomDecorator(decorator: Function, type: DecoratorType, ...actions: string[]): this {
        let types = this.toActionName(type);
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

    execute<T>(data: ActionData<T>, ...names: string[]) {
        names = names.filter(n => !!n);
        let act: ActionComponent = this.action;
        names.forEach(name => {
            act = act.find(itm => itm.name === name);
        });
        if (act) {
            act.execute(this.container, data);
        }
    }

    routeExecute<T>(data: ActionData<T>, ...names: string[]) {
        this.execute(data, ...names);
        let container = this.container.parent;
        while (container) {
            container.getLifeScope().execute(lang.assign({}, data), ...names);
            container = container.parent;
        }
    }

    hasDecorator(target: Type<any> | any, dtype: DecoratorType, match?: Express<DecorSummary, boolean>): boolean {
        let decors;
        switch (dtype) {
            case DecoratorType.Class:
                decors = getClassDecorators(target);
                break;
            case DecoratorType.Property:
                decors = getPropDecorators(target);
                break;
            case DecoratorType.Parameter:
                decors = getParamDecorators(target);
                break;
            case DecoratorType.Method:
                decors = getMethodDecorators(target);
                break;
        }
        if (decors) {
            return decors.some(dec => this.decorators.some(d => d.name === dec && match(d)));
        }
        return false;
    }

    getClassDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return getClassDecorators(type)
            .map(dec => this.decorators.find(d => d.name === dec))
            .filter(d => d && (match ? match(d) : true));
    }

    getMethodDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return getMethodDecorators(type)
            .map(dec => this.decorators.find(d => d.name === dec))
            .filter(d => d && (match ? match(d) : true));
    }

    getPropertyDecorators(type: Type<any>, match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return getPropDecorators(type)
            .map(dec => this.decorators.find(d => d.name === dec))
            .filter(d => d && (match ? match(d) : true));
    }

    getParameterDecorators(target: any, propertyKey: string, match?: Express<DecorSummary, boolean>): DecorSummary[] {
        return getParamDecorators(target, propertyKey)
            .map(dec => this.decorators.find(d => d.name === dec))
            .filter(d => d && (match ? match(d) : true));
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

        if (isAbstractClass(target)) {
            return false;
        }
        return this.getClassDecorators(target).length > 0;
    }

    getAtionByName(name: string): ActionComponent {
        return this.action.find(action => action.name === name) as ActionComponent;
    }

    getClassAction(): ActionComponent {
        return this.getAtionByName(this.toActionName(DecoratorType.Class));
    }
    getMethodAction(): ActionComponent {
        return this.getAtionByName(this.toActionName(DecoratorType.Method));
    }

    getPropertyAction(): ActionComponent {
        return this.getAtionByName(this.toActionName(DecoratorType.Property));
    }
    getParameterAction(): ActionComponent {
        return this.getAtionByName(this.toActionName(DecoratorType.Parameter));
    }

    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(type: Type<T>): IParameter[] {
        return this.getParameters(type);
    }

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
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string): IParameter[] {
        return this.getParameters(type, instance, propertyKey);
    }

    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof DefaultLifeScope
     */
    getParamerterNames<T>(type: Type<T>, propertyKey: string): string[] {
        let metadata = getOwnParamerterNames(type);
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey]
        }
        if (!isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    }

    isSingletonType<T>(type: Type<T>): boolean {
        if (hasOwnClassMetadata(Singleton, type)) {
            return true;
        }
        let metadata = this.container.get(MetaAccessorToken).find(type, this.container, m => m.singleton === true);
        return !!metadata;
    }

    getMethodMetadatas<T>(type: Type<T>, propertyKey: string): MethodMetadata[] {
        let metadatas = [];
        this.getMethodDecorators(type)
            .forEach(dec => {
                let metas: ObjectMap<MethodMetadata[]> = getOwnMethodMetadata<MethodMetadata>(dec.name, type);
                if (metas.hasOwnProperty(propertyKey)) {
                    metadatas = metadatas.concat(metas[propertyKey] || []);
                }
            });
        return metadatas;
    }

    filerDecorators(express?: Express<DecorSummary, boolean>): DecorSummary[] {
        return this.decorators.filter(express);
    }

    protected getParameters<T>(type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let data = {
            target: instance,
            targetType: type,
            propertyKey: propertyKey
        } as ActionData<Token<any>[]>;
        this.execute(data, LifeState.onInit, CoreActions.bindParameterType);

        let paramNames = this.getParamerterNames(type, propertyKey);

        if (data.execResult.length) {
            return data.execResult.map((typ, idx) => {
                return {
                    type: typ,
                    name: paramNames[idx]
                }
            });
        } else {
            return paramNames.map(name => {
                return {
                    name: name,
                    type: undefined
                }
            });
        }

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
        action
            .add(factory.create(IocState.design)
                .add(factory.create(CoreActions.bindProvider))
                .add(factory.create(CoreActions.autorun))
            )
            .add(factory.create(IocState.runtime)
                .add(factory.create(LifeState.beforeCreateArgs))
                .add(factory.create(LifeState.beforeConstructor))
                .add(factory.create(LifeState.afterConstructor))
                .add(factory.create(LifeState.onInit)
                    .add(factory.create(CoreActions.componentBeforeInit))
                    .add(factory.create(this.toActionName(DecoratorType.Class)))
                    .add(factory.create(this.toActionName(DecoratorType.Method)))
                    .add(factory.create(this.toActionName(DecoratorType.Property))
                        .add(factory.create(CoreActions.bindPropertyType))
                        .add(factory.create(CoreActions.injectProperty)))
                    .add(factory.create(this.toActionName(DecoratorType.Parameter))
                        .add(factory.create(CoreActions.bindParameterType))
                        .add(factory.create(CoreActions.bindParameterProviders)))
                    .add(factory.create(CoreActions.componentInit))
                )
                .add(factory.create(LifeState.AfterInit)
                    .add(factory.create(CoreActions.singletion))
                    .add(factory.create(CoreActions.componentAfterInit))
                    .add(factory.create(CoreActions.methodAutorun)))
            )
            .add(factory.create(CoreActions.cache));

        this.action = action;
    }


    toActionName(type: DecoratorType): string {
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
