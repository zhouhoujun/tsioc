import {
    DesignContext, lang, DecoratorProvider, IProvider,
    IocRegScope, IActionSetup, tokenId, Type, TokenId
} from '@tsdi/ioc';
import { AnnotationMerger } from '../annotations/merger';
import { IModuleReflect } from '../modules/reflect';
import { ModuleConfigure } from '../modules/configure';
import { DefaultModuleRef } from '../modules/injector';
import { IModuleInjector, IModuleProvider, ModuleRef } from '../modules/ModuleRef';

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

        ctx.annoation = tgRef.getAnnoation();
    }
    next();
};


export const AnnoationRegInAction = function (ctx: AnnoDesignContext, next: () => void): void {
    // if (ctx.annoation?.imports || ctx.annoation?.exports) {
    const mdRef = ctx.moduleRef = new DefaultModuleRef(ctx.type, ctx.injector as IModuleInjector, ctx.regIn);
    const reflect = ctx.targetReflect as IModuleReflect;
    reflect.getModuleRef = () => mdRef;
    ctx.injector = mdRef.injector;
    // }
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
            .use(RegModuleExportsAction);
    }
}

export const RegModuleImportsAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let annoation = ctx.annoation
    if (annoation.imports) {
        const mdRef = ctx.moduleRef;
        const types = mdRef.injector.use(...annoation.imports);
        (mdRef as DefaultModuleRef).imports = types;
        const reflects = ctx.reflects;
        types.forEach(ty => {
            const importRef = reflects.get<IModuleReflect>(ty)?.getModuleRef?.();
            if (importRef) {
                mdRef.injector.addRef(importRef, true);
            }
        });
    }
    next();
};


// /**
//  * module providers builder.
//  *
//  * @export
//  * @interface IModuleProvidersBuilder
//  */
// export interface IModuleProvidersBuilder {
//     /**
//      * build annoation providers in map.
//      *
//      * @param {ModuleProviders} providers the providers map, build annoation providers register in.
//      * @param {ModuleConfigure} annoation module metatdata annoation.
//      * @memberof IModuleProvidersBuilder
//      */
//     build(providers: IModuleProvider, annoation: ModuleConfigure): void;
// }
// /**
//  * module providers builder token. for module decorator provider.
//  */
// export const ModuleProvidersBuilderToken: TokenId<IModuleProvidersBuilder> = tokenId<IModuleProvidersBuilder>('MODULE_PROVIDERS_BUILDER');

export const RegModuleProvidersAction = function (ctx: AnnoDesignContext, next: () => void): void {
    let annoation = ctx.annoation;
    let mdReft = ctx.targetReflect as IModuleReflect;
    const mdRef = ctx.moduleRef;
    const map = mdRef.exports;
    const injector = mdRef.injector;
    let components = annoation.components ? injector.use(...annoation.components) : null;
    if (mdRef.regIn === 'root') {
        mdRef.imports?.forEach(ty => map.export(ty));
    }
    // inject module providers
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
            let decorator = ctx.reflects.get(comp)?.decorator;
            if (decorator && componentDectors.indexOf(decorator) < 0) {
                componentDectors.push(decorator);
            }
        });
        mdReft.componentDectors = componentDectors;
    }

    // let builder = mdReft.getDecorProviders?.().getInstance(ModuleProvidersBuilderToken);
    // if (builder) {
    //     builder.build(map, annoation);
    // }

    let exptypes: Type[] = lang.getTypes(...annoation.exports || []);

    exptypes.forEach(ty => {
        map.export(ty);
    });

    next();
};


export const RegModuleExportsAction = function (ctx: AnnoDesignContext, next: () => void): void {
    if (ctx.moduleRef.exports.size) {
        const parent = ctx.moduleRef.parent as IModuleInjector;
        if (parent?.isRoot()) {
            parent.addRef(ctx.moduleRef);
        }
    }
    next();
};
