import { Observable } from 'rxjs';
import { SubjectEmitter } from '@tsdi/core';
import { arrayEquals, flatten } from '../util/array';

/**
 * symbol iterator.
 * @param this query list.
 */
function symbolIterator<T>(this: QueryList<T>): Iterator<T> {
  return ((this as any as { _results: Array<T> })._results as any)[Symbol.iterator]();
}

/**
 * An unmodifiable list of items that keeps up to date when the state
 * of the application changes.
 *
 * The type of object that {@link ViewChildren}, {@link ContentChildren}, and {@link QueryList}
 * provide.
 *
 * Implements an iterable interface, therefore it can be used in both ES6
 * javascript `for (var i of items)` loops as well as in templates with
 * `*ngFor="let i of myList"`.
 *
 * Changes can be observed by subscribing to the changes `Observable`.
 *
 * NOTE: In the future this class will implement an `Observable` interface.
 *
 * @usageNotes
 * ### Example
 * ```typescript
 * @Component({...})
 * class Container {
 *   @ViewChildren(Item) items:QueryList<Item>;
 * }
 * ```
 *
 * @publicApi
 */
export class QueryList<T> implements Iterable<T> {
  public readonly dirty = true;
  private _results: Array<T> = [];
  private _changesDetected = false;
  private _changes: SubjectEmitter<QueryList<T>> | null = null;

  readonly length: number = 0;
  readonly first!: T;
  readonly last!: T;

  constructor(private _emitDistinctChangesOnly: boolean = false) {
    // This function should be declared on the prototype, but doing so there will cause the class
    // declaration to have side-effects and become not tree-shakable. For this reason we do it in
    // the constructor.
    // [getSymbolIterator()](): Iterator<T> { ... }
    const symbol = Symbol.iterator;
    const proto = QueryList.prototype as any;
    if (!proto[symbol]) proto[symbol] = symbolIterator;
  }


  /**
   * Returns `Observable` of `QueryList` notifying the subscriber of changes.
   */
  get changes(): Observable<any> {
    return this._changes || (this._changes = new SubjectEmitter());
  }

  /**
   * Returns the QueryList entry at `index`.
   */
  get(index: number): T | undefined {
    return this._results[index];
  }

  /**
   * See
   * [Array.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
   */
  map<U>(fn: (item: T, index: number, array: T[]) => U): U[] {
    return this._results.map(fn);
  }

  /**
   * See
   * [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
   */
  filter(fn: (item: T, index: number, array: T[]) => boolean): T[] {
    return this._results.filter(fn);
  }

  /**
   * See
   * [Array.find](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find)
   */
  find(fn: (item: T, index: number, array: T[]) => boolean): T | undefined {
    return this._results.find(fn);
  }

  /**
   * See
   * [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
   */
  reduce<U>(fn: (prevValue: U, curValue: T, curIndex: number, array: T[]) => U, init: U): U {
    return this._results.reduce(fn, init);
  }

  /**
   * See
   * [Array.forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
   */
  forEach(fn: (item: T, index: number, array: T[]) => void): void {
    this._results.forEach(fn);
  }

  /**
   * See
   * [Array.some](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some)
   */
  some(fn: (value: T, index: number, array: T[]) => boolean): boolean {
    return this._results.some(fn);
  }

  /**
   * Returns a copy of the internal results list as an Array.
   */
  toArray(): T[] {
    return this._results.slice();
  }

  toString(): string {
    return this._results.toString();
  }

  /**
   * Updates the stored data of the query list, and resets the `dirty` flag to `false`, so that
   * on change detection, it will not notify of changes to the queries, unless a new change
   * occurs.
   *
   * @param resultsTree The query results to store
   * @param identityAccessor Optional function for extracting stable object identity from a value
   *    in the array. This function is executed for each element of the query result list while
   *    comparing current query list with the new one (provided as a first argument of the `reset`
   *    function) to detect if the lists are different. If the function is not provided, elements
   *    are compared as is (without any pre-processing).
   */
  reset(resultsTree: Array<T | any[]>, identityAccessor?: (value: T) => unknown): void {
    // Cast to `QueryListInternal` so that we can mutate fields which are readonly for the usage of
    // QueryList (but not for QueryList itself.)
    const self = this as QueryListInternal<T>;
    (self as { dirty: boolean }).dirty = false;
    const newResultFlat = flatten(resultsTree);
    this._changesDetected = !arrayEquals(self._results, newResultFlat, identityAccessor);
    if (this._changesDetected) {
      self._results = newResultFlat;
      self.length = newResultFlat.length;
      self.last = newResultFlat[this.length - 1];
      self.first = newResultFlat[0];
    }
  }

  /**
   * Triggers a change event by emitting on the `changes` {@link SubjectEmitter}.
   */
  notifyOnChanges(): void {
    if (this._changes && (this._changesDetected || !this._emitDistinctChangesOnly)) this._changes.emit(this);
  }

  /** internal */
  setDirty() {
    (this as { dirty: boolean }).dirty = true;
  }

  /** internal */
  destroy(): void {
    (this.changes as SubjectEmitter<any>).complete();
    (this.changes as SubjectEmitter<any>).unsubscribe();
  }


  [Symbol.iterator](): Iterator<T, any, undefined> {
    return (this._results as any)[Symbol.iterator]();
  }

}


/**
 * Internal set of APIs used by the framework. (not to be made public)
 */
interface QueryListInternal<T> extends QueryList<T> {
  reset(a: any[]): void;
  notifyOnChanges(): void;
  length: number;
  last: T;
  first: T;
}
