import { Abstract } from '@tsdi/ioc';
import { ModuleConfigure } from './modules';

@Abstract()
export abstract class AnnotationCloner<T extends ModuleConfigure = ModuleConfigure>  {
    abstract clone(annotation: T): T;
}
