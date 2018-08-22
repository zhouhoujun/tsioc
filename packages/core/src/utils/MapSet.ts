import { isClass, isString, isFunction, isUndefined } from './typeCheck';
import { lang } from './lang';

/**
 * object map set.
 *
 * @export
 * @class MapSet
 * @template TKey
 * @template TVal
 */
export class ObjectMapSet<TKey, TVal> {
    private valueMap: any;
    private keyMap: any;
    constructor() {
        this.valueMap = {};
        this.keyMap = {};
    }

    clear(): void {
        this.valueMap = {};
        this.keyMap = {};
    }

    getTypeKey(key: TKey) {
        let strKey = '';
        if (isString(key)) {
            strKey = key;
        } else if (isFunction(key)) {
            strKey = key.name;
        } else {
            strKey = key.toString();
        }
        return strKey;
    }

    keys(): TKey[] {
        return lang.values(this.keyMap);
    }

    values(): TVal[] {
        return lang.values(this.valueMap);
    }

    delete(key: TKey): boolean {
        let strkey = this.getTypeKey(key).toString();
        try {
            delete this.keyMap[strkey];
            delete this.valueMap[strkey];
            return true;
        } catch {
            return false;
        }
    }
    forEach(callbackfn: (value: TVal, key: TKey, map: any) => void, thisArg?: any): void {
        lang.forIn<TKey>(this.keyMap, (val, name) => {
            callbackfn(this.valueMap[name], val, this);
        });
    }
    get(key: TKey): TVal {
        let strKey = this.getTypeKey(key);
        return this.valueMap[strKey];
    }
    has(key: TKey): boolean {
        let strKey = this.getTypeKey(key);
        return !isUndefined(this.keyMap[strKey]);
    }
    set(key: TKey, value: TVal): this {
        let strKey = this.getTypeKey(key);

        this.keyMap[strKey] = key;
        this.valueMap[strKey] = value;

        return this;
    }

    get size(): number {
        return lang.keys(this.keyMap).length;
    }
}

/**
 * map set.
 *
 * @export
 * @class MapSet
 * @template TKey
 * @template TVal
 */
export class MapSet<TKey, TVal> {

    private map: ObjectMapSet<TKey, TVal> | Map<TKey, TVal>;
    private hasMap: boolean;
    constructor() {
        this.map = isClass(Map) ? new Map<TKey, TVal>() : new ObjectMapSet<TKey, TVal>();
    }

    keys(): TKey[] {
        return this.map.keys() as TKey[];
    }

    values(): TVal[] {
        return this.map.values()  as TVal[];
    }

    clear(): void {
        this.map.clear();
    }
    delete(key: TKey): boolean {
        return this.map.delete(key);
    }
    forEach(callbackfn: (value: TVal, key: TKey, map: any) => void, thisArg?: any): void {
        let map = this.map as any;
        map.forEach(callbackfn, thisArg);
    }
    get(key: TKey): TVal | undefined {
        return this.map.get(key);
    }
    has(key: TKey): boolean {
        return this.map.has(key);
    }
    set(key: TKey, value: TVal): this {
        this.map.set(key, value);
        return this;
    }
    get size(): number {
        return this.map.size;
    }
}
