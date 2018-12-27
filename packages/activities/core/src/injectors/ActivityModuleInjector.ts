import { InjectModuleInjectorToken, Inject, IModuleValidate, IContainer, Type, Singleton } from '@ts-ioc/core';
import { Task } from '../decorators';
import { DIModuleInjector, InjectedModule, InjectedModuleToken } from '@ts-ioc/bootstrap';
import { ActivityValidateToken } from './ActivityValidate';

/**
 * Activity module injector token.
 */
export const ActivityModuleInjectorToken = new InjectModuleInjectorToken(Task.toString());

/**
 * activity module injector.
 *
 * @export
 * @class ActivityModuleInjector
 * @extends {DIModuleInjector}
 */
@Singleton(ActivityModuleInjectorToken)
export class ActivityModuleInjector  extends DIModuleInjector {

    constructor(@Inject(ActivityValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        container.register(type);
        let accor = this.getMetaAccessor(container, this.validate.getDecorator());
        let metaConfig = accor.getMetadata(type, container);
        await this.registerConfgureDepds(container, metaConfig);

        let injMd = new InjectedModule(type, metaConfig, container);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        return injMd;
    }
}
