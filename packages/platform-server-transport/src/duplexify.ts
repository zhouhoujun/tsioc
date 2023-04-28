import { isFunction, isNil } from '@tsdi/ioc';
import { Duplex, Readable, Writable, DuplexOptions, finished } from 'stream';
import { ev } from '@tsdi/transport';

/**
 * duplexify options.
 */
export interface DuplexifyOptions extends DuplexOptions {
    forwardDestroy?: boolean;
    end?: boolean;
}

/**
 * Duplexify
 */
export class Duplexify extends Duplex {

    protected _autoDestroy: boolean;
    protected _forwardDestroy: boolean;
    protected _forwardEnd: boolean;
    protected _corked = 1; // start corked
    protected _ondrain: Function | null = null;
    protected _drained = false;
    protected _forwarding = false;
    protected _unwrite: Function | null = null;
    protected _unread: Function | null = null;
    protected _ended = false;

    protected _readableState!: ReadableState;
    protected _writableState!: WritableState;
    protected _readable2: Readable | null;
    protected _readable: Readable | null;
    protected _writable: Writable | null;

    constructor(writable: Writable | null | false, readable: Readable | null | false, opts?: DuplexifyOptions) {
        super(opts);
        this._readable2 = null;
        this._readable = null;
        this._writable = null;
        this._autoDestroy = opts?.autoDestroy !== false;
        this._forwardDestroy = opts?.forwardDestroy !== false;
        this._forwardEnd = opts?.end !== false;
        this.destroyed = false;

        // for node <=17
        if (isNil((this as any).closed)) {
            (this as any).closed = false;
            this.on(ev.CLOSE, () => {
                (this as any).closed = true;
            })
        }

        if (writable) this.setWritable(writable);
        if (readable) this.setReadable(readable);
    }

    /**
     * is closed or not.
     * Is true after 'close' has been emitted.
     * 
     * @since v18.0.0 has `closed` property.
     */
    get isClosed() {
        return (this as any).closed;
    }

    static obj(writable: Writable | null | false, readable: Readable | null | false, opts?: DuplexifyOptions) {
        opts = { highWaterMark: 16, objectMode: true, ...opts };
        return new Duplexify(writable, readable, opts);
    }

    cork() {
        if (++this._corked === 1) this.emit(ev.CORK)
    }

    uncork() {
        if (this._corked && --this._corked === 0) this.emit(ev.UNCORK)
    }


    setWritable(writable: Writable | false): void {
        if (this._unwrite) this._unwrite()

        if (this.destroyed) {
            if (writable && writable.destroy) writable.destroy();
            return
        }

        if (writable === null || writable === false) {
            this.end();
            return
        }

        const unend = finished(writable, { writable: true, readable: false }, (err) => this.onEnding(err, this._forwardEnd))

        const ondrain = () => {
            const ondrain = this._ondrain;
            this._ondrain = null;
            if (ondrain) ondrain()
        }

        const clear = () => {
            this._writable?.removeListener(ev.DRAIN, ondrain);
            unend()
        }

        if (this._unwrite) process.nextTick(ondrain); // force a drain on stream reset to avoid livelocks

        this._writable = writable;
        this._writable.on(ev.DRAIN, ondrain);
        this._unwrite = clear;

        this.uncork() // always uncork setWritable
    }


    setReadable(readable: Readable | false): void {
        if (this._unread) this._unread()

        if (this.destroyed) {
            if (readable && readable.destroy) readable.destroy()
            return
        }

        if (readable === null || readable === false) {
            this.push(null);
            this.resume();
            return
        }


        const unend = finished(readable, { writable: false, readable: true }, (err) => this.onEnding(err));

        const onreadable = () => this._forward();

        const onend = () => this.push(null);

        const clear = () => {
            this._readable2?.removeListener(ev.READABLE, onreadable);
            this._readable2?.removeListener(ev.END, onend);
            unend()
        }

        this._drained = true;
        this._readable = readable;
        this._readable2 = readable instanceof Readable ? readable : new Readable({ objectMode: true, highWaterMark: 16 }).wrap(readable);
        this._readable2.on(ev.READABLE, onreadable);
        this._readable2.on(ev.END, onend);
        this._unread = clear;

        this._forward()
    }

    override _read(size?: number): void {
        this._drained = true;
        this._forward()
    }

    protected _forward() {
        if (this._forwarding || !this._readable2 || !this._drained) return
        this._forwarding = true

        let data: any;

        while (this._drained && (data = shiftStream(this._readable2)) !== null) {
            if (this.destroyed) continue;
            this._drained = this.push(data);
        }

        this._forwarding = false
    }

    override _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void): void {
        if (this.destroyed) return
        if (this._corked) return this.onuncork(() => this._writing(chunk, encoding, cb))
        if (chunk === SIGNAL_FLUSH) return this._finish(cb)

        this._writing(chunk, encoding, cb);

    }

    protected _writing(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void) {
        if (!this._writable) return cb();
        if (this._writable.write(chunk) === false) this._ondrain = cb;
        else if (!this.destroyed) cb()
    }

    override end(cb?: (() => void) | undefined): this;
    override end(chunk: any, cb?: (() => void) | undefined): this;
    override end(chunk: any, encoding?: BufferEncoding | undefined, cb?: (() => void) | undefined): this;
    override end(chunk?: any, encoding?: any, cb?: (() => void) | undefined): this {
        if (isFunction(chunk)) {
            cb = chunk;
            chunk = null;
        } else if (isFunction(encoding)) {
            cb = encoding
            encoding = 'utf8';
        }
        this._ending(chunk, encoding, cb);
        return this;

    }

    protected _ending(chunk?: any, encoding?: BufferEncoding, cb?: (() => void) | undefined): void {
        this._ended = true;
        if (chunk) this.write(chunk);
        if (!this.writableEnded && this._writable?.destroyed !== true) this.write(SIGNAL_FLUSH);
        super.end(null, encoding, cb)
    }

    _finish(cb: (error?: Error | null | undefined) => void) {
        this.emit(ev.PREEND);
        this.onuncork(() => {
            end(this._forwardEnd && this._writable, () => {
                // haxx to not emit prefinish twice
                if ((this as any)._writableState.prefinished === false) {
                    (this as any)._writableState.prefinished = true;
                    this.emit(ev.PREFINISH);
                }
                this.onuncork(cb);
            })
        })
    }

    override destroy(error?: Error | null, callback?: (err?: Error | null) => void): this {
        const cb = callback ?? noop;
        if (this.destroyed) {
            cb(null)
            return this;
        }
        this.destroyed = true

        process.nextTick(() => {
            this._destroy(error ?? null, cb)
        })
        return this;
    }

    override _destroy(err: Error | null, cb: (error: Error | null) => void): void {
        if (err) {
            const ondrain = this._ondrain;
            this._ondrain = null;
            if (ondrain) ondrain(err)
            else this.emit(ev.ERROR, err)
        }

        if (this._forwardDestroy) {
            if (this._readable && this._readable.destroy) this._readable.destroy();
            if (this._writable && this._writable.destroy) this._writable.destroy();
        }
        super._destroy(err, cb);
    }

    protected onEnding(err: Error | null | undefined, end?: boolean) {
        if (err) {
            if (this._autoDestroy) this.destroy(err.message === 'premature close' ? null : err);
        } else if (end && !this._ended) {
            this.end()
        }
    }

    protected onuncork(fn: () => void) {
        if (this._corked) {
            this.once(ev.UNCORK, fn);
        } else {
            fn();
        }
    }
}


const noop = () => { };
export const SIGNAL_FLUSH = Buffer.from([0]);

const end = (ws: any, fn: Function) => {
    if (!ws) return fn()
    if (ws._writableState && ws._writableState.finished) return fn()
    if (ws._writableState) return ws.end(fn)
    ws.end();
    fn();
}

export function shiftStream(stream: Readable) {
    const rs = (stream as any)._readableState as ReadableState;
    if (!rs) return null;
    return (stream.readableObjectMode || typeof (stream as any)._duplexState === 'number') ? stream.read() : stream.read(getStateLength(rs))
}

function getStateLength(state: ReadableState) {
    if (state.buffer.length) {
        if (state.buffer.head) {
            return state.buffer.head.data.length
        }
        return state.buffer[0].length
    }

    return state.length
}


export interface WritableState {
    buffer: any;
    objectMode: boolean;
    highWaterMark: number;
    finalCalled: boolean;
    needDrain: boolean;
    ending: boolean;
    ended: boolean;
    finished: boolean;
    destroyed: boolean;
    decodeStrings: boolean;
    defaultEncoding: BufferEncoding;
    length: number;
    writing: boolean;
    corked: number;
    sync: boolean;
    bufferProcessing: boolean;
    writelen: number;
    pendingcb: number;
    prefinished: boolean;
    errorEmitted: boolean;
    bufferedRequestCount: number;
    writecb: ((err?: Error | null) => void) | null;
    onwrite: (er?: Error | null) => any;
    bufferedRequest: any | null;
    lastBufferedRequest: any | null;
    getBuffer(): any[];
}

export interface ReadableState {
    objectMode: boolean;
    highWaterMark: number;
    buffer: any;
    length: number;
    pipes: any;
    pipesCount: number;
    flowing: any;
    ended: boolean;
    endEmitted: boolean;
    reading: boolean;
    sync: boolean;
    needReadable: boolean;
    emittedReadable: boolean;
    readableListening: boolean;
    resumeScheduled: boolean;
    destroyed: boolean;
    awaitDrain: number;
    defaultEncoding: BufferEncoding;
    readingMore: boolean;
    decoder: any;
    encoding: BufferEncoding | null;
}
