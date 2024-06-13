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

    isCompleted(data: any, type: CodingType) {
        if (type == CodingType.Encode) {
            if (this._encodeCompleted) return true;
            if (this.options.encodings?.complete) {
                return this.options.encodings.complete(data)
            } else if (this.options.encodings?.end) {
                return data instanceof this.options.encodings.end
            }
        } else {
            if (this._decodeCompleted) return true;

            if (this.options.decodings?.complete) {
                return this.options.decodings.complete(data)
            } else if (this.options.decodings?.end) {
                return data instanceof this.options.decodings.end
            }
        }
        return false;
    }

    complete(type: CodingType) {
        if (type == CodingType.Encode) {
            this._encodeCompleted = true
        } else {
            this._decodeCompleted = true;
        }
    }

    override onDestroy(): void {
        super.onDestroy();
        this._decodeDefs.clear();
        this._encodeDefs.clear();
    }

}
