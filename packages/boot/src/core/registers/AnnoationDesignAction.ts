import { IocDesignAction, DesignActionContext, DecoratorProvider, lang } from '@tsdi/ioc';
import { AnnotationMerger } from '../AnnotationMerger';
import { ModuleConfigure, IModuleReflect } from '../modules';


export class AnnoationDesignAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        if (!ctx.targetReflect.decorator) {
            ctx.targetReflect.decorator = ctx.currDecoractor;
        }
        let decorator = ctx.currDecoractor || ctx.targetReflect.decorator;
        let metas = ctx.reflects.getMetadata(decorator, ctx.targetType);
        let proder = this.container.get(DecoratorProvider);
        (<IModuleReflect>ctx.targetReflect).getAnnoation = () => {
            let merger = proder.resolve(decorator, AnnotationMerger);
            let annon: ModuleConfigure;
            if (merger) {
                annon = merger.merge(metas);
            } else {
                annon = { ...lang.first(metas) };
            }
            return annon;
        };

        next();
    }
}
