
import { Singleton, Autorun, LifeScope, Type, Inject } from '@tsdi/ioc';
import { AnnoationActionContext, CheckAnnoationAction, AnnoationRegisterScope } from '../injectors';
import { ModuleResovler } from '../modules';
import { IContainer, ContainerToken } from '@tsdi/core';

@Singleton
@Autorun('setup')
export class ModuleInjectLifeScope extends LifeScope<AnnoationActionContext> {

    @Inject(ContainerToken)
    container: IContainer;

    setup() {
        this.registerAction(CheckAnnoationAction)
            .registerAction(AnnoationRegisterScope, true);

        this.use(CheckAnnoationAction)
            .use(AnnoationRegisterScope);
    }

    register<T>(type: Type<T>, decorator: string): ModuleResovler<T> {
        let ctx = AnnoationActionContext.parse({
            type: type,
            decorator: decorator
        }, this.container);
        this.execute(ctx);
        return ctx.moduleResolver;
    }
}
