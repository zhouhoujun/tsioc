import { Singleton } from '@ts-ioc/ioc';
import { CompositeHandle, AnnoationContext } from '../core';

@Singleton
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

}
