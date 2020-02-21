import { Type, ProviderTypes, isArray, DesignActionContext } from '@tsdi/ioc';
import { ModuleLoader, IContainer } from '@tsdi/core';
import { CTX_MODULE_EXPORTS, CTX_MODULE_ANNOATION } from '../context-tokens';
import { IModuleReflect } from '../modules/IModuleReflect';
import { ModuleProviders, ModuleInjector } from '../modules/ModuleInjector';


export const RegModuleProvidersAction = function (ctx: DesignActionContext, next: () => void): void {
    let reflects = ctx.reflects;
    let annoation = ctx.getValue(CTX_MODULE_ANNOATION);

    let injector = ctx.injector as ModuleInjector;
    let continer = ctx.getContainer() as IContainer;
    let mdpr = continer.getModuleProvider();
    let mdReft = ctx.targetReflect as IModuleReflect;
    let components = annoation.components ? mdpr.use(injector, ...annoation.components) : null;

    // inject module providers
    let map = injector.getInstance(ModuleProviders);
    map.moduleInjector = injector;

    if (annoation.providers?.length) {
        map.inject(...annoation.providers);
    }

    if (map.size) {
        injector.copy(map, k => !injector.hasTokenKey(k));
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
    map.size && ctx.setValue(CTX_MODULE_EXPORTS, map);
    next();
};
