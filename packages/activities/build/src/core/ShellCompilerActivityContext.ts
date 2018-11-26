
import { Inject, Injectable } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken } from '@taskfr/core';
import { ShellCompilerActivity } from './CompilerActivity';
import { CompilerActivityContext } from './CompilerActivityContext';


export const ShellCompilerContextToken = new InjectActivityContextToken(ShellCompilerActivity);



/**
 * build handle activity context.
 *
 * @export
 * @class BuidHandleActivityContext
 * @extends {NodeActivityContext}
 */
@Injectable(ShellCompilerContextToken)
export class ShellCompilerActivityContext extends CompilerActivityContext {

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }

}
