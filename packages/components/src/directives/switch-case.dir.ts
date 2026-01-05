import { Host, Optional, Self } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { ElementRef } from '../refs/element';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';

/**
 * v-switch directive component.
 *
 * @export
 * @class SwitchDirective
 */
@Directive({
    selector: '[v-switch],[*switch]',
    dirType: DirectiveType.Structural,
    priority: 20
})
export class SwitchDirective {
    private _value: any;
    private _caseDirectives: CaseDirective[] = [];
    private _defaultDirective: DefaultDirective | null = null;

    @Attribute()
    set switch(value: any) {
        this._value = value;
        this.updateCases();
    }

    /**
     * Register case directive to switch directive.
     * @param caseDirective
     */
    registerCase(caseDirective: CaseDirective) {
        if (this._caseDirectives.indexOf(caseDirective) === -1) {
            this._caseDirectives.push(caseDirective);
            // Update the case view immediately after registration
            caseDirective.updateView(this._value);
        }
    }

    /**
     * Unregister case directive from switch directive.
     * @param caseDirective
     */
    unregisterCase(caseDirective: CaseDirective) {
        const index = this._caseDirectives.indexOf(caseDirective);
        if (index > -1) {
            this._caseDirectives.splice(index, 1);
        }
    }

    /**
     * Register default directive to switch directive.
     * @param defaultDirective
     */
    registerDefault(defaultDirective: DefaultDirective) {
        this._defaultDirective = defaultDirective;
        // 立即更新默认视图状态
        if (this._value !== undefined) {
            this.updateCases();
        }
    }

    /**
     * Unregister default directive from switch directive.
     */
    unregisterDefault() {
        this._defaultDirective = null;
    }

    /**
     * Update all cases view according to current switch value.
     */
    private updateCases() {
        let matchFound = false;
        
        this._caseDirectives.forEach(caseDirective => {
            const matched = caseDirective.updateView(this._value);
            if (matched) {
                matchFound = true;
            }
        });
        
        // Update default directive
        if (this._defaultDirective) {
            this._defaultDirective.updateView(!matchFound);
        }
    }

    // 添加初始化方法，确保指令在创建后能正确渲染
    onInit() {
        if (this._value !== undefined) {
            this.updateCases();
        }
    }

    onDestroy() {
        // Clean up all registered case directives
        this._caseDirectives.forEach(caseDirective => {
            caseDirective.clearView();
        });
        
        if (this._defaultDirective) {
            this._defaultDirective.clearView();
        }
        
        this._caseDirectives = [];
        this._defaultDirective = null;
    }
}

/**
 * v-case directive component.
 *
 * @export
 * @class CaseDirective
 */
@Directive({
    selector: '[v-case],[*case]',
    requires:['[v-switch],[*switch]'],
    dirType: DirectiveType.Structural,
    priority: 20
})
export class CaseDirective {
    private _hasView = false;
    private _caseValue: any;
    private _switchDirective: SwitchDirective | null = null;
    private _template: TemplateRef<any>;

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        // Get parent switch directive
        @Optional() @Host() switchDirective?: SwitchDirective
    ) {
        this._template = templateRef;
        if (switchDirective) {
            this._switchDirective = switchDirective;
            this._switchDirective.registerCase(this);
        }
    }

    @Attribute()
    set case(value: any) {
        this._caseValue = value;
        if (this._switchDirective) {
            this.updateView(this._switchDirective['_value']);
        }
    }

    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._template = templateRef;
    }

    /**
     * Update view based on switch value.
     * @param switchValue
     * @returns whether the case matched
     */
    updateView(switchValue: any): boolean {
        const isMatch = this._caseValue === switchValue;
        if (isMatch && !this._hasView) {
            this.createView();
        } else if (!isMatch && this._hasView) {
            this.clearView();
        }
        return isMatch;
    }

    private createView() {
        if (!this._template) {
            console.warn('CaseDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._template);
        this._hasView = true;
    }

    clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    // 添加初始化方法，确保指令在创建后能正确渲染
    onInit() {
        if (this._switchDirective && this._caseValue !== undefined) {
            this.updateView(this._switchDirective['_value']);
        }
    }

    onDestroy() {
        if (this._switchDirective) {
            this._switchDirective.unregisterCase(this);
        }
        this.clearView();
    }
}

/**
 * v-default directive component.
 *
 * @export
 * @class DefaultDirective
 */
@Directive({
    selector: '[v-default],[*default]',
    requires:['[v-switch],[*switch]'],
    dirType: DirectiveType.Structural,
    priority: 20
})
export class DefaultDirective {
    private _hasView = false;
    private _switchDirective: SwitchDirective | null = null;

    constructor(
        @Host() private viewContainer: ViewContainerRef,
        @Host() private templateRef: TemplateRef<any>,
        @Host() private elementRef: ElementRef,
        // Get parent switch directive
        @Self() @Host() switchDirective?: SwitchDirective
    ) {
        if (switchDirective) {
            this._switchDirective = switchDirective;
            this._switchDirective.registerDefault(this);
        }
    }

    /**
     * Update default view when no case matched.
     * @param shouldShow whether to show the default view
     */
    updateView(shouldShow: boolean) {
        if (shouldShow && !this._hasView) {
            this.createView();
        } else if (!shouldShow && this._hasView) {
            this.clearView();
        }
    }

    private createView() {
        if (!this.templateRef) {
            console.warn('DefaultDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this.templateRef);
        this._hasView = true;
    }

    clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    // 添加初始化方法，确保指令在创建后能正确渲染
    onInit() {
        if (this._switchDirective) {
            // 初始化时检查是否需要显示默认视图
            const switchValue = this._switchDirective['_value'];
            if (switchValue !== undefined) {
                let matchFound = false;
                // 检查是否有匹配的case
                const caseDirectives = this._switchDirective['_caseDirectives'];
                if (caseDirectives) {
                    matchFound = caseDirectives.some(caseDir => 
                        caseDir['_caseValue'] === switchValue
                    );
                }
                this.updateView(!matchFound);
            }
        }
    }

    onDestroy() {
        if (this._switchDirective) {
            this._switchDirective.unregisterDefault();
        }
        this.clearView();
    }
}