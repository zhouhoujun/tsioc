import { IInjector } from './IInjector';

/**
 * root container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IInjector {
    readonly id: string;
}

export type IIocContainer = IContainer;
