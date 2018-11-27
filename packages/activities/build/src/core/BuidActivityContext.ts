import { NodeActivityContext } from '@taskfr/node';
import { Inject, Injectable, isArray } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken } from '@taskfr/core';
import { BuildActivity } from './BuildActivity';

/**
 * build activity context.
 */
export const BuidActivityContextToken = new InjectActivityContextToken(BuildActivity);

/**
 * build activity context.
 *
 * @export
 * @class BuidActivityContext
 * @extends {NodeActivityContext}
 */
@Injectable(BuidActivityContextToken)
export class BuidActivityContext extends NodeActivityContext<string[]> {

    /**
     * all files input to handle.
     *
     * @type {string[]}
     * @memberof BuidActivityContext
     */
    input: any;

    /**
     * the builder
     *
     * @type {BuildActivity}
     * @memberof BuidActivityContext
     */
    builder: BuildActivity;

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }
    /**
     * is completed or not.
     *
     * @returns {boolean}
     * @memberof BuidActivityContext
     */
    isCompleted(): boolean {
        return !this.result || this.result.length < 1;
    }

    protected translate(data: any): any {
        let re = super.translate(data);
        return isArray(re) ? re : [re];
    }

    /**
     * set complete files.
     *
     * @param {string[]} files
     * @memberof BuidActivityContext
     */
    complete(files: string[]) {
        this.result = this.result.filter(f => files.indexOf(f) < 0);
    }

}
