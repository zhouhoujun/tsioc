import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '../src';
import { ConsoleRenderer, ConsoleTemplateModule } from '../console/src';

function countClass(root: any, cls: string): number {
    let count = 0;
    const walk = (node: any) => {
        if (String(node?.getAttribute?.('class') || '').split(/\s+/).includes(cls)) {
            count++;
        }
        for (const child of (node?.childNodes || [])) {
            walk(child);
        }
    };
    walk(root);
    return count;
}

function countText(root: any, text: string): number {
    return String(root?.textContent || '').split(text).length - 1;
}

function textLines(ref: ComponentRef<any>, renderer: ConsoleRenderer): string[] {
    return renderer.renderToLines(ref.hostView.rootNodes[0]);
}

function hasText(lines: string[], text: string): boolean {
    return lines.some(line => line.includes(text));
}

/**
 * 多个同级独立 v-if 组:每个 v-if 都应开启独立的指令链,
 * v-else 只跟随其所属的 v-if,不与其他组的 root 状态耦合。
 */
@Component({
    selector: 'independent-groups',
    template: `
    <div class="panel">
        <label class="row">
            <span class="a-if" v-if="aOn">A-IF</span>
            <span class="a-else" v-else>A-ELSE</span>
            <span class="b-if" v-if="bOn">B-IF</span>
            <span class="b-else" v-else>B-ELSE</span>
        </label>
    </div>
    `
})
export class IndependentGroupsComp {
    aOn = true;
    bOn = false;
}

@Suite('v-if/v-else-if/v-else conditional directives')
export class IfDirectivesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(IndependentGroupsComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('sibling v-if groups are independent: B-else shows while A-if is on')
    async siblingGroupsIndependent() {
        const ref = this.ctx.runners.getRef(IndependentGroupsComp) as ComponentRef<IndependentGroupsComp>;
        const root = ref.hostView.rootNodes[0];
        await Promise.resolve();
        await Promise.resolve();

        // A: v-if on -> A-IF; B: v-if off -> B-ELSE
        expect(countClass(root, 'a-if')).toBe(1);
        expect(countClass(root, 'a-else')).toBe(0);
        expect(countClass(root, 'b-if')).toBe(0);
        expect(countClass(root, 'b-else')).toBe(1);

        // toggle A off: A-ELSE appears, B group stays untouched
        ref.instance.aOn = false;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(root, 'a-if')).toBe(0);
        expect(countClass(root, 'a-else')).toBe(1);
        expect(countClass(root, 'b-if')).toBe(0);
        expect(countClass(root, 'b-else')).toBe(1);

        // toggle B on: B-IF appears, A group stays untouched
        ref.instance.bOn = true;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(root, 'a-if')).toBe(0);
        expect(countClass(root, 'a-else')).toBe(1);
        expect(countClass(root, 'b-if')).toBe(1);
        expect(countClass(root, 'b-else')).toBe(0);
    }

    @Test('v-if / v-else-if / v-else chain renders exactly one branch per state')
    async threeStateChain() {
        const ref = this.ctx.runners.getRef(IndependentGroupsComp) as ComponentRef<IndependentGroupsComp>;
        const root = ref.hostView.rootNodes[0];
        await Promise.resolve();
        await Promise.resolve();

        // only a single branch per v-if group at any time
        const aBranches = countClass(root, 'a-if') + countClass(root, 'a-else');
        const bBranches = countClass(root, 'b-if') + countClass(root, 'b-else');
        expect(aBranches).toBe(1);
        expect(bBranches).toBe(1);
    }
}

/**
 * 单链多分支:v-if + 多级 v-else-if + v-else,任意时刻仅渲染一个分支。
 */
@Component({
    selector: 'multi-branch',
    template: `
    <div class="panel">
        <span class="br-0" v-if="state === 0">BRANCH-0</span>
        <span class="br-1" v-else-if="state === 1">BRANCH-1</span>
        <span class="br-2" v-else-if="state === 2">BRANCH-2</span>
        <span class="br-3" v-else>BRANCH-3</span>
    </div>
    `
})
export class MultiBranchComp {
    state = 0;
}

@Suite('v-if / multi v-else-if chain')
export class MultiBranchTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MultiBranchComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    private async renderState(state: number) {
        const ref = this.ctx.runners.getRef(MultiBranchComp) as ComponentRef<MultiBranchComp>;
        ref.instance.state = state;
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0];
        return {
            root,
            count: (cls: string) => countClass(root, cls),
            total: countClass(root, 'br-0') + countClass(root, 'br-1') + countClass(root, 'br-2') + countClass(root, 'br-3')
        };
    }

    @Test('state 0 renders only the v-if branch')
    async stateZero() {
        const r = await this.renderState(0);
        expect(r.count('br-0')).toBe(1);
        expect(r.count('br-1')).toBe(0);
        expect(r.count('br-2')).toBe(0);
        expect(r.count('br-3')).toBe(0);
        expect(r.total).toBe(1);
    }

    @Test('state 1 renders only the first v-else-if branch')
    async stateOne() {
        const r = await this.renderState(1);
        expect(r.count('br-0')).toBe(0);
        expect(r.count('br-1')).toBe(1);
        expect(r.count('br-2')).toBe(0);
        expect(r.count('br-3')).toBe(0);
        expect(r.total).toBe(1);
    }

    @Test('state 2 renders only the second v-else-if branch')
    async stateTwo() {
        const r = await this.renderState(2);
        expect(r.count('br-0')).toBe(0);
        expect(r.count('br-1')).toBe(0);
        expect(r.count('br-2')).toBe(1);
        expect(r.count('br-3')).toBe(0);
        expect(r.total).toBe(1);
    }

    @Test('state 3 renders only the v-else branch')
    async stateThree() {
        const r = await this.renderState(3);
        expect(r.count('br-0')).toBe(0);
        expect(r.count('br-1')).toBe(0);
        expect(r.count('br-2')).toBe(0);
        expect(r.count('br-3')).toBe(1);
        expect(r.total).toBe(1);
    }

    @Test('switching across all states never duplicates branches')
    async switchAllStates() {
        for (const state of [0, 1, 2, 3, 0, 2, 1, 3]) {
            const r = await this.renderState(state);
            expect(r.total).toBe(1);
        }
    }
}

/**
 * v-if 显示/隐藏/恢复,并确保视图不重复。
 */
@Component({
    selector: 'visibility-toggle',
    template: `
    <div class="panel">
        <span class="flag" v-if="visible">VISIBLE</span>
        <span class="placeholder">PLACEHOLDER</span>
    </div>
    `
})
export class VisibilityToggleComp {
    visible = true;
}

@Suite('v-if visibility toggle')
export class VisibilityToggleTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(VisibilityToggleComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('view appears, disappears and reappears without duplication')
    async toggleVisible() {
        const ref = this.ctx.runners.getRef(VisibilityToggleComp) as ComponentRef<VisibilityToggleComp>;
        const renderer = this.ctx.get(ConsoleRenderer);
        await Promise.resolve();
        await Promise.resolve();

        // visible
        expect(countClass(ref.hostView.rootNodes[0], 'flag')).toBe(1);
        expect(hasText(textLines(ref, renderer), 'VISIBLE')).toBe(true);

        // hidden
        ref.instance.visible = false;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(ref.hostView.rootNodes[0], 'flag')).toBe(0);
        expect(hasText(textLines(ref, renderer), 'VISIBLE')).toBe(false);

        // visible again - still exactly one node, no duplicates
        ref.instance.visible = true;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(ref.hostView.rootNodes[0], 'flag')).toBe(1);
        expect(hasText(textLines(ref, renderer), 'VISIBLE')).toBe(true);
    }
}

/**
 * 嵌套 v-if:内层链只在外层视图创建后生效,且互不影响。
 */
@Component({
    selector: 'nested-if',
    template: `
    <div class="panel">
        <span class="outer-if" v-if="outerOn">
            <span class="inner-a" v-if="innerOn">INNER-A</span>
            <span class="inner-b" v-else>INNER-B</span>
        </span>
        <span class="outer-else" v-else>OUTER-ELSE</span>
    </div>
    `
})
export class NestedIfComp {
    outerOn = false;
    innerOn = true;
}

@Suite('nested v-if / v-else')
export class NestedIfTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(NestedIfComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('outer v-else shows when outer is off, inner branches absent')
    async outerOff() {
        const ref = this.ctx.runners.getRef(NestedIfComp) as ComponentRef<NestedIfComp>;
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0];
        expect(countClass(root, 'outer-if')).toBe(0);
        expect(countClass(root, 'outer-else')).toBe(1);
        expect(countClass(root, 'inner-a')).toBe(0);
        expect(countClass(root, 'inner-b')).toBe(0);
    }

    @Test('inner chain resolves when outer is on')
    async outerOnInnerBranches() {
        const ref = this.ctx.runners.getRef(NestedIfComp) as ComponentRef<NestedIfComp>;
        ref.instance.outerOn = true;
        await Promise.resolve();
        await Promise.resolve();

        // inner v-if on -> INNER-A
        expect(countClass(ref.hostView.rootNodes[0], 'outer-if')).toBe(1);
        expect(countClass(ref.hostView.rootNodes[0], 'outer-else')).toBe(0);
        expect(countClass(ref.hostView.rootNodes[0], 'inner-a')).toBe(1);
        expect(countClass(ref.hostView.rootNodes[0], 'inner-b')).toBe(0);

        // inner v-if off -> INNER-B
        ref.instance.innerOn = false;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(ref.hostView.rootNodes[0], 'inner-a')).toBe(0);
        expect(countClass(ref.hostView.rootNodes[0], 'inner-b')).toBe(1);

        // outer off again -> outer else, inner gone
        ref.instance.outerOn = false;
        await Promise.resolve();
        await Promise.resolve();
        expect(countClass(ref.hostView.rootNodes[0], 'outer-if')).toBe(0);
        expect(countClass(ref.hostView.rootNodes[0], 'outer-else')).toBe(1);
        expect(countClass(ref.hostView.rootNodes[0], 'inner-a')).toBe(0);
        expect(countClass(ref.hostView.rootNodes[0], 'inner-b')).toBe(0);
    }
}

/**
 * 结构指令别名语法 *if / *else-if / *else。
 */
@Component({
    selector: 'star-if-syntax',
    template: `
    <div class="panel">
        <span class="star-x" *if="xOn">X-IF</span>
        <span class="star-y" *else-if="yOn">Y-ELSE-IF</span>
        <span class="star-z" *else>Z-ELSE</span>
    </div>
    `
})
export class StarIfSyntaxComp {
    xOn = false;
    yOn = false;
}

@Suite('*if / *else-if / *else structural alias syntax')
export class StarIfSyntaxTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(StarIfSyntaxComp, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('*if renders when xOn, else-chain suppressed')
    async starIf() {
        const ref = this.ctx.runners.getRef(StarIfSyntaxComp) as ComponentRef<StarIfSyntaxComp>;
        ref.instance.xOn = true;
        ref.instance.yOn = false;
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0];
        expect(countClass(root, 'star-x')).toBe(1);
        expect(countClass(root, 'star-y')).toBe(0);
        expect(countClass(root, 'star-z')).toBe(0);
    }

    @Test('*else-if renders when x off and y on')
    async starElseIf() {
        const ref = this.ctx.runners.getRef(StarIfSyntaxComp) as ComponentRef<StarIfSyntaxComp>;
        ref.instance.xOn = false;
        ref.instance.yOn = true;
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0];
        expect(countClass(root, 'star-x')).toBe(0);
        expect(countClass(root, 'star-y')).toBe(1);
        expect(countClass(root, 'star-z')).toBe(0);
    }

    @Test('*else renders when all conditions off')
    async starElse() {
        const ref = this.ctx.runners.getRef(StarIfSyntaxComp) as ComponentRef<StarIfSyntaxComp>;
        ref.instance.xOn = false;
        ref.instance.yOn = false;
        await Promise.resolve();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0];
        expect(countClass(root, 'star-x')).toBe(0);
        expect(countClass(root, 'star-y')).toBe(0);
        expect(countClass(root, 'star-z')).toBe(1);
    }
}
