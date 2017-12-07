import { DecoratorType } from '../factories';
import { CoreActions } from './CoreActions';
import { ActionComponent } from './ActionComponent';

export interface ICoreActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: CoreActions[]): ActionComponent;
}
