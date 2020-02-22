import { Type, ProviderTypes, isArray, DesignActionContext, IProviders, tokenId, lang } from '@tsdi/ioc';
import { CTX_MODULE_EXPORTS, CTX_MODULE_ANNOATION } from '../context-tokens';
import { IModuleReflect } from '../modules/IModuleReflect';
import { ModuleProviders, ModuleInjector } from '../modules/ModuleInjector';
import { ModuleConfigure } from '../modules/ModuleConfigure';

/**
 * module providers builder.
 *
 * @export
 * @interface IModuleProvidersBuilder
 */
export interface IModuleProvidersBuilder {
    /**
     * build annoation providers in map.
     *
     * @param {ModuleInjector} injector module injector.
     * @param {ModuleConfigure} annoation module metatdata annoation.
     * @param {IProviders} map the providers map, build annoation providers in it.
     * @memberof IModuleProvidersBuilder
     */
    build(injector: ModuleInjector, annoation: ModuleConfigure, map: IProviders): void;
}
/**
 * module providers builder token. for module decorator provider.
 */
export const ModuleProvidersBuilderToken = tokenId<IModuleProvidersBuilder>('MODULE_PROVIDERS_BUILDER');

export const RegModuleProvidersAction = function (ctx: DesignActionContext, next: () => void): void {
    let reflects = ctx.reflects;
    let annoation = ctx.getValue(CTX_MODULE_ANNOATION);

    let injector = ctx.injector as ModuleInjector;
    let mdReft = ctx.targetReflect as IModuleReflect;
    let components = annoation.components ? injector.injectModule(...annoation.components) : null;

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

    let builder = mdReft.getDecorProviders?.().getInstance(ModuleProvidersBuilderToken);
    if (builder) {
        builder.build(injector, annoation, map);
    }

    let exptypes: Type[] = lang.getTypes(...annoation.exports || []);

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
