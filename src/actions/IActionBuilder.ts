import { DecoratorType } from '../decorators';
import { ActionType } from './ActionType';
import { ActionComponent } from './ActionComponent';

export interface IActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: ActionType[]): ActionComponent;
}
