import {
    Singleton, Type, Inject, MetadataService, DesignDecoratorRegisterer, DecoratorScopes,
    RuntimeDecoratorRegisterer, lang, getOwnTypeMetadata, InjectToken, ITypeReflect, ClassType, TypeReflects
} from '@tsdi/ioc';
import { ContainerToken, IContainer, InjectorDecoratorRegisterer } from '@tsdi/core';
import { ModuleConfigure } from './modules';
import { DIModuleExports } from './injectors';
import { ParentContainerToken } from './ContainerPoolToken';
import { ModuleDecoratorServiceToken, IModuleDecoratorService } from './IModuleDecoratorService';


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
        let anno = { ...lang.first(getOwnTypeMetadata<ModuleConfigure>(decorator, type)) };
        return anno;
    }

    getReflect<T extends ITypeReflect>(type: ClassType<any>, container: IContainer): { reflect: T, container: IContainer } {
        let rfs = container.get(TypeReflects);
        let rf = rfs.get<T>(type);
        if (rf) {
            return { reflect: rf, container: container };
        }

        let exps = container.get(DIModuleExports);
        let cot: IContainer;
        if (exps) {
            exps.getResolvers()
                .some(r => {
                    let tref = r.getContainer().resolve(TypeReflects);
                    if (tref) {
                        rf = tref.get(type)
                    }
                    if (rf) {
                        cot = r.getContainer();
                        return true;
                    } else {
                        return false;
                    }
                });
        }

        if (rf) {
            return { reflect: rf, container: cot };
        }

        let parent = this.container.get(ParentContainerToken);
        return parent ? this.getReflect(type, parent) : {} as any;
    }
}
