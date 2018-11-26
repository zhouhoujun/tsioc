import { NodeActivityContext } from '@taskfr/node';
import { BuildActivity } from './BuildActivity';
import { Inject, Injectable } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken } from '@taskfr/core';
import { CompilerActivity } from './CompilerActivity';
import { BuildHandleActivity } from './BuildHandleActivity';

/**
 * compiler context token.
 */
export const CompilerContextToken = new InjectActivityContextToken(CompilerActivity);

/**
 * build handle activity context.
 *
 * @export
 * @class BuidHandleActivityContext
 * @extends {NodeActivityContext}
 */
@Injectable(CompilerContextToken)
export class CompilerActivityContext extends NodeActivityContext<any> {

    /**
     * the builder
     *
     * @type {BuildActivity}
     * @memberof BuidActivityContext
     */
    builder: BuildActivity;
    handle: BuildHandleActivity;
    input: string[];

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }

}
