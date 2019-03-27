import { DecoratorType } from '../../factories';
import { RuntimeDecoratorScope } from './RuntimeDecoratorScope';

export class RuntimePropertyScope  extends RuntimeDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Property;
    }
}
