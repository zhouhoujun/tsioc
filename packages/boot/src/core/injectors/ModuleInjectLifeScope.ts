import { LifeScope, Type, Inject, ContainerFactoryToken } from '@tsdi/ioc';
import { ModuleResovler } from './ModuleResovler';
import { IContainer, ContainerToken } from '@tsdi/core';
import { AnnoationActionContext } from './AnnoationActionContext';
import { DIModuleInjectorScope } from './DIModuleInjectorScope';
import { CheckAnnoationAction } from './CheckAnnoationAction';
import { AnnoationRegisterScope } from './AnnoationRegisterScope';
import { RegModuleExportsAction } from './RegModuleExportsAction';


export class ModuleInjectLifeScope extends LifeScope<AnnoationActionContext> {

    @Inject(ContainerToken)
    container: IContainer;

    setup() {
        this.registerAction(DIModuleInjectorScope, true)
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
        return ctx.moduleResolver as ModuleResovler<T>;
    }
}
