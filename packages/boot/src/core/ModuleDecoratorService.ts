import {
    Singleton, Type, Inject, MetadataService, DesignDecoratorRegisterer, DecoratorScopes,
    RuntimeDecoratorRegisterer, lang, getOwnTypeMetadata, isArray, isBaseType, isClass, isFunction
} from '@tsdi/ioc';
import { ContainerToken, IContainer, InjectorDecoratorRegisterer } from '@tsdi/core';
import { ComponentRegisterAction } from './registers';
import { ModuleConfigure } from './modules';

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
        let ann = { ...lang.first(getOwnTypeMetadata<ModuleConfigure>(decorator, type)) };
        if (ann.template) {
            ann.template = this.cloneTemplate(ann.template);
        }
        return ann;
    }


    cloneTemplate(target: any) {
        if (isArray(target)) {
            return target.map(it => this.cloneTemplate(it));
        }
        if (isClass(target) || isFunction(target) || isBaseType(lang.getClass(target))) {
            return target;
        } else if (target) {
            let newM = {};
            lang.forIn(target, (val, name) => {
                newM[name] = this.cloneTemplate(val)
            });
        }
        return null;
    }
}
