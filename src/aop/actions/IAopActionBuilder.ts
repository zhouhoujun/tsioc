import { DecoratorType, ActionComponent } from '../../core';
import { AopActions } from './AopActions';

export interface IAopActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: AopActions[]): ActionComponent;
}
