import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule, ViewChild } from '@tsdi/components';
import { BaseComponentsModule, WorkspaceLayoutComponent, installWorkspaceLayoutStyles } from '@tsdi/components/common';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '../src';

@Component({
    selector: 'workspace-layout-test',
    template: `
    <workspace-layout #layout [leftRatio]="0.25" [rightRatio]="0.2" [bottomRatio]="0.3">
        <workspace-left><p class="left-content">Left</p></workspace-left>
        <workspace-center><p class="center-content">Center</p></workspace-center>
        <workspace-right><p class="right-content">Right</p></workspace-right>
        <workspace-bottom><p class="bottom-content">Bottom</p></workspace-bottom>
    </workspace-layout>`
})
class WorkspaceLayoutTestComponent {
    @ViewChild('layout', WorkspaceLayoutComponent) layout?: WorkspaceLayoutComponent;
}

@Suite('Workspace layout')
export class WorkspaceLayoutSpec {
    ctx!: ApplicationContext;
    doc!: any;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
        this.doc = dom.window.document;
        installWorkspaceLayoutStyles(this.doc);
        this.ctx = await Application.run(WorkspaceLayoutTestComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, BaseComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.doc }]
        });
    }

    @Test('mounts four projected panes into their scrollable slots')
    async mountsPanes() {
        const ref = this.ctx.runners.getRef(WorkspaceLayoutTestComponent) as ComponentRef<WorkspaceLayoutTestComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        expect(root.querySelector('.workspace-layout-left .left-content')?.textContent).toBe('Left');
        expect(root.querySelector('.workspace-layout-center .center-content')?.textContent).toBe('Center');
        expect(root.querySelector('.workspace-layout-right .right-content')?.textContent).toBe('Right');
        expect(root.querySelector('.workspace-layout-bottom .bottom-content')?.textContent).toBe('Bottom');
        expect(root.querySelectorAll('.workspace-pane').length).toBe(4);
        expect(root.querySelectorAll('.workspace-splitter').length).toBe(3);
    }

    @Test('resizes panes by ratio and updates layout variables')
    async resizesPanes() {
        const ref = this.ctx.runners.getRef(WorkspaceLayoutTestComponent) as ComponentRef<WorkspaceLayoutTestComponent>;
        const layout = ref.instance.layout!;
        layout.resizePane('left', 0.32);
        layout.resizePane('right', 0.28);
        layout.resizePane('bottom', 0.4);
        await Promise.resolve();
        expect(layout.leftRatio).toBeCloseTo(0.32);
        expect(layout.rightRatio).toBeCloseTo(0.28);
        expect(layout.bottomRatio).toBeCloseTo(0.4);
        const root = ref.hostView.rootNodes[0] as any;
        const panel = root.querySelector('.workspace-layout') as HTMLElement;
        expect(panel.getAttribute('style') || '').toContain('--workspace-left: 32%');
        expect(panel.getAttribute('style') || '').toContain('--workspace-bottom: 40%');
    }

    @Test('collapses and restores panes, keeping the toggle rail')
    async collapsesPanes() {
        const ref = this.ctx.runners.getRef(WorkspaceLayoutTestComponent) as ComponentRef<WorkspaceLayoutTestComponent>;
        const layout = ref.instance.layout!;
        const root = ref.hostView.rootNodes[0] as any;
        const left = root.querySelector('.workspace-layout-left');
        const right = root.querySelector('.workspace-layout-right');
        const bottom = root.querySelector('.workspace-layout-bottom');

        layout.togglePane('left');
        layout.togglePane('right');
        layout.togglePane('bottom');
        await Promise.resolve();
        expect(layout.leftCollapsed).toBe(true);
        expect(layout.rightCollapsed).toBe(true);
        expect(layout.bottomCollapsed).toBe(true);
        expect(left.hasAttribute('hidden') || left.classList.contains('is-hidden')).toBe(true);
        expect(right.hasAttribute('hidden') || right.classList.contains('is-hidden')).toBe(true);
        expect(bottom.hasAttribute('hidden') || bottom.classList.contains('is-hidden')).toBe(true);
        expect(root.querySelectorAll('.workspace-collapse').length).toBe(3);

        layout.togglePane('left');
        layout.expandPane('right');
        layout.expandPane('bottom');
        await Promise.resolve();
        expect(layout.isCollapsed('left')).toBe(false);
        expect(layout.isCollapsed('right')).toBe(false);
        expect(layout.isCollapsed('bottom')).toBe(false);
        expect(left.hasAttribute('hidden')).toBe(false);
        expect(right.hasAttribute('hidden')).toBe(false);
        expect(bottom.hasAttribute('hidden')).toBe(false);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
