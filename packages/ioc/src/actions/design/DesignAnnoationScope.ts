import { DecoratorType } from '../../factories';
import { DesignDecoratorScope } from './DesignDecoratorScope';

export class DesignAnnoationScope extends DesignDecoratorScope {
    protected getDecorType(): DecoratorType {
        return DecoratorType.Class;
    }
}
