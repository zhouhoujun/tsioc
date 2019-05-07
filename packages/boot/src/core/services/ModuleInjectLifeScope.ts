import { Singleton, Autorun, LifeScope, Type, Inject, ContainerFactoryToken } from '@tsdi/ioc';
import { ModuleResovler } from '../modules';
import { IContainer, ContainerToken } from '@tsdi/core';
import {
    AnnoationActionContext, CheckAnnoationAction, AnnoationRegisterScope,
    DIModuleRegisterScope, RegModuleExportsAction
} from '../injectors';

export class ModuleInjectLifeScope extends LifeScope<AnnoationActionContext> {

    @Inject(ContainerToken)
    container: IContainer;

    setup() {
        this.registerAction(DIModuleRegisterScope, true)
            .registerAction(CheckAnnoationAction)
            .registerAction(AnnoationRegisterScope, true)
            .registerAction(RegModuleExportsAction);

        this.use(CheckAnnoationAction)
            .use(AnnoationRegisterScope)
            .use(RegModuleExportsAction);
    }

    register<T>(type: Type<T>, decorator: string): ModuleResovler<T> {
        let ctx = AnnoationActionContext.parse({
            module: type,
            decorator: decorator
        }, this.container.get(ContainerFactoryToken));
        this.execute(ctx);
        return ctx.moduleResolver;
    }
}
