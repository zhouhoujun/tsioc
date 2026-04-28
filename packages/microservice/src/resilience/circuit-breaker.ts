import { Injectable, Exception } from '@tsdi/ioc';
import { Observable, throwError, of, catchError, retry, finalize, timer } from 'rxjs';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
    failureRateThreshold?: number;
    slowCallRateThreshold?: number;
    slowCallDurationThreshold?: number;
    minimumNumberOfCalls?: number;
    slidingWindowSize?: number;
    slidingWindowType?: 'COUNT_BASED' | 'TIME_BASED';
    waitDurationInOpenState?: number;
    permittedNumberOfCallsInHalfOpenState?: number;
    automaticTransitionFromOpenToHalfOpenEnabled?: boolean;
}

export interface CircuitBreakerMetrics {
    state: CircuitState;
    failureRate: number;
    slowCallRate: number;
    numberOfCalls: number;
    numberOfFailedCalls: number;
    numberOfSlowCalls: number;
    numberOfSuccessfulCalls: number;
}

@Injectable()
export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failureCount = 0;
    private successCount = 0;
    private slowCallCount = 0;
    private totalCount = 0;
    private lastFailureTime?: number;
    private halfOpenCalls = 0;
    
    private readonly options: Required<CircuitBreakerOptions>;
    
    constructor(options: CircuitBreakerOptions = {}) {
        this.options = {
            failureRateThreshold: options.failureRateThreshold ?? 50,
            slowCallRateThreshold: options.slowCallRateThreshold ?? 100,
            slowCallDurationThreshold: options.slowCallDurationThreshold ?? 2000,
            minimumNumberOfCalls: options.minimumNumberOfCalls ?? 10,
            slidingWindowSize: options.slidingWindowSize ?? 100,
            slidingWindowType: options.slidingWindowType ?? 'COUNT_BASED',
            waitDurationInOpenState: options.waitDurationInOpenState ?? 10000,
            permittedNumberOfCallsInHalfOpenState: options.permittedNumberOfCallsInHalfOpenState ?? 5,
            automaticTransitionFromOpenToHalfOpenEnabled: options.automaticTransitionFromOpenToHalfOpenEnabled ?? true
        };
    }
    
    getState(): CircuitState {
        return this.state;
    }
    
    getMetrics(): CircuitBreakerMetrics {
        const failureRate = this.totalCount > 0 ? (this.failureCount / this.totalCount) * 100 : 0;
        const slowCallRate = this.totalCount > 0 ? (this.slowCallCount / this.totalCount) * 100 : 0;
        
        return {
            state: this.state,
            failureRate,
            slowCallRate,
            numberOfCalls: this.totalCount,
            numberOfFailedCalls: this.failureCount,
            numberOfSlowCalls: this.slowCallCount,
            numberOfSuccessfulCalls: this.successCount
        };
    }
    
    execute<T>(fn: () => Observable<T>): Observable<T> {
        if (this.state === 'OPEN') {
            if (this.shouldTransitionToHalfOpen()) {
                this.transitionToHalfOpen();
            } else {
                return throwError(() => new CircuitBreakerOpenException('Circuit breaker is OPEN'));
            }
        }
        
        if (this.state === 'HALF_OPEN') {
            if (this.halfOpenCalls >= this.options.permittedNumberOfCallsInHalfOpenState) {
                return throwError(() => new CircuitBreakerOpenException('Circuit breaker is OPEN (half-open limit reached)'));
            }
            this.halfOpenCalls++;
        }
        
        const startTime = Date.now();
        
        return fn().pipe(
            catchError(err => {
                this.recordFailure();
                return throwError(() => err);
            }),
            finalize(() => {
                const duration = Date.now() - startTime;
                if (duration > this.options.slowCallDurationThreshold) {
                    this.recordSlowCall();
                }
            }),
            retry(0)
        );
    }
    
    onSuccess(): void {
        this.recordSuccess();
    }
    
    onFailure(): void {
        this.recordFailure();
    }
    
    reset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.slowCallCount = 0;
        this.totalCount = 0;
        this.lastFailureTime = undefined;
        this.halfOpenCalls = 0;
    }
    
    private recordSuccess(): void {
        this.successCount++;
        this.totalCount++;
        
        if (this.state === 'HALF_OPEN') {
            this.transitionToClosed();
        }
        
        this.checkThresholds();
    }
    
    private recordFailure(): void {
        this.failureCount++;
        this.totalCount++;
        this.lastFailureTime = Date.now();
        
        if (this.state === 'HALF_OPEN') {
            this.transitionToOpen();
        }
        
        this.checkThresholds();
    }
    
    private recordSlowCall(): void {
        this.slowCallCount++;
        this.checkThresholds();
    }
    
    private checkThresholds(): void {
        if (this.state === 'CLOSED' && this.totalCount >= this.options.minimumNumberOfCalls) {
            const failureRate = (this.failureCount / this.totalCount) * 100;
            const slowCallRate = (this.slowCallCount / this.totalCount) * 100;
            
            if (failureRate >= this.options.failureRateThreshold || 
                slowCallRate >= this.options.slowCallRateThreshold) {
                this.transitionToOpen();
            }
        }
        
        if (this.options.slidingWindowType === 'COUNT_BASED' && this.totalCount >= this.options.slidingWindowSize) {
            this.resetSlidingWindow();
        }
    }
    
    private resetSlidingWindow(): void {
        const half = Math.floor(this.options.slidingWindowSize / 2);
        this.failureCount = Math.max(0, this.failureCount - half);
        this.successCount = Math.max(0, this.successCount - half);
        this.slowCallCount = Math.max(0, this.slowCallCount - half);
        this.totalCount = Math.max(0, this.totalCount - half);
    }
    
    private transitionToOpen(): void {
        this.state = 'OPEN';
        this.halfOpenCalls = 0;
        
        if (this.options.automaticTransitionFromOpenToHalfOpenEnabled) {
            timer(this.options.waitDurationInOpenState).subscribe(() => {
                if (this.state === 'OPEN') {
                    this.transitionToHalfOpen();
                }
            });
        }
    }
    
    private transitionToHalfOpen(): void {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
    }
    
    private transitionToClosed(): void {
        this.state = 'CLOSED';
        this.halfOpenCalls = 0;
        this.resetSlidingWindow();
    }
    
    private shouldTransitionToHalfOpen(): boolean {
        if (!this.lastFailureTime) return false;
        return Date.now() - this.lastFailureTime >= this.options.waitDurationInOpenState;
    }
}

export class CircuitBreakerOpenException extends Exception {
    constructor(message: string) {
        super(message);
    }
}

export function createCircuitBreaker(options?: CircuitBreakerOptions): CircuitBreaker {
    return new CircuitBreaker(options);
}