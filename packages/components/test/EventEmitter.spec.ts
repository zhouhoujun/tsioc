import expect = require('expect');
import { EventEmitter } from '../src/EventEmitter';
import { Subscription } from 'rxjs';

describe('EventEmitter', () => {
    
    describe('constructor', () => {
        it('should create sync emitter by default', () => {
            const emitter = new EventEmitter<string>();
            expect(emitter.async).toBeFalsy();
        });

        it('should create async emitter when specified', () => {
            const emitter = new EventEmitter<string>(true);
            expect(emitter.async).toBeTruthy();
        });
    });

    describe('emit', () => {
        it('should emit value to subscribers', (done) => {
            const emitter = new EventEmitter<string>();
            emitter.subscribe((value) => {
                expect(value).toBe('test');
                done();
            });
            emitter.emit('test');
        });

        it('should emit undefined when no value provided', (done) => {
            const emitter = new EventEmitter<number>();
            emitter.subscribe((value) => {
                expect(value).toBeUndefined();
                done();
            });
            emitter.emit();
        });
    });

    describe('subscribe', () => {
        it('should subscribe with next handler', () => {
            const emitter = new EventEmitter<number>();
            const results: number[] = [];
            
            emitter.subscribe((value) => {
                results.push(value!);
            });
            
            emitter.emit(1);
            emitter.emit(2);
            emitter.emit(3);
            
            expect(results).toEqual([1, 2, 3]);
        });

        it('should subscribe with observer object', () => {
            const emitter = new EventEmitter<string>();
            const results: string[] = [];
            
            emitter.subscribe({
                next: (value: string | undefined) => {
                    results.push(value!);
                }
            });
            
            emitter.emit('a');
            emitter.emit('b');
            
            expect(results).toEqual(['a', 'b']);
        });

        it('should handle error callback', () => {
            const emitter = new EventEmitter<string>();
            let errorCaught = false;
            
            emitter.subscribe({
                next: (_value: string | undefined) => {},
                error: (_err: any) => {
                    errorCaught = true;
                }
            });
            
            emitter.error('test error');
            expect(errorCaught).toBeTruthy();
        });

        it('should handle complete callback', () => {
            const emitter = new EventEmitter<string>();
            let completed = false;
            
            emitter.subscribe({
                next: () => {},
                complete: () => {
                    completed = true;
                }
            });
            
            emitter.complete();
            expect(completed).toBeTruthy();
        });

        it('should return subscription', () => {
            const emitter = new EventEmitter<string>();
            const subscription = emitter.subscribe(() => {});
            expect(subscription).toBeInstanceOf(Subscription);
        });

        it('should allow unsubscribing', () => {
            const emitter = new EventEmitter<number>();
            const results: number[] = [];
            
            const subscription = emitter.subscribe((value) => {
                results.push(value!);
            });
            
            emitter.emit(1);
            subscription.unsubscribe();
            emitter.emit(2);
            
            expect(results).toEqual([1]);
        });
    });

    describe('async mode', () => {
        it('should emit asynchronously', (done) => {
            const emitter = new EventEmitter<string>(true);
            const results: string[] = [];
            
            emitter.subscribe((value) => {
                results.push(value!);
            });
            
            emitter.emit('first');
            results.push('sync');
            
            setTimeout(() => {
                expect(results).toEqual(['sync', 'first']);
                done();
            }, 10);
        });

        it('should handle error asynchronously', (done) => {
            const emitter = new EventEmitter<string>(true);
            let errorCaught = false;
            
            emitter.subscribe({
                next: (_value: string | undefined) => {},
                error: (_err: any) => {
                    errorCaught = true;
                }
            });
            
            emitter.error('test error');
            
            setTimeout(() => {
                expect(errorCaught).toBeTruthy();
                done();
            }, 10);
        });

        it('should handle complete asynchronously', (done) => {
            const emitter = new EventEmitter<string>(true);
            let completed = false;
            
            emitter.subscribe({
                next: () => {},
                complete: () => {
                    completed = true;
                }
            });
            
            emitter.complete();
            
            setTimeout(() => {
                expect(completed).toBeTruthy();
                done();
            }, 10);
        });
    });

    describe('multiple subscribers', () => {
        it('should notify all subscribers', () => {
            const emitter = new EventEmitter<number>();
            const results1: number[] = [];
            const results2: number[] = [];
            
            emitter.subscribe((value) => results1.push(value!));
            emitter.subscribe((value) => results2.push(value!));
            
            emitter.emit(1);
            emitter.emit(2);
            
            expect(results1).toEqual([1, 2]);
            expect(results2).toEqual([1, 2]);
        });
    });
});