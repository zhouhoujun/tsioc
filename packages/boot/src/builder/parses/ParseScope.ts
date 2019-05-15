import { ParsersHandle } from './ParseHandle';
import { ArrayParseHandle } from './ArrayParseHandle';
import { DefaultParseHandle } from './DefaultParseHandle';
import { SelectorParseHandle } from './SelectorParseHandle';
import { TemplateParseScope } from './TemplateParseScope';
import { TemplateDecoratorRegisterer } from './TemplateDecoratorRegisterer';
import { BindingScopeDecoratorRegisterer } from './BindingScopeDecoratorRegisterer';
import { BindingScopeHandle } from './BindingScopeHandle';


export class ParseScope extends ParsersHandle {

    setup() {
        this.container.register(TemplateDecoratorRegisterer);
        this.container.register(BindingScopeDecoratorRegisterer);

        this.use(ArrayParseHandle)
            .use(BindingScopeHandle)
            .use(TemplateParseScope, true)
            .use(SelectorParseHandle)
            .use(DefaultParseHandle)
    }
}
