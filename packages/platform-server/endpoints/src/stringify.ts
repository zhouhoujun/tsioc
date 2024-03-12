/* eslint-disable no-control-regex */
/* eslint-disable no-misleading-character-class */
import { Execption, isNumber, isPromise, isString } from '@tsdi/ioc';
import { ev } from '@tsdi/common/transport';
import { Readable } from 'stream';

export class JsonStreamStringify extends Readable {
    private visited!: VisitedWeakMap | VisitedWeakSet;
    private stack: IStackItem[] = [];
    private replacerFunction?: Function;
    private replacerArray?: any[];
    private gap?: string;
    private depth = 0;
    private error?: boolean;
    private pushCalled = false;
    private end = false;
    private isReading = false;
    private readMore = false;

    constructor(value: any, replacer?: Function | any[], spaces?: number | string, private cycle: boolean = false) {
        super({ encoding: 'utf8' });
        const spaceType = typeof spaces;
        if (spaceType === 'string' || spaceType === 'number') {
            this.gap = Number.isFinite(spaces as number) ? ' '.repeat(spaces as number) : spaces as string;
        }
        Object.assign(this, {
            visited: cycle ? new WeakMap() : new WeakSet(),
            replacerFunction: replacer instanceof Function && replacer,
            replacerArray: Array.isArray(replacer) && replacer,
        });
        if (replacer instanceof Function) this.replacerFunction = replacer;
        if (Array.isArray(replacer)) this.replacerArray = replacer;
        this.addToStack(value)
    }

    private cycler(key: string | number | undefined, value: any) {
        const existingPath = (this.visited as VisitedWeakMap).get(value);
        if (existingPath) {
            return {
                $ref: existingPath
            }
        }
        let path = this.path();
        if (key !== undefined) path.push(key);
        path = path.map(v => `[${(Number.isInteger(v as number) ? v : quoteString(v as string))}]`);
        (this.visited as VisitedWeakMap).set(value, path.length ? `$${path.join('')}` : '$');
        return value
    }

    private addToStack(value: any, key?: string, index = -1, parent?: IStackItem) {
        let realValue = value;
        if (this.replacerFunction) {
            realValue = this.replacerFunction(key || index, realValue, this);
        }
        // ORDER?
        if (realValue && realValue.toJSON instanceof Function) {
            realValue = realValue.toJSON();
        }
        if (realValue instanceof Function || typeof value === 'symbol') {
            realValue = undefined;
        }
        if (key !== undefined && this.replacerArray) {
            if (!this.replacerArray.includes(key)) {
                realValue = undefined;
            }
        }
        let type = getType(realValue);
        if (((parent && parent.type === Types.Array) ? true : realValue !== undefined) && type !== Types.Promise) {
            if (parent && !parent.first) {
                this._push(',');
            }
            if (parent) parent.first = false;
        }
        if (realValue !== undefined && type !== Types.Promise && key) {
            if (this.gap) {
                this._push(`\n${this.gap.repeat(this.depth)}"${escapeString(key)}": `);
            } else {
                this._push(`"${escapeString(key)}":`);
            }
        }
        if (type !== Types.Primitive) {
            if (this.cycle) {
                // run cycler
                realValue = this.cycler(key || index, realValue);
                type = getType(realValue);
            } else {
                // check for circular structure
                if (this.visited.has(realValue)) {
                    throw Object.assign(new Error('Converting circular structure to JSON'), {
                        realValue,
                        key: key || index,
                    });
                }
                (this.visited as VisitedWeakSet).add(realValue);
            }
        }

        if (!key && index > -1 && this.depth && this.gap) this._push(`\n${this.gap.repeat(this.depth)}`);

        const open = stackItemOpen[type];
        if (open) this._push(open);

        const obj: IStackItem = {
            key,
            index,
            type,
            parent,
            value: realValue,
            first: true,
        };

        if (type === Types.Object) {
            this.depth += 1;
            obj.unread = Object.keys(realValue);
            obj.isEmpty = !obj.unread.length;
        } else if (type === Types.Array) {
            this.depth += 1;
            obj.unread = realValue.length;
            obj.arrayLength = <number>obj.unread;
            obj.isEmpty = !obj.unread;
        } else if (type === Types.ReadableString || type === Types.ReadableObject) {
            this.depth += 1;
            if (realValue.readableEnded || realValue._readableState?.endEmitted) {
                this.emit(ev.ERROR, new Error('Readable Stream has ended before it was serialized. All stream data have been lost'), realValue, key || index);
            } else if (realValue.readableFlowing || realValue._readableState?.flowing) {
                realValue.pause();
                this.emit(ev.ERROR, new Error('Readable Stream is in flowing mode, data may have been lost. Trying to pause stream.'), realValue, key || index);
            }
            obj.readCount = 0;
            realValue.once(ev.END, () => {
                obj.end = true;
                this.__read();
            });
            realValue.once(ev.ERROR, (err: any) => {
                this.error = true;
                this.emit(ev.ERROR, err);
            });
        }
        this.stack.unshift(obj);
        return obj
    }

    private removeFromStack(item: IStackItem) {
        const {
            type,
        } = item;
        const isObject = type === Types.Object || type === Types.Array || type === Types.ReadableString || type === Types.ReadableObject;
        if (type !== Types.Primitive) {
            if (!this.cycle) {
                this.visited.delete(item.value);
            }
            if (isObject) {
                this.depth -= 1;
            }
        }

        const end = stackItemEnd[type];
        if (isObject && !item.isEmpty && this.gap) this._push(`\n${this.gap.repeat(this.depth)}`);
        if (end) this._push(end);
        const stackIndex = this.stack.indexOf(item);
        this.stack.splice(stackIndex, 1);
    }

    // tslint:disable-next-line:function-name
    private _push(data: any) {
        this.pushCalled = true;
        this.push(data);
    }

    private processReadableObject(current: IStackItem, size: number) {
        if (current.end) {
            this.removeFromStack(current);
            return undefined
        }
        return readAsPromised(current.value, size)
            .then((value) => {
                if (value !== null) {
                    if (!current.first) {
                        this._push(',');
                    }
                    current.first = false;
                    this.addToStack(value, undefined, current.readCount);
                    current.readCount = current.readCount || 0;
                    current.readCount += 1;
                }
            })
    }

    private processObject(current: IStackItemObject) {
        // when no keys left, remove obj from stack
        if (!current.unread.length) {
            this.removeFromStack(current);
            return
        }
        const key = current.unread.shift()!;
        const value = current.value[key];
        this.addToStack(value, key, undefined, current);
    }

    private processArray(current: IStackItemArray) {
        const key = <number>current.unread;
        if (!key) {
            this.removeFromStack(current);
            return
        }
        const index = current.arrayLength - key;
        const value = current.value[index];
        current.unread -= 1;
        this.addToStack(value, undefined, index, current)
    }

    processPrimitive(current: IStackItem) {
        if (current.value !== undefined) {
            const type = typeof current.value;
            let value;
            switch (type) {
                case 'string':
                    value = quoteString(current.value);
                    break;
                case 'number':
                    value = Number.isFinite(current.value) ? String(current.value) : 'null';
                    break;
                case 'bigint':
                    value = String(current.value);
                    break;
                case 'boolean':
                    value = String(current.value);
                    break;
                case 'object':
                    if (!current.value) {
                        value = 'null';
                    }
                    break;
                default:
                    throw this.onError(`Unknown type "${type}". Please file an issue!`, current.value);
            }
            this._push(value);
        } else if (this.stack[1] && (this.stack[1].type === Types.Array || this.stack[1].type === Types.ReadableObject)) {
            this._push('null');
        } else {
            current.addSeparatorAfterEnd = false;
        }
        this.removeFromStack(current);
    }

    onError(msg: string, value?: any) {
        const error = new Execption(msg);
        if (value) {
            (error as any).value = value;
        }
        return error;
    }

    private processReadableString(current: IStackItem, size: number) {
        if (current.end) {
            this.removeFromStack(current);
            return undefined
        }
        return readAsPromised(current.value, size)
            .then((value: any) => {
                if (value) this._push(escapeString(value?.toString()));
            })
    }

    private processPromise(current: IStackItem) {
        return recursiveResolve(current.value).then((value) => {
            this.removeFromStack(current);
            this.addToStack(value, current.key, current.index, current.parent);
        });
    }

    private processStackTopItem(size: number) {
        const current = this.stack[0];
        if (!current || this.error) return Promise.resolve();
        let out;
        try {
            out = (this as any)[processFunctionLookupTable[current.type]](current, size);
        } catch (err) {
            return Promise.reject(err)
        }
        return Promise.resolve(out)
            .then(() => {
                if (this.stack.length === 0) {
                    this.end = true;
                    this._push(null);
                }
            });
    }

    // tslint:disable-next-line:function-name
    private __read(size = 0) {
        if (this.isReading || this.error) {
            this.readMore = true;
            return undefined
        }
        this.isReading = true;

        // we must continue to read while push has not been called
        this.readMore = false;
        return this.processStackTopItem(size)
            .then(() => {
                const readAgain = !this.end && !this.error && (this.readMore || !this.pushCalled);
                if (readAgain) {
                    setImmediate(() => {
                        this.isReading = false;
                        this.__read();
                    });
                } else {
                    this.isReading = false;
                }
            })
            .catch((err) => {
                this.error = true;
                this.emit(ev.ERROR, err);
            });
    }

    // tslint:disable-next-line:function-name
    _read(size: number) {
        this.pushCalled = false;
        this.__read(size);
    }

    path() {
        return this.stack.map(({
            key,
            index,
        }) => key || index).filter(v => isNumber(v) ? v > -1 : v).reverse();
    }
}



const rxEscapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

// table of character substitutions
const meta: any = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\',
};

function isReadableStream(value: any): boolean {
    return typeof value.read === 'function'
        && typeof value.pause === 'function'
        && typeof value.resume === 'function'
        && typeof value.pipe === 'function'
        && typeof value.once === 'function'
        && typeof value.removeListener === 'function';
}

function getType(value: any): Types {
    if (!value) return Types.Primitive;
    if (isPromise(value)) return Types.Promise;
    if (isReadableStream(value)) return value._readableState.objectMode ? Types.ReadableObject : Types.ReadableString;
    if (Array.isArray(value)) return Types.Array;
    if (typeof value === 'object' || value instanceof Object) return Types.Object;
    return Types.Primitive
}

enum Types {
    Array,
    Object,
    ReadableString,
    ReadableObject,
    Primitive,
    Promise,
}

const stackItemOpen: string[] = [];
stackItemOpen[Types.Array] = '[';
stackItemOpen[Types.Object] = '{';
stackItemOpen[Types.ReadableString] = '"';
stackItemOpen[Types.ReadableObject] = '[';

const stackItemEnd: string[] = [];
stackItemEnd[Types.Array] = ']';
stackItemEnd[Types.Object] = '}';
stackItemEnd[Types.ReadableString] = '"';
stackItemEnd[Types.ReadableObject] = ']';

const processFunctionLookupTable: string[] = [];

for (const [key, val] of Object.entries(Types)) {
    if (isNumber(val)) processFunctionLookupTable[val] = `process${key}`;
}

function escapeString(str: string) {
    // Modified code, original code by Douglas Crockford
    // Original: https://github.com/douglascrockford/JSON-js/blob/master/json2.js

    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.

    return str.replace(rxEscapable, (a) => {
        const c = meta[a];
        return isString(c) ? c : `\\u${a.charCodeAt(0).toString(16).padStart(4, '0')}`;
    })
}

function quoteString(string: string) {
    return `"${escapeString(string)}"`
}

function readAsPromised(stream: Readable, size: number) {
    const value = stream.read(size);
    if (value === null) {
        return new Promise((resolve, reject) => {
            const endListener = () => resolve(null);
            stream.once(ev.END, endListener);
            stream.once(ev.ERROR, reject);
            stream.once(ev.READABLE, () => {
                stream.removeListener(ev.END, endListener);
                stream.removeListener(ev.ERROR, reject);
                resolve(stream.read());
            })
        })
    }
    return Promise.resolve(value)
}

function recursiveResolve(promise: Promise<any>): Promise<any> {
    return promise.then(res => isPromise(res) ? recursiveResolve(res) : res)
}

interface IStackItem {
    key?: string;
    index?: number;
    type: Types;
    value: any;
    parent?: IStackItem;
    first: boolean;
    unread?: string[] | number;
    isEmpty?: boolean;
    arrayLength?: number;
    readCount?: number;
    end?: boolean;
    addSeparatorAfterEnd?: boolean;
}

interface IStackItemArray extends IStackItem {
    unread: number;
    isEmpty: boolean;
    arrayLength: number;
}

interface IStackItemObject extends IStackItem {
    unread: string[];
}

type VisitedWeakMap = WeakMap<any, string>;
type VisitedWeakSet = WeakSet<any>;
