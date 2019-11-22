import { IDesignDecorators } from '../services';
import { ObjectMap } from '../types';
import { TypeDecorators } from './TypeDecorators';

/**
 * design decorators.
 *
 * @export
 * @class DesignDecorators
 * @implements {IDesignDecorators}
 */
export class DesignDecorators extends TypeDecorators implements IDesignDecorators {

    private _clsDecorSt: any;
    get classDecorState(): ObjectMap<boolean> {
        if (!this._clsDecorSt) {
            this._clsDecorSt = this.classDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._clsDecorSt;
    }

    private _prsDecorSt: any;
    get propsDecorState(): ObjectMap<boolean> {
        if (!this._prsDecorSt) {
            this._prsDecorSt = this.propsDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._prsDecorSt;
    }

    private _mthDecorSt: any;
    get methodDecorState(): ObjectMap<boolean> {
        if (!this._mthDecorSt) {
            this._mthDecorSt = this.methodDecors
                .reduce((obj, dec) => {
                    obj[dec] = false;
                    return obj;
                }, {});
        }
        return this._mthDecorSt;
    }

    reset() {
        super.reset();
        this._clsDecorSt = null;
        this._mthDecorSt = null;
        this._prsDecorSt = null;
    }
}
