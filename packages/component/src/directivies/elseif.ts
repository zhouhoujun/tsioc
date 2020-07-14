import { Directive } from '../decorators/Directive';
import { DirectiveIf } from './if';

/**
 * else if directive.
 */
@Directive('[elseif]')
export class DirectiveElseIf extends DirectiveIf {

}
