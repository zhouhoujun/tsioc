import { CompositeParserHandle } from './ParseHandle';
import { ArrayParseHandle } from './ArrayParseHandle';
import { DefaultParseHandle } from './DefaultParseHandle';
import { SelectorParseHandle } from './SelectorParseHandle';
import { TemplateParseScope } from './TemplateParseScope';
import { DecoratorTemplateRegisterer } from './DecoratorTemplateRegisterer';


export class ParseScope extends CompositeParserHandle {

    setup() {
        this.container.register(DecoratorTemplateRegisterer);
        this.use(ArrayParseHandle)
            .use(TemplateParseScope, true)
            .use(SelectorParseHandle)
            .use(DefaultParseHandle)
    }
}
