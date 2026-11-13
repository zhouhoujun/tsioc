import{n as s}from"./chunk-DZFFQQZL.js";import{a as e,na as a}from"./chunk-5SKR3XXL.js";import"./chunk-U6UJE3IR.js";var t=class{constructor(l){this.state=l}};Reflect.metadata("design:paramtypes",[s])(t);e(t,[[a({selector:"gateway-admin-rules",template:`
    <section class="ga-page ga-page-rules">
        <div class="ga-page-actions">
            <div>
                <h2 class="ga-section-title">{{state.t('rules.title')}}</h2>
                <p class="ga-muted">{{state.t('rules.desc')}}</p>
            </div>
            <div class="ga-actions">
                <button class="ga-btn ga-new-rules" type="button" @click="state.newRuleWorkflow">{{state.t('rules.new')}}</button>
                <button class="ga-btn ga-btn-primary ga-edit-rules" type="button" @click="state.editRules">{{state.t('rules.configure')}}</button>
            </div>
        </div>

        <article class="ga-card">
            <div class="ga-card-head">
                <div>
                    <h2>{{state.t('rules.workflows')}}</h2>
                    <p>{{state.t('rules.workflowsDesc')}}</p>
                </div>
            </div>
            <div class="ga-workflow-list">
                <div class="ga-workflow-row" v-for="workflow in state.ruleWorkflows"
                    [class]="'ga-workflow-row' + (state.ruleWorkflowId === workflow.id ? ' is-active' : '')">
                    <div class="ga-rule-main">
                        <strong>{{workflow.name || workflow.id}}</strong>
                        <span class="ga-muted">{{state.t('rules.workflowMeta', { nodes: workflow.nodeCount || 0, id: workflow.id })}}</span>
                    </div>
                    <button class="ga-link-btn" type="button" @click="state.editRules(workflow.id)">{{state.t('rules.open')}}</button>
                    <button class="ga-link-btn ga-duplicate-rule-workflow" type="button" @click="state.duplicateRuleWorkflow(workflow.id)">{{state.t('rules.duplicate')}}</button>
                    <button class="ga-link-btn ga-apply-rule-workflow" type="button" @click="state.applyRuleWorkflow(workflow.id)">{{state.t('rules.apply')}}</button>
                    <button class="ga-link-btn is-danger" type="button" @click="state.deleteRuleWorkflow(workflow.id)">{{state.t('action.remove')}}</button>
                </div>
                <div class="ga-empty" v-if="!state.ruleWorkflows.length">
                    {{state.t('rules.noWorkflows')}}
                </div>
            </div>
        </article>

        <article class="ga-card">
            <div class="ga-card-head">
                <div>
                    <h2>{{state.t('rules.compiled')}}</h2>
                    <p>{{state.t('rules.count', { count: state.rules.length })}}</p>
                </div>
            </div>
            <div class="ga-rule-list">
                <div class="ga-rule-item" v-for="(rule, index) in state.rules">
                    <span class="ga-rule-index">{{index + 1}}</span>
                    <div class="ga-rule-main">
                        <strong>{{rule.name || rule.id}}</strong>
                        <span class="ga-muted">{{state.conditionSummary(rule)}}</span>
                    </div>
                    <span class="ga-pill" [class]="state.ruleActionType(rule) === 'deny' ? 'ga-pill is-danger' : 'ga-pill is-on'">{{state.ruleActionLabel(rule)}}</span>
                    <span class="ga-pill">{{state.t('rules.priority', { value: state.rulePriority(rule) })}}</span>
                    <button class="ga-link-btn ga-view-rule" type="button" @click="state.openRuleDetail(rule)">{{state.t('action.view')}}</button>
                </div>
                <div class="ga-empty" v-if="!state.rules.length">
                    {{state.t('rules.empty')}}
                </div>
            </div>
        </article>
    </section>`}),0]]);export{t as GatewayAdminRulesPageComponent};
