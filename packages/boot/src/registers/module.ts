import {
    DesignContext, lang, DecoratorProvider, IProvider,
    IocRegScope, IActionSetup, tokenId, Type, TokenId
} from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { AnnotationMerger } from '../annotations/merger';
import { IModuleReflect } from '../modules/reflect';
import { ModuleConfigure } from '../modules/configure';
import { ParentInjectorToken } from '../tk';
import { ModuleInjector, ModuleProviders } from '../modules/injector';
import { ModuleRef } from '../modules/ModuleRef';

export interface AnnoDesignContext extends DesignContext {
    annoation?: ModuleConfigure;
    exports?: IProvider;
    moduleRef?: ModuleRef;
}

/**
 * annoation class type design action.
 * @param ctx
 * @param next
 */
export const AnnoationAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let tgRef = ctx.targetReflect as IModuleReflect;
    if (tgRef.getAnnoation) {
        ctx.annoation = tgRef.getAnnoation();
        return next();
    }

    let cuurDec = ctx.currDecor;
    if (!tgRef.decorator) {
        tgRef.decorator = cuurDec;
    }

    let decorator = cuurDec || tgRef.decorator;
    let metas = tgRef.getMetadata(decorator);
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

        ctx.annoation = tgRef.getAnnoation();
    }
    next();
};


export const AnnoationRegInAction = function (ctx: DesignContext, next: () => void): void {
    if (!ctx.regIn) {
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
export class AnnoationRegisterScope extends IocRegScope<AnnoDesignContext> implements IActionSetup {
    execute(ctx: AnnoDesignContext, next?: () => void): void {
        if (ctx.annoation) {
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

export const RegModuleImportsAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let annoation = ctx.annoation
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

export const RegModuleProvidersAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let annoation = ctx.annoation;

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
    if (map.size) {
        ctx.exports = map;
    } else {
        map.destroy();
    }
    next();
};

export const RegModuleRefAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let reflect = ctx.targetReflect as IModuleReflect;
    if (reflect) {
        let mdRef = new ModuleRef(ctx.type, reflect, ctx.exports);
        ctx.injector.setValue(ModuleRef, mdRef);
        ctx.moduleRef = mdRef;
        reflect.getModuleRef = () => mdRef;
    }
    next();
};


export const RegModuleExportsAction = function (ctx: AnnoDesignContext, next: () => void): void {
    if (ctx.exports) {
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
