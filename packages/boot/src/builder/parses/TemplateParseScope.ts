import { ParsersHandle } from './ParseHandle';
import { AttrSelectorHandle } from './AttrSelectorHandle';
import { DecorTemplateParseHandle } from './DecorTemplateParseHandle';
import { ParseContext } from './ParseContext';
import { isNullOrUndefined } from '@tsdi/ioc';

export class TemplateParseScope extends ParsersHandle {
    async execute(ctx: ParseContext, next?: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        if (isNullOrUndefined(ctx.value) && next) {
            await next();
        }
    }
    setup() {
        this.use(DecorTemplateParseHandle)
            .use(AttrSelectorHandle);
    }
}
