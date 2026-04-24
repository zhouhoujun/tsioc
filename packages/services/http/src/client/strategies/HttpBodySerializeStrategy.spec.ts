import * as assert from 'assert';
import { HttpBodySerializeStrategy } from './HttpBodySerializeStrategy';
import { RequestContext } from '@tsdi/common';

describe('HttpBodySerializeStrategy (IBodySerializeStrategy)', () => {
  it('serialize should stringify objects and pass through strings', () => {
    const strat = new HttpBodySerializeStrategy();
    const ctx = new RequestContext();
    const obj = { a: 1 };
    const serialized = strat.serialize(obj, ctx);
    assert.equal(typeof serialized, 'string');
    // should be JSON string
    assert.ok((serialized as string).includes('a'));
  });

  it('detectContentType should detect json for objects', () => {
    const strat = new HttpBodySerializeStrategy();
    const type = strat.detectContentType({ x: 1 });
    assert.equal(type, 'application/json');
  });

  it('canHandle should always return true for now', () => {
    const strat = new HttpBodySerializeStrategy();
    const can = strat.canHandle(123);
    assert.equal(can, true);
  });
});
