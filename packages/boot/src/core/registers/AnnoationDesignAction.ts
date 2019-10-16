import { IocDesignAction, DesignActionContext, lang, DecoratorProvider } from '@tsdi/ioc';
import { AnnotationMerger } from '../AnnotationMerger';
import { ModuleConfigure, IModuleReflect } from '../modules';
import { AnnotationCloner } from '../AnnotationCloner';


export class AnnoationDesignAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let tgRef = ctx.targetReflect as IModuleReflect;
        if (tgRef.getAnnoation) {
            return next();
        }

        if (!tgRef.decorator) {
            tgRef.decorator = ctx.currDecoractor;
        }
        tgRef.annoDecoractor = ctx.currDecoractor;
        let decorator = ctx.currDecoractor || tgRef.decorator;
        let metas = ctx.reflects.getMetadata(decorator, ctx.targetType);
        if (metas.length) {
            let proder = this.container.getInstance(DecoratorProvider);
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
