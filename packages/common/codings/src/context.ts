import { OnDestroy, Type } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { CodingsOpts } from './options';

export enum CodingType {
    Encode,
    Decode
}

/**
 * transprot codings context.
 */
export class CodingsContext<TOpts extends CodingsOpts = CodingsOpts> extends Context implements OnDestroy {


    private _encodeCompleted = false;
    private _decodeCompleted = false;

    private _encodeDefs: Map<Type | string, Type | string>;
    private _decodeDefs: Map<Type | string, Type | string>;

    constructor(readonly options: TOpts) {
        super()
        this._encodeDefs = new Map(this.options.encodings?.defaults);
        this._decodeDefs = new Map(this.options.decodings?.defaults);
    }


    get encodeCompleted(): boolean {
        return this._encodeCompleted;
    }

    get decodeCompleted(): boolean {
        return this._decodeCompleted;
    }

    getDefault(type: Type | string, state: CodingType): Type | string | undefined {
        if (state == CodingType.Encode) {
            return this._encodeDefs.get(type)
        } else {
            return this._decodeDefs.get(type)
        }
    }


    next<TInput>(input: TInput, state: CodingType): this {
        super.next(input, state);
        return this;
    }

    protected onNext(data: any, state: CodingType) {
        super.onNext(data, state);
        if (state == CodingType.Encode) {
            if (this.options.encodings?.complete) {
                this._encodeCompleted = this.options.encodings.complete(data)
            } else if (this.options.encodings?.end) {
                if (data instanceof this.options.encodings.end) {
                    this._encodeCompleted = true;
                }
            }
        } else {
            if (this.options.decodings?.complete) {
                this._decodeCompleted = this.options.decodings.complete(data)
            } else if (this.options.decodings?.end) {
                if (data instanceof this.options.decodings.end) {
                    this._decodeCompleted = true;
                }
            }
        }
    }

    complete(type: CodingType) {
        if (type == CodingType.Encode) {
            this._encodeCompleted = true
        } else {
            this._decodeCompleted = true;
        }
    }

}
