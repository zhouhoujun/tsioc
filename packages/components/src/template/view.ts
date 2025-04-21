export class ViewBuilder {
    static create(selector: string, template: string | DocumentFragment): HTMLElement {
        const root = document.querySelector(selector) || document.createElement('div');
        
        if (typeof template === 'string') {
            root.innerHTML = template;
        } else {
            root.appendChild(template);
        }
        
        return root as HTMLElement;
    }

    static update(view: HTMLElement, changes: any) {
        // 实现视图更新逻辑
        // 可以与ReactiveEffect集成
    }
}
