import { Type, ProviderTypes, isArray, ProviderParser, DesignActionContext } from '@tsdi/ioc';
import { ModuleLoader, IContainer } from '@tsdi/core';
import { CTX_MODULE_EXPORTS, CTX_MODULE_ANNOATION } from '../context-tokens';
import { IModuleReflect } from '../modules/IModuleReflect';


export const RegModuleProvidersAction = function (ctx: DesignActionContext, next: () => void): void {
    let reflects = ctx.reflects;
    let annoation = ctx.getValue(CTX_MODULE_ANNOATION);

    let injector = ctx.injector;
    let continer = ctx.getContainer<IContainer>();
    let mdpr = continer.getModuleProvider();
    let mdReft = ctx.targetReflect as IModuleReflect;
    let components = annoation.components ? mdpr.use(injector, ...annoation.components) : null;

    // inject module providers
    let map = injector.getInstance(ProviderParser)
        .parse(...annoation.providers || []);

    if (map.size) {
        injector.copy(map);
    }

    if (components && components.length) {
        mdReft.components = components;
        let componentDectors = [];
        components.forEach(comp => {
            map.set(comp, (...providers) => injector.getInstance(comp, ...providers));
            let decorator = reflects.get(comp)?.decorator;
            if (decorator && componentDectors.indexOf(decorator) < 0) {
                componentDectors.push(decorator);
            }
        });
        mdReft.componentDectors = componentDectors;
    }

    let exptypes: Type[] = injector.getInstance(ModuleLoader).getTypes(...annoation.exports || []);

    exptypes.forEach(ty => {
        let reflect = reflects.get(ty);
        map.set(ty, (...pds: ProviderTypes[]) => injector.getInstance(ty, ...pds));
        if (reflect && isArray(reflect.provides) && reflect.provides.length) {
            reflect.provides.forEach(p => {
                if (!map.has(p)) {
                    map.set(p, (...pds: ProviderTypes[]) => injector.get(p, ...pds));
                }
            });
        }
    });
    map.size && ctx.set(CTX_MODULE_EXPORTS, map);
    next();
};
