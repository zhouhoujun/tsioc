import { Type } from '../types';
import { InjectToken } from '../InjectToken';

/**
 * injected type processing manager.
 * used to define injected type specific work.
 *
 * @export
 * @interface IInjectedPipe
 */
export interface IInjectedProcess {
    /**
     * processing type class specific work.
     *
     * @param {Type<any>[]} types
     * @memberof IInjectedProcess
     */
    pipe(types: Type<any>[]);
}

/**
 * injected type processing manager token.
 * used to define injected type specific work.
 */
export const InjectedProcessToken = new InjectToken<IInjectedProcess>('__injected_process');
