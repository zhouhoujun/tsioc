import {
    DesignContext, lang, DecoratorProvider, CTX_CURR_DECOR, IProvider,
    IocRegScope, IActionSetup, tokenId, Type, CTX_TYPE_REGIN, INJECTOR, TokenId
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnotationMerger } from '../services/AnnotationMerger';
import { IModuleReflect, ParentInjectorToken } from '../modules/IModuleReflect';
import { ModuleConfigure } from '../modules/ModuleConfigure';
import { CTX_MODULE_ANNOATION, CTX_MODULE_EXPORTS } from '../tk';
import { ModuleInjector, ModuleProviders } from '../modules/ModuleInjector';
import { ModuleRef } from '../modules/ModuleRef';

/**
 * annoation class type design action.
 * @param ctx
 * @param next
 */
export const AnnoationAction = function (ctx: DesignContext, next: () => void): void {
    let tgRef = ctx.targetReflect as IModuleReflect;
    if (tgRef.getAnnoation) {
        ctx.setValue(CTX_MODULE_ANNOATION, tgRef.getAnnoation());
        return next();
    }

    let cuurDec = ctx.getValue(CTX_CURR_DECOR);
    if (!tgRef.decorator) {
        tgRef.decorator = cuurDec;
    }

    let decorator = cuurDec || tgRef.decorator;
    let metas = ctx.reflects.getMetadata(decorator, ctx.type);
    if (metas.length) {
        let proder: IProvider;
        if (!tgRef.getDecorProviders) {
            proder = ctx.reflects.getActionInjector().getInstance(DecoratorProvider).getProviders(decorator);
            if (proder) {
                tgRef.getDecorProviders = () => proder;
            }
        } else {
            proder = tgRef.getDecorProviders();
        }
        let merger = proder?.getInstance(AnnotationMerger);
        let merged = merger ? merger.merge(metas) : lang.first(metas);
        if (!tgRef.baseURL) {
            tgRef.baseURL = merged.baseURL;
        }
        tgRef.getAnnoation = <T extends ModuleConfigure>() => {
            return { ...merged };
        };

        ctx.setValue(CTX_MODULE_ANNOATION, tgRef.getAnnoation());
    }
    next();
};


export const AnnoationRegInAction = function (ctx: DesignContext, next: () => void): void {
    if (!ctx.hasValue(CTX_TYPE_REGIN)) {
        let injector = ctx.injector.getInstance(ModuleInjector);
        injector.setValue(ParentInjectorToken, ctx.injector);
        ctx.setValue(INJECTOR, injector);
    }
    next();
};


/**
 * annoation register scope.
 *
 * @export
 * @class AnnoationRegisterScope
 * @extends {IocCompositeAction<AnnoationContext>}
 */
export class AnnoationRegisterScope extends IocRegScope<DesignContext> implements IActionSetup {
    execute(ctx: DesignContext, next?: () => void): void {
        if (ctx.hasValue(CTX_MODULE_ANNOATION)) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleRefAction)
            .use(RegModuleExportsAction);
    }
}

export const RegModuleImportsAction = function (ctx: DesignContext, next: () => void): void {
    let annoation = ctx.getValue(CTX_MODULE_ANNOATION)
    if (annoation.imports) {
        (<ICoreInjector>ctx.injector).use(...annoation.imports);
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

export const RegModuleRefAction = function (ctx: DesignContext, next: () => void): void {
    let reflect = ctx.targetReflect as IModuleReflect;
    if (reflect) {
        let mdRef = new ModuleRef(ctx.type, reflect, ctx.getValue(CTX_MODULE_EXPORTS));
        ctx.injector.setValue(ModuleRef, mdRef);
        ctx.setValue(ModuleRef, mdRef);
        reflect.getModuleRef = () => mdRef;
    }
    next();
};


export const RegModuleExportsAction = function (ctx: DesignContext, next: () => void): void {
    if (ctx.hasValue(CTX_MODULE_EXPORTS)) {
        let parent = ctx.injector.getInstance(ParentInjectorToken);
        if (parent) {
            if (parent instanceof ModuleInjector) {
                parent.export(ctx.getValue(ModuleRef));
            } else {
                parent.copy(ctx.getValue(CTX_MODULE_EXPORTS));
            }
        }
    }
    next();
};
