import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AgentOrmModule, AgentConsoleComponent } from '../src';

@Suite('Agents bootstrap')
export class BootstrapTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentOrmModule);
    }

    @Test('can bootstrap hermes module')
    async bootstrap() {
        expect(this.ctx).toBeTruthy();
        expect(this.ctx.get(AgentConsoleComponent)).toBeTruthy();
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
