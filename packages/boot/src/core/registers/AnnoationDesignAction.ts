import { IocDesignAction, DesignActionContext, lang, DecoratorProvider, CTX_CURR_DECOR, ActionInjectorToken } from '@tsdi/ioc';
import { AnnotationMerger } from '../AnnotationMerger';
import { AnnotationCloner } from '../AnnotationCloner';
import { IModuleReflect } from '../modules/IModuleReflect';
import { ModuleConfigure } from '../modules/ModuleConfigure';


export class AnnoationDesignAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let tgRef = ctx.targetReflect as IModuleReflect;
        if (tgRef.getAnnoation) {
            return next();
        }

        let cuurDec = ctx.get(CTX_CURR_DECOR);
        if (!tgRef.decorator) {
            tgRef.decorator = cuurDec;
        }
        tgRef.annoDecoractor = cuurDec;
        let decorator = cuurDec || tgRef.decorator;
        let metas = ctx.reflects.getMetadata(decorator, ctx.targetType);
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
        }
        next();
    }
}
