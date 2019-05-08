import { CompositeParserHandle } from './ParseHandle';
import { AttrSelectorHandle } from './AttrSelectorHandle';

export class TranslateSelectorScope extends CompositeParserHandle {

    setup() {
        this.use(AttrSelectorHandle);
    }
}
