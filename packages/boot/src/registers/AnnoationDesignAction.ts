import { DesignActionContext, lang, DecoratorProvider, CTX_CURR_DECOR } from '@tsdi/ioc';
import { AnnotationMerger } from '../services/AnnotationMerger';
import { AnnotationCloner } from '../services/AnnotationCloner';
import { IModuleReflect } from '../modules/IModuleReflect';
import { ModuleConfigure } from '../modules/ModuleConfigure';
import { CTX_MODULE_ANNOATION } from '../context-tokens';


export const AnnoationDesignAction = function (ctx: DesignActionContext, next: () => void): void {
    let tgRef = ctx.targetReflect as IModuleReflect;
    if (tgRef.getAnnoation) {
        ctx.set(CTX_MODULE_ANNOATION, tgRef.getAnnoation());
        return next();
    }

    let cuurDec = ctx.getValue(CTX_CURR_DECOR);
    if (!tgRef.decorator) {
        tgRef.decorator = cuurDec;
    }

    let decorator = cuurDec || tgRef.decorator;
    let metas = ctx.reflects.getMetadata(decorator, ctx.type);
    if (metas.length) {
        let proder = ctx.reflects.getActionInjector().getInstance(DecoratorProvider);
        let merger = proder.resolve(decorator, AnnotationMerger);
        let merged = merger ? merger.merge(metas) : lang.first(metas);
        if (!tgRef.baseURL) {
            tgRef.baseURL = merged.baseURL;
        }
        let cloner: AnnotationCloner;
        tgRef.getAnnoation = <T extends ModuleConfigure>() => {
            let annon = { ...merged };
            if (!cloner) {
                cloner = proder.resolve(decorator, AnnotationCloner);
            }
            if (cloner) {
                annon = cloner.clone(annon);
            }
            return annon as T;
        };

        ctx.set(CTX_MODULE_ANNOATION, tgRef.getAnnoation());
    }
    next();
};
