import { Directive } from '../decorators';
import { DirectiveIf } from './if';

/**
 * else if directive.
 */
@Directive('[elseif]')
export class DirectiveElseIf extends DirectiveIf {

}
