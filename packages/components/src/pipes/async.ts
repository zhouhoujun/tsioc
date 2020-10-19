import { OnDestroy, isPromise, isObservable, lang, Type } from '@tsdi/ioc';
import { Observable, SubscriptionLike } from 'rxjs';
import { PipeTransform } from './pipe';
import { Pipe } from '../decorators';
import { EventEmitter } from '../EventEmitter';
import { ChangeDetectorRef } from '../chage/change';
import { stringify } from '../util/stringify';

/**
 * async pipe.
 */
@Pipe('async', false)
export class AsyncPipe implements OnDestroy, PipeTransform {
    private _latestValue: any = null;

  private _subscription: SubscriptionLike|Promise<any>|null = null;
  private _obj: Observable<any>|Promise<any>|EventEmitter<any>|null = null;
  private _strategy: SubscriptionStrategy = null!;

  constructor(private _ref: ChangeDetectorRef) {}

  onDestroy(): void {
    if (this._subscription) {
      this._dispose();
    }
  }

  transform<T>(obj: null): null;
  transform<T>(obj: undefined): undefined;
  transform<T>(obj: Observable<T>|null|undefined): T|null;
  transform<T>(obj: Promise<T>|null|undefined): T|null;
  transform(obj: Observable<any>|Promise<any>|null|undefined): any {
    if (!this._obj) {
      if (obj) {
        this._subscribe(obj);
      }
      return this._latestValue;
    }

    if (obj !== this._obj) {
      this._dispose();
      return this.transform(obj as any);
    }

    return this._latestValue;
  }

  private _subscribe(obj: Observable<any>|Promise<any>|EventEmitter<any>): void {
    this._obj = obj;
    this._strategy = this._selectStrategy(obj);
    this._subscription = this._strategy.createSubscription(
        obj, (value: Object) => this._updateLatestValue(obj, value));
  }

  private _selectStrategy(obj: Observable<any>|Promise<any>|EventEmitter<any>): any {
    if (isPromise(obj)) {
      return _promiseStrategy;
    }

    if (isObservable(obj)) {
      return _observableStrategy;
    }

    throw invalidPipeArgumentError(AsyncPipe, obj);
  }

  private _dispose(): void {
    this._strategy.dispose(this._subscription!);
    this._latestValue = null;
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

export function invalidPipeArgumentError(type: Type<any>, value: Object) {
  return Error(`InvalidPipeArgument: '${value}' for pipe '${stringify(type)}'`);
}
