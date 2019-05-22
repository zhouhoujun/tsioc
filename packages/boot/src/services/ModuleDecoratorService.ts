import { Singleton, Type, Inject, MetadataService, DesignDecoratorRegisterer, DecoratorScopes, RuntimeDecoratorRegisterer, lang, getOwnTypeMetadata } from '@tsdi/ioc';
import { ModuleConfigure, ComponentRegisterAction } from '../core';
import { ContainerToken, IContainer, InjectorDecoratorRegisterer } from '@tsdi/core';

@Singleton()
export class ModuleDecoratorService {

    @Inject(ContainerToken)
    protected container: IContainer;

    getDecorator(type: Type<any>) {
        let decorator = '';
        let decorators = this.container.get(MetadataService)
            .getClassDecorators(type);

        let designReg = this.container.get(DesignDecoratorRegisterer).getRegisterer(DecoratorScopes.Class);
        decorator = decorators.find(c => designReg.has(c, ComponentRegisterAction));

        if (!decorator) {
            let mdRgr = this.container.get(InjectorDecoratorRegisterer);
            decorator = decorators.find(c => mdRgr.has(c));
        }

        decorator = decorator || decorators.find(c => designReg.has(c));

        if (!decorator) {
            let runtimeReg = this.container.get(RuntimeDecoratorRegisterer).getRegisterer(DecoratorScopes.Class)
            decorator = decorators.find(c => runtimeReg.has(c));
        }
        return decorator;
    }

    getAnnoation(type: Type<any>, decorator?: string): ModuleConfigure {
        if (!decorator) {
            decorator = this.getDecorator(type);
        }
        return { ...lang.first(getOwnTypeMetadata<ModuleConfigure>(decorator, type)) };
    }
}
