import { DesignContext, lang, DecoratorProvider, CTX_CURR_DECOR, IProviders } from '@tsdi/ioc';
import { AnnotationMerger } from '../services/AnnotationMerger';
import { AnnotationCloner } from '../services/AnnotationCloner';
import { IModuleReflect } from '../modules/IModuleReflect';
import { ModuleConfigure } from '../modules/ModuleConfigure';
import { CTX_MODULE_ANNOATION } from '../context-tokens';


export const AnnoationDesignAction = function (ctx: DesignContext, next: () => void): void {
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
        let proder: IProviders;
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
        let cloner = proder?.getInstance(AnnotationCloner);
        tgRef.getAnnoation = <T extends ModuleConfigure>() => {
            return cloner ? cloner.clone(merged) : { ...merged };
        };

        ctx.setValue(CTX_MODULE_ANNOATION, tgRef.getAnnoation());
    }
    next();
};
