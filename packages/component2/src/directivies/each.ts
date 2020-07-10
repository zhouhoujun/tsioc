import { Directive } from '../decorators/Directive';
import { Input } from '../decorators/Input';
import { ITemplateRef } from '../ComponentRef';

export type DIterable<T> = Array<T>| Iterable<T>;

@Directive('[each][forEach]')
export class DirectiveEach<T> {

    @Input() each: DIterable<T>;

    @Input() content: ITemplateRef;

}
