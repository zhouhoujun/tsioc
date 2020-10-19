import {
    DesignContext, lang, DecoratorProvider, IProvider,
    IocRegScope, IActionSetup, tokenId, Type, TokenId, refl
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { ModuleReflect } from '../modules/reflect';
import { ModuleConfigure } from '../modules/configure';
import { ParentInjectorToken } from '../tk';
import { ModuleInjector, ModuleProviders } from '../modules/injector';
import { ModuleRef, ModuleRegistered } from '../modules/ModuleRef';

export interface ModuleDesignContext extends DesignContext {
    reflect: ModuleReflect;
    exports?: IProvider;
    moduleRef?: ModuleRef;
}

export const AnnoationRegInAction = function (ctx: ModuleDesignContext, next: () => void): void {
    if (!ctx.regIn && ctx.reflect.annoDecor) {
        let injector = ctx.injector.getInstance(ModuleInjector);
        injector.setValue(ParentInjectorToken, ctx.injector);
        ctx.injector = injector;
    }
    next();
};


/**
 * annoation register scope.
 *
 * @export
 * @class AnnoationRegisterScope
 * @extends {IocRegScope<DesignContext>}
 */
export class AnnoationRegisterScope extends IocRegScope<ModuleDesignContext> implements IActionSetup {
    execute(ctx: ModuleDesignContext, next?: () => void): void {
        if (ctx.reflect.annoType === 'module' && ctx.reflect.annotation) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleExportsAction);
    }
}

export const RegModuleImportsAction = function (ctx: ModuleDesignContext, next: () => void): void {
    const annoation = ctx.reflect.annotation;
    if (annoation.imports) {
        (<ICoreInjector>ctx.injector).use(...ctx.reflect.annotation.imports);
    }
    next();
};


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
export const ModuleProvidersBuilderToken: TokenId<IModuleProvidersBuilder> = tokenId<IModuleProvidersBuilder>('MODULE_PROVIDERS_BUILDER');

export const RegModuleProvidersAction = function (ctx: ModuleDesignContext, next: () => void): void {

    let injector = ctx.injector as ModuleInjector;
    let mdReft = ctx.reflect;
    const annoation = mdReft.annotation;

    const map = ctx.exports = injector.getInstance(ModuleProviders);
    map.moduleInjector = injector;
    let mdRef = new ModuleRef(ctx.type, map);
    mdRef.onDestroy(() => {
        const parent = injector.getInstance(ParentInjectorToken);
        if (parent instanceof ModuleInjector) {
            parent.unexport(mdRef);
        } else {
            map.iterator((f, k) => {
                parent.unregister(k);
            });
        }
    });
    ctx.injector.setValue(ModuleRef, mdRef);
    ctx.moduleRef = mdRef;
    ctx.injector.getContainer().getRegistered<ModuleRegistered>(ctx.type).moduleRef = mdRef;

    let components = annoation.components ? injector.injectModule(...annoation.components) : null;

    // inject module providers
    if (annoation.providers?.length) {
        map.inject(...annoation.providers);
    }

    if (map.size) {
        injector.copy(map, k => !injector.hasTokenKey(k));
    }

    if (components && components.length) {
        mdReft.components = components;
    }

    let exptypes: Type[] = lang.getTypes(...annoation.exports || []);

    exptypes.forEach(ty => {
        map.export(ty);
    });
    next();
};



export const RegModuleExportsAction = function (ctx: ModuleDesignContext, next: () => void): void {
    if (ctx.exports.size) {
        let parent = ctx.injector.getInstance(ParentInjectorToken);
        if (parent) {
            if (parent instanceof ModuleInjector) {
                parent.export(ctx.moduleRef);
            } else {
                parent.copy(ctx.exports);
            }
        }
    }
    next();
};
