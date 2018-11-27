import { BuildActivity } from './BuildActivity';
import { Inject, Injectable, Refs } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken, ActivityContextToken } from '@taskfr/core';
import { BuildHandleActivity } from './BuildHandleActivity';
import { CompilerToken } from './BuildHandle';
import { NodeActivityContext } from './NodeActivity';

/**
 * compiler context token.
 */
export const HandleContextToken = new InjectActivityContextToken(BuildHandleActivity);

/**
 * build handle activity context.
 *
 * @export
 * @class BuidHandleActivityContext
 * @extends {NodeActivityContext}
 */
@Injectable(HandleContextToken)
@Refs(CompilerToken, ActivityContextToken)
export class BuildHandleContext<T> extends NodeActivityContext<T> {

    /**
     * origin build handle
     *
     * @type {BuildHandleActivity}
     * @memberof BuildHandleContext
     */
    origin: BuildHandleActivity;
    /**
     * the builder
     *
     * @type {BuildActivity}
     * @memberof BuidActivityContext
     */
    builder: BuildActivity;
    /**
     * build handle.
     *
     * @type {BuildHandleActivity}
     * @memberof CompilerContext
     */
    handle: BuildHandleActivity;

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }
}

