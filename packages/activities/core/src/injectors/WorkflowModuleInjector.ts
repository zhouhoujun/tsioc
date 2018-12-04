import { DIModuleInjector, InjectedModule, InjectedModuleToken } from '@ts-ioc/bootstrap';
import { InjectModuleInjectorToken, Injectable, Inject, IModuleValidate, IContainer, Type } from '@ts-ioc/core';
import { Workflow } from '../decorators';
import { WorkflowModuleValidateToken } from './WorkflowModuleValidate';

/**
 * workflow module injector token.
 */
export const WorkflowModuleInjectorToken = new InjectModuleInjectorToken(Workflow.toString());
/**
 * workflow module injector
 *
 * @export
 * @class WorkflowModuleInjector
 * @extends {DIModuleInjector}
 */
@Injectable(WorkflowModuleInjectorToken)
export class WorkflowModuleInjector extends DIModuleInjector {

    constructor(@Inject(WorkflowModuleValidateToken) validate: IModuleValidate) {
        super(validate)
    }

    protected async importModule(container: IContainer, type: Type<any>): Promise<InjectedModule<any>> {
        container.register(type);
        let accor = this.getMetaAccessor(container, type, this.validate.getDecorator());
        let metaConfig = accor.getMetadata(type, container);
        await this.registerConfgureDepds(container, metaConfig);

        let injMd = new InjectedModule(type, metaConfig, container);
        container.bindProvider(new InjectedModuleToken(type), injMd);

        return injMd;
    }
}

