import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';

export class DesignPropertyScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Property;
    }
}
