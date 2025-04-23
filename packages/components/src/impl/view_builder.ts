import { ReactiveEffect } from '../ReactiveEffect';
import { ViewBuilder } from '../template/builder';

export class ViewBuilderImpl extends ViewBuilder {
    constructor(protected effect: ReactiveEffect) {
        super();
    }

    create(selector: string, template: string | DocumentFragment, context?: Record<string, any>): Element {
        const root = document.querySelector(selector) || document.createElement('div');

        if (typeof template === 'string') {
            root.innerHTML = template;
        } else {
            root.appendChild(template);
        }

        if (context) {
            this.update(root, context);
        }

        return root;
    }

    update(view: Element, changes: Record<string, any>, context?: Record<string, any>) {
        const allChanges = context ? { ...context, ...changes } : changes;

        this.effect.run(() => {
            for (const [key, value] of Object.entries(allChanges)) {
                const elements = view.querySelectorAll(`[data-bind="${key}"]`);
                elements.forEach(el => {
                    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
                        el.value = String(value);
                    } else {
                        el.textContent = String(value);
                    }
                });
            }
        });
    }
}
