import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule, COMPONENTDEF } from '@tsdi/components';
import { TuiTemplateModule, ConsoleElement, PanelComponent } from './src';

@Component({
    selector: 'console-fold-panel-test',
    imports: [PanelComponent],
    template: `
        <panel>
            <panel-header>Preview</panel-header>
            <panel-summary>line 1\nline 2\n… 2 more lines</panel-summary>
            <panel-body>line 1\nline 2\nline 3\nline 4</panel-body>
        </panel>
    `
})
class ConsoleFoldPanelTestComponent {
}

async function dump(node: any, depth: number) {
    const pad = '  '.repeat(depth);
    if (node.nodeType === 3) {
        console.log(pad + 'TEXT:', JSON.stringify(node.textContent?.slice(0, 60)));
        return;
    }
    const attrs: Record<string, string> = {};
    (node.attributes || []).forEach?.((a: any) => { attrs[a.name] = a.value; });
    const keys = Object.keys(node).filter(k => k.startsWith('__'));
    console.log(pad + `<${node.tagName}>`, JSON.stringify(attrs), 'symbols:', keys.join(','));
    const dirs = (node as any)[Symbol.for('__DIRECTIVES')];
    const custs = (node as any)[Symbol.for('__CUSTOM_ELEMENTS')];
    const cdef = (node as any)[Symbol.for('__COMPONENTDEF')];
    if (dirs?.length) console.log(pad + '  DIRECTIVES:', dirs.map((d: any) => d.type?.name).join(','));
    if (custs?.length) console.log(pad + '  CUSTOM_ELEMENTS:', custs.map((d: any) => d.type?.name).join(','));
    if (cdef) console.log(pad + '  COMPONENTDEF:', cdef.type?.name);
    (node.childNodes || []).forEach((c: any) => dump(c, depth + 1));
}

async function main() {
    const ctx = await Application.run(ConsoleFoldPanelTestComponent, {
        deps: [TuiTemplateModule, ComponentsModule]
    });
    const ref = ctx.runners.getRef(ConsoleFoldPanelTestComponent) as ComponentRef<ConsoleFoldPanelTestComponent>;
    const root = ref.hostView.rootNodes[0] as ConsoleElement;
    await dump(root, 0);
    await ctx.close();
}
main().catch(e => { console.error(e); process.exit(1); });
