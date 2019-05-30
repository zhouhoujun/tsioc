import {
    Singleton, Type, Inject, MetadataService, DesignDecoratorRegisterer, DecoratorScopes,
    RuntimeDecoratorRegisterer, lang, getOwnTypeMetadata, InjectToken
} from '@tsdi/ioc';
import { ContainerToken, IContainer, InjectorDecoratorRegisterer } from '@tsdi/core';
import { ModuleConfigure } from './modules';

/**
 * module decorator metadata service
 *
 * @export
 * @interface IModuleDecoratorService
 */
export interface IModuleDecoratorService {
    getDecorator(type: Type<any>): string;
    getAnnoation(type: Type<any>, decorator?: string): ModuleConfigure;
}

export const ModuleDecoratorServiceToken = new InjectToken<IModuleDecoratorService>('ModuleDecoratorService');

@Singleton(ModuleDecoratorServiceToken)
export class ModuleDecoratorService implements IModuleDecoratorService {

    @Inject(ContainerToken)
    protected container: IContainer;

    getDecorator(type: Type<any>): string {
        let decorators = this.container.get(MetadataService)
            .getClassDecorators(type);

        return this.getMatchDecorator(decorators);
    }

    protected getMatchDecorator(decorators: string[]) {
        let decorator = '';
        let designReg = this.container.get(DesignDecoratorRegisterer).getRegisterer(DecoratorScopes.Class);

        let mdRgr = this.container.get(InjectorDecoratorRegisterer);
        decorator = decorators.find(c => mdRgr.has(c));

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
