import { Abstract } from '@tsdi/ioc';
import { ComponentRef } from './refs/component';

/**
 * component renderer. 
 */
@Abstract()
export abstract class Renderer<T = any> {

    abstract get componentRef(): ComponentRef<T>;

    abstract render(): void;
}
