import expect = require('expect');
import { WorkflowCanvasComponent } from '../src/visual/components/workflow-canvas';

describe('Workflow canvas coordinates', () => {
    it('converts drop coordinates using the canvas rect, scroll, pan and zoom', () => {
        const canvas = new WorkflowCanvasComponent();
        // The injected ElementRef is unreliable in nested templates; coordinate
        // math must use the canvas root captured from this component's view.
        (canvas as any).canvasRoot = {
            nativeElement: {
                getBoundingClientRect: () => ({ left: 100, top: 50 }),
                scrollLeft: 20,
                scrollTop: 10
            }
        };
        canvas.model = {
            nodes: [],
            groups: [],
            edges: [],
            width: 1200,
            height: 720,
            zoom: 2,
            pan: { x: 10, y: 6 },
            gridStyle: {}
        };

        const world = canvas.worldFromEvent({ clientX: 220, clientY: 160 });
        expect(world.x).toBe(65);
        expect(world.y).toBe(57);
    });
});
