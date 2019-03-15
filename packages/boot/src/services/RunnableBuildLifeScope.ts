import { Singleton } from '@ts-ioc/ioc';
import { CompositeHandle, AnnoationContext } from '../handles';

@Singleton
export class RunnableBuildLifeScope extends CompositeHandle<AnnoationContext> {

}
