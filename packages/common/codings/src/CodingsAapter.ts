import { Type } from '@tsdi/ioc';

/**
 * Codings adapter.
 */
export abstract class CodingsAapter {
    abstract getDefault(type: Type | string): Type | string | undefined
    abstract isCompleted(data: any): boolean;
}


export class CustomCodingsAdapter extends CodingsAapter {

    private maps: Map<Type | string, Type | string>;

    constructor(
        private complete: (data: any) => boolean,
        defaultMaps?: Map<Type | string, Type | string> | Array<[Type | string, Type | string]>
    ) {
        super()
        this.maps = defaultMaps instanceof Map ? defaultMaps : new Map(defaultMaps);
    }

    getDefault(type: Type | string): Type | string | undefined {
        return this.maps.get(type);
    }

    isCompleted(data: any): boolean {
        return this.complete(data)
    }

}