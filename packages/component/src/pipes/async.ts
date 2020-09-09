import { OnDestroy, isPromise, isObservable, lang } from '@tsdi/ioc';
import { IPipeTransform } from '../bindings/IPipeTransform';
import { Pipe } from '../decorators';
import { Observable, SubscriptionLike } from 'rxjs';
import { EventEmitter } from '../bindings/EventEmitter';
import { ChangeDetectorRef } from '../bindings/change_ref';
import { WrappedValue } from '../bindings/change';


@Pipe('async', false)
export class AsyncPipe implements OnDestroy, IPipeTransform {
    private _latestValue: any = null;
    private _latestReturnedValue: any = null;

    private _subscription: SubscriptionLike | Promise<any> | null = null;
    private _obj: Observable<any> | Promise<any> | EventEmitter<any> | null = null;
    private _strategy: SubscriptionStrategy = null!;

    constructor(private _ref: ChangeDetectorRef) {

    }

    transform(obj: Observable<any> | Promise<any>): any {
        if (!this._obj) {
            if (obj) {
                this._subscribe(obj);
            }
            this._latestReturnedValue = this._latestValue;
            return this._latestValue;
        }

        if (obj !== this._obj) {
            this._dispose();
            return this.transform(obj as any);
        }

        if (looseIdentical(this._latestValue, this._latestReturnedValue)) {
            return this._latestReturnedValue;
        }

        this._latestReturnedValue = this._latestValue;
        return WrappedValue.wrap(this._latestValue);
    }

    onDestroy(): void {
        if (this._subscription) {
            this._dispose();
        }
    }

    private _subscribe(obj: Observable<any> | Promise<any> | EventEmitter<any>): void {
        this._obj = obj;
        this._strategy = this._selectStrategy(obj);
        this._subscription = this._strategy.createSubscription(
            obj, (value: Object) => this._updateLatestValue(obj, value));
    }

    private _selectStrategy(obj: Observable<any> | Promise<any> | EventEmitter<any>): any {
        if (isPromise(obj)) {
            return _promiseStrategy;
        }

        if (isObservable(obj)) {
            return _observableStrategy;
        }

        throw Error(`InvalidPipeArgument: '${obj}' for pipe '${lang.getClassName(this)}'`);
    }

    private _dispose(): void {
        this._strategy.dispose(this._subscription!);
        this._latestValue = null;
        this._latestReturnedValue = null;
        this._subscription = null;
        this._obj = null;
    }

    private _updateLatestValue(async: any, value: Object): void {
        if (async === this._obj) {
            this._latestValue = value;
            this._ref.markForCheck();
        }
    }
}

export function looseIdentical(a: any, b: any): boolean {
    return a === b || typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b);
}

interface SubscriptionStrategy {
    createSubscription(async: Observable<any> | Promise<any>, updateLatestValue: any): SubscriptionLike
        | Promise<any>;
    dispose(subscription: SubscriptionLike | Promise<any>): void;
    onDestroy(subscription: SubscriptionLike | Promise<any>): void;
}

class ObservableStrategy implements SubscriptionStrategy {
    createSubscription(async: Observable<any>, updateLatestValue: any): SubscriptionLike {
        return async.subscribe({ next: updateLatestValue, error: (e: any) => { throw e; } });
    }

    dispose(subscription: SubscriptionLike): void { subscription.unsubscribe(); }

    onDestroy(subscription: SubscriptionLike): void { subscription.unsubscribe(); }
}

class PromiseStrategy implements SubscriptionStrategy {
    createSubscription(async: Promise<any>, updateLatestValue: (v: any) => any): Promise<any> {
        return async.then(updateLatestValue, e => { throw e; });
    }

    dispose(subscription: Promise<any>): void { }

    onDestroy(subscription: Promise<any>): void { }
}

const _promiseStrategy = new PromiseStrategy();
const _observableStrategy = new ObservableStrategy();
