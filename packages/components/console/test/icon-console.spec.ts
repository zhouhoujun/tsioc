import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule } from '../src';
import { TuiRenderer } from '../src/tui';
import { IconModule } from '@tsdi/components/common/icon';

@Component({
    selector: 'icon-console-host',
    imports: [IconModule],
    template: `
    <div>
        <icon name="{{name}}"></icon>
        <icon name="{{item.icon}}" v-for="item in items"></icon>
    </div>`
})
class IconConsoleHostComponent {
    name = 'run';
    items = [{ icon: 'check' }];
}

@Suite('console icon interpolation')
export class IconConsoleTest {
    @Test('renders interpolated icon names and updates them in place')
    async rendersInterpolatedIcons() {
        const ctx = await Application.run(IconConsoleHostComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule, IconModule]
        });
        try {
            const ref = ctx.runners.getRef(IconConsoleHostComponent) as ComponentRef<IconConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            await Promise.resolve();
            const renderer = new TuiRenderer();
            const root = ref.hostView.rootNodes[0] as any;

            expect(renderer.renderToLines(root).join('\n')).toContain('▶');
            expect(renderer.renderToLines(root).join('\n')).toContain('✓');

            ref.instance.name = 'check';
            ref.instance.items = [{ icon: 'stop' }];
            await Promise.resolve();
            await Promise.resolve();

            const updated = renderer.renderToLines(root).join('\n');
            expect(updated).toContain('✓');
            expect(updated).toContain('■');
        } finally {
            await ctx.close();
        }
    }
}
