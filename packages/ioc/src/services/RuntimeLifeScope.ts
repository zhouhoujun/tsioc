import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    IocGetCacheAction, RuntimeMethodScope, RuntimeActionContext,
    GetSingletionAction, ContainerCheckerAction, CreateInstanceAction, ConstructorArgsAction,
    IocBeforeConstructorScope, IocAfterConstructorScope,
    RuntimeAnnoationScope, RuntimePropertyScope, InitReflectAction, RuntimeParamScope,
    InstanceCheckAction, RuntimeDecoratorAction
} from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { RegisterLifeScope } from './RegisterLifeScope';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeActionContext> {

    getParamProviders(container: IIocContainer, type: Type<any>, propertyKey: string, target?: any): ParamProviders[] {
        let tgRefl = container.getTypeReflects().get(type);
        if (tgRefl && tgRefl.methodParamProviders.has(propertyKey)) {
            return tgRefl.methodParamProviders.get(propertyKey) || [];
        }
        return [];
    }

    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(container: IIocContainer, type: Type<T>): IParameter[] {
        return this.getParameters(container, type);
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
    getMethodParameters<T>(container: IIocContainer, type: Type<T>, instance: T, propertyKey: string): IParameter[] {
        return this.getParameters(container, type, instance, propertyKey);
    }

    setup() {
        this.container.registerSingleton(RuntimeDecoratorRegisterer, () => new RuntimeDecoratorRegisterer(this.container));
        if (!this.container.has(InitReflectAction)) {
            this.registerAction(InitReflectAction);
        }

        this.registerAction(ConstructorArgsAction)
            .registerAction(ContainerCheckerAction)
            .registerAction(CreateInstanceAction)
            .registerAction(GetSingletionAction)
            .registerAction(InstanceCheckAction)
            .registerAction(IocGetCacheAction)
            .registerAction(RuntimeDecoratorAction)

            .registerAction(IocBeforeConstructorScope, true)
            .registerAction(IocAfterConstructorScope, true)
            .registerAction(RuntimeAnnoationScope, true)
            .registerAction(RuntimePropertyScope, true)
            .registerAction(RuntimeMethodScope, true)
            .registerAction(RuntimeParamScope, true);


        this.use(ContainerCheckerAction)
            .use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope)
            .use(RuntimePropertyScope)
            .use(RuntimeMethodScope)
            .use(RuntimeAnnoationScope);

    }

    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: instance,
            propertyKey: propertyKey
        }, container);
        this.execActions(ctx, [InitReflectAction, RuntimeParamScope]);
        let params = ctx.targetReflect.methodParams.get(propertyKey);
        return params || [];
    }
}
