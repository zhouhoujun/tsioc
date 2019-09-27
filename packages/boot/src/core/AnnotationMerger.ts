import { Abstract } from '@tsdi/ioc';
import { ModuleConfigure } from './modules';

@Abstract()
export abstract class AnnotationMerger<T extends ModuleConfigure = ModuleConfigure> {
    abstract merge(configs: T[]): T;
}
