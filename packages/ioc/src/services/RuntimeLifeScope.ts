import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    IocGetCacheAction, RuntimeMethodScope, RuntimeActionContext,
    GetSingletionAction, ContainerCheckerAction, CreateInstanceAction, ConstructorArgsAction,
    IocBeforeConstructorScope, IocAfterConstructorScope,
    RuntimeAnnoationScope, RuntimePropertyScope, InitReflectAction, RuntimeParamScope,
    InstanceCheckAction, RuntimeDecoratorAction
} from '../actions';
import { IIocContainer, ContainerFactoryToken } from '../IIocContainer';
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

        this.registerAction(InstanceCheckAction)
            .registerAction(RuntimeDecoratorAction)
            .registerAction(RuntimeParamScope, true);


        this.use(ContainerCheckerAction)
            .use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope, true)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope, true)
            .use(RuntimePropertyScope, true)
            .use(RuntimeMethodScope, true)
            .use(RuntimeAnnoationScope, true);

    }

    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: instance,
            propertyKey: propertyKey
        }, container.get(ContainerFactoryToken));
        this.container.get(RuntimeParamScope).execute(ctx);
        let params = ctx.targetReflect.methodParams.get(propertyKey);
        return params || [];
    }
}
