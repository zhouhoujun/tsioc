import { CompositeParserHandle } from './ParseHandle';
import { ArrayParseHandle } from './ArrayParseHandle';
import { DefaultParseHandle } from './DefaultParseHandle';
import { ObjectMapParseHandle } from './ObjectMapParseHandle';
import { TranslateSelectorScope } from './TranslateSelectorScope';
import { SelectorDecoratorRegisterer } from './SelectorDecoratorRegisterer';


export class ParseScope extends CompositeParserHandle {

    setup() {
        this.container.register(SelectorDecoratorRegisterer);
        this.use(ArrayParseHandle)
            .use(TranslateSelectorScope, true)
            .use(ObjectMapParseHandle)
            .use(DefaultParseHandle)
    }
}
