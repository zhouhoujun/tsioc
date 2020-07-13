import { Directive } from '../decorators/Directive';
import { Input } from '../decorators/Input';
import { ITemplateRef } from '../ComponentRef';

@Directive('[if]')
export class DirectiveIf {
    @Input() if: any;
    @Input() content: ITemplateRef;
}
