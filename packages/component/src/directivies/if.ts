import { Directive, Input } from '../decorators';
import { ITemplateRef } from '../ComponentRef';

@Directive('[if]')
export class DirectiveIf {
    @Input() if: any;
    @Input() content: ITemplateRef;
}
