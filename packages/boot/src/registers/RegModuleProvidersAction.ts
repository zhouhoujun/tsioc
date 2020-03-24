import { Type, ProviderTypes, isArray, DesignContext, IProviders, tokenId, lang } from '@tsdi/ioc';
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
     * @param {ModuleProviders} providers the providers map, build annoation providers register in.
     * @param {ModuleConfigure} annoation module metatdata annoation.
     * @memberof IModuleProvidersBuilder
     */
    build(providers: ModuleProviders, annoation: ModuleConfigure): void;
}
/**
 * module providers builder token. for module decorator provider.
 */
export const ModuleProvidersBuilderToken = tokenId<IModuleProvidersBuilder>('MODULE_PROVIDERS_BUILDER');

export const RegModuleProvidersAction = function (ctx: DesignContext, next: () => void): void {
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
            map.export(comp);
            let decorator = reflects.get(comp)?.decorator;
            if (decorator && componentDectors.indexOf(decorator) < 0) {
                componentDectors.push(decorator);
            }
        });
        mdReft.componentDectors = componentDectors;
    }

    let builder = mdReft.getDecorProviders?.().getInstance(ModuleProvidersBuilderToken);
    if (builder) {
        builder.build(map, annoation);
    }

    let exptypes: Type[] = lang.getTypes(...annoation.exports || []);

    exptypes.forEach(ty => {
        map.export(ty);
    });
    map.size && ctx.setValue(CTX_MODULE_EXPORTS, map);
    next();
};
