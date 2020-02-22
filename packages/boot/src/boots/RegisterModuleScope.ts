import { isBaseType, IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { AnnoationContext } from '../AnnoationContext';
import { RegisterAnnoationHandle } from './RegisterAnnoationHandle';
import { BootContext } from '../BootContext';
import { AnnotationMerger } from '../services/AnnotationMerger';
import { CTX_APP_CONFIGURE } from '../context-tokens';


export class RegisterModuleScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    async execute(ctx: BootContext, next?: () => Promise<void>): Promise<void> {
        if (!(ctx instanceof BootContext)) {
            return;
        }
        if (!ctx.type) {
            if (ctx.getTemplate() && next) {
                return await next();
            }
            return;
        }
        if (isBaseType(ctx.type)) {
            return;
        }
        let annoation = ctx.getAnnoation();
        // has module register or not.
        if (!ctx.reflects.hasRegister(ctx.type)) {
            await super.execute(ctx);
            annoation = ctx.getAnnoation();
            if (annoation) {
                let config = ctx.getConfiguration();
                let merger = ctx.getTargetReflect().getDecorProviders?.().getInstance(AnnotationMerger);
                config = merger ? merger.merge([config, annoation]) : Object.assign({}, config, annoation);
                ctx.setValue(CTX_APP_CONFIGURE, config);
            }
        }
        if (annoation && next) {
            await next();
        }
    }
    setup() {
        this.use(RegisterAnnoationHandle);
    }
}
