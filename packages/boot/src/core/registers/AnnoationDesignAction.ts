import { IocDesignAction, DesignActionContext, DecoratorProvider, lang } from '@tsdi/ioc';
import { AnnotationMerger } from '../AnnotationMerger';
import { ModuleConfigure, IModuleReflect } from '../modules';


export class AnnoationDesignAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let tgRef = ctx.targetReflect as IModuleReflect;
        if (!tgRef.decorator) {
            tgRef.decorator = ctx.currDecoractor;
        }
        tgRef.annoDecoractor = ctx.currDecoractor;
        let decorator = ctx.currDecoractor || tgRef.decorator;
        let metas = ctx.reflects.getMetadata(decorator, ctx.targetType);
        if (metas.length) {
            let proder = this.container.get(DecoratorProvider);
            if (!tgRef.baseURL) {
                tgRef.baseURL = lang.first(metas).baseURL
            }
            tgRef.getAnnoation = <T extends ModuleConfigure>() => {
                let merger = proder.resolve(decorator, AnnotationMerger);
                let annon: ModuleConfigure;
                if (merger) {
                    annon = merger.merge(metas);
                } else {
                    annon = { ...lang.first(metas) };
                }
                return annon as T;
            };
        }
        next();
    }
}
