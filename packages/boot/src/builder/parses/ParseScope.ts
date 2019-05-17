import { ParsersHandle } from './ParseHandle';
import { ArrayParseHandle } from './ArrayParseHandle';
import { AssignValueScope } from './AssignValueScope';
import { TemplateParseScope } from './TemplateParseScope';

export class ParseScope extends ParsersHandle {

    setup() {

        this.use(ArrayParseHandle)
            .use(TemplateParseScope, true)
            .use(AssignValueScope, true)
    }
}
