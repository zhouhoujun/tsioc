import { CompositeHandle, AnnoationContext } from '../handles';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class ModuleBuildLifeScope extends CompositeHandle<AnnoationContext> {

}
