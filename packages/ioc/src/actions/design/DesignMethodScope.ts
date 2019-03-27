import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';

export class DesignMethodScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Method;
    }
}
