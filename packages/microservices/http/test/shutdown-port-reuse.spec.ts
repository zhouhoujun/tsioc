/**
 * TDD: verify port is properly released after shutdown.
 * If onShutdown() doesn't release the port, the second
 * Application.run() will throw EADDRINUSE.
 */
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useRouter, Controller, Get } from '@tsdi/service';
import { useHttpTransport } from '../src/server';
import expect = require('expect');

const PORT = 3000;

@Controller()
class PingCtrl {
  @Get('/ping') ping() { return 'pong'; }
}

function createModule() {
  @Module({
    imports: [LoggerModule],
    declarations: [PingCtrl],
    providers: [
      provideService(
        useRouter(),
        useHttpTransport({
          listenOpts: { port: PORT, host: '127.0.0.1' },
          asDefault: true,
        }),
      ),
    ],
  })
  class TestApp {}
  return TestApp;
}

describe('HTTP shutdown port release', () => {
  it('should start first app on port ' + PORT, async () => {
    const ctx = await Application.run(createModule());
    expect(ctx).toBeDefined();
    await ctx.close();
  });

  it('should start second app on same port after close', async () => {
    // If port wasn't released, this throws EADDRINUSE
    const ctx = await Application.run(createModule());
    expect(ctx).toBeDefined();
    await ctx.close();
  });
});
