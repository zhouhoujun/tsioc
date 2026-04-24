import * as assert from 'assert';
import { HttpTransportStrategy } from './HttpTransportStrategy';
import { HttpRequest } from '@tsdi/common/http';
import { HttpClientConfig } from '../options';

describe('HttpTransportStrategy (IClientTransportStrategy)', () => {
  it('connect should mark as connected', async () => {
    const strat = new HttpTransportStrategy();
    await strat.connect();
    assert.ok(strat.isConnected(), 'should be connected after connect()');
  });

  it('createRequest should create HttpRequest from pattern and options', () => {
    const strat = new HttpTransportStrategy();
    const req = strat.createRequest('/test-endpoint', { method: 'GET', observe: 'body' } as any);
    assert.ok(req instanceof HttpRequest, 'should return HttpRequest instance');
    // url should match the pattern
    assert.strictEqual((req as any).url, '/test-endpoint');
  });

  it('initContext should mark request initialized', () => {
    const strat = new HttpTransportStrategy();
    const req = strat.createRequest('/ctx', { method: 'GET' } as any);
    const ctx: any = {};
    strat.initContext(ctx, req);
    assert.ok((req as any).initialized, 'request should be marked as initialized');
  });

  it('onShutdown should reset connection state', async () => {
    const strat = new HttpTransportStrategy();
    await strat.connect();
    await strat.onShutdown();
    assert.strictEqual(strat.isConnected(), false);
  });
});
