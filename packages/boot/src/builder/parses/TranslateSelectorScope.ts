import { CompositeParserHandle } from './ParseHandle';
import { AttrSelectorHandle } from './AttrSelectorHandle';
import { DecorSelectorHandle } from './DecorSelectorHandle';
import { ParseContext } from './ParseContext';

export class TranslateSelectorScope extends CompositeParserHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        await super.execute(ctx);
        await next();
    }
    setup() {
        this.use(DecorSelectorHandle)
            .use(AttrSelectorHandle);
    }
}
