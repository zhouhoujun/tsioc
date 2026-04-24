import * as assert from 'assert';
import { HttpTimeoutStrategy } from './HttpTimeoutStrategy';
import { RequestContext } from '@tsdi/common';

describe('HttpTimeoutStrategy (ITimeoutStrategy)', () => {
  it('getTimeout should return default timeout', () => {
    const strat = new HttpTimeoutStrategy();
    const t = strat.getTimeout();
    assert.equal(typeof t, 'number');
    // ensure it's a positive number
    assert.ok(t > 0);
  });

  it('createTimeoutError should produce an Error', () => {
    const strat = new HttpTimeoutStrategy();
    const err = strat.createTimeoutError(1000);
    assert.ok(err instanceof Error);
  });
});
