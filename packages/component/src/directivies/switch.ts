import { Directive } from '../decorators/Directive';
import { Input } from '../decorators/Input';
import { ITemplateRef } from '../ComponentRef';

@Directive('[case]')
export class DirectiveCase {
    @Input() case: any;
    @Input() content: ITemplateRef;
}


@Directive('[caseDefault]')
export class DirectiveCaseDefault {
    @Input() content: ITemplateRef;
}


@Directive('[switch]')
export class DirectiveSwitch {
    @Input() switch: any;
    @Input() cases: DirectiveCase[];
    @Input() caseDefault: DirectiveCaseDefault;
}
