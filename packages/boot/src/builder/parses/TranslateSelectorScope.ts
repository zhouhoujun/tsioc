import { CompositeParserHandle } from './ParseHandle';
import { AttrSelectorHandle } from './AttrSelectorHandle';
import { DecorSelectorHandle } from './DecorSelectorHandle';

export class TranslateSelectorScope extends CompositeParserHandle {

    setup() {
        this.use(DecorSelectorHandle)
            .use(AttrSelectorHandle);
    }
}
