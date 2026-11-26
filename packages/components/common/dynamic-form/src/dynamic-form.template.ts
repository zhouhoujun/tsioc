/** Renderer-neutral dynamic-form markup. Kept separate from the state/editing logic. */
export const DYNAMIC_FORM_TEMPLATE = `
    <div [class]="classes.form">
        <div [class]="classes.schemaError" v-if="schemaError">{{schemaError}}</div>
        <div v-else>
            <div [class]="classes.noFields" v-if="!visibleGroups.length">{{emptyLabel}}</div>
            <div [class]="classes.group" v-for="group in visibleGroups">
                <div [class]="classes.groupTitle" v-if="group.label">{{group.label}}</div>
                <div [class]="classes.groupFields">
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="classes.labelRow" v-if="field.type !== 'hidden'">
                        <label [class]="classes.label">{{fieldLabel(field)}}<span [class]="classes.required" v-if="isRequired(field)">*</span></label>
                        <span class="df-field-actions">
                        <button [class]="classes.fieldAction" v-for="action in field.actions" type="button"
                            data-field-action="{{action.id}}"
                            title="{{action.title || action.label}}" aria-label="{{action.title || action.label}}"
                            [disabled]="field.disabled || field.readonly"
                            @click="runFieldAction(field, action)">{{action.label}}</button>
                        <button [class]="classes.jsonMode" v-if="field.type === 'json'" type="button"
                            @click="toggleJsonMode(field)">{{isJsonRaw(field) ? (schema.jsonFieldsLabel || 'Fields') : (schema.jsonTextLabel || 'JSON')}}</button>
                        <button [class]="classes.reset" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">↺</button>
                        </span>
                    </div>
                    <div [class]="classes.typedRow" v-if="isTypedInput(field)">
                        <select [class]="classes.typedType" data-value-type="true"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeTypedType(field, $event)">
                            <option v-for="source in typedSourceOptionsFor(field)" [value]="source.value"
                                [selected]="typedType(field) === source.value">{{source.label}}</option>
                        </select>
                    </div>
                    <dynamic-field-widget v-if="isWidgetInput(field) && fieldWidgetComponent(field)"
                        :component="fieldWidgetComponent(field)" :field="field"
                        :value="fieldValue(field)" :values="formValues"
                        :disabled="field.disabled || field.readonly"
                        :error="errorFor(field)" :changeAction="changeWidgetValue"
                        :label="fieldLabel(field)" :errorId="fieldErrorId(field)"
                        :hintId="fieldHintId(field)" :describedBy="describedByFor(field)"
                        :required="isRequired(field)"></dynamic-field-widget>
                    <input v-if="isWidgetInput(field) && !fieldWidgetComponent(field)" [class]="inputClass(field)"
                        type="text" [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}"
                        @input="changeText(field, $event)" @blur="blurField(field)" />
                    <div [class]="inputWrapClass(field)" v-if="isTextInput(field) || isNumberInput(field)">
                        <input v-if="isTextInput(field)" [class]="inputClass(field)" type="{{field.typed ? typedHtmlType(field) : htmlType(field)}}"
                            [value]="field.typed ? typedText(field) : fieldValue(field)" [placeholder]="field.placeholder || ''"
                            [readOnly]="field.readonly" [disabled]="field.disabled"
                            [min]="field.min" [max]="field.max" [step]="field.step"
                            aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                            aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                            aria-describedby="{{describedByFor(field)}}"
                            @input="changeText(field, $event)" @blur="blurField(field)" />
                        <input v-if="isNumberInput(field)" [class]="inputClass(field)" type="{{field.typed ? typedHtmlType(field) : htmlType(field)}}"
                            [value]="field.typed ? typedText(field) : fieldValue(field)" [placeholder]="field.placeholder || ''"
                            [readOnly]="field.readonly" [disabled]="field.disabled"
                            [min]="field.min" [max]="field.max" [step]="field.step || 1"
                            aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                            aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                            aria-describedby="{{describedByFor(field)}}"
                            @input="changeText(field, $event)" @blur="blurField(field)" />
                        <span [class]="classes.inputUnit" v-if="field.unit">{{field.unit}}</span>
                    </div>
                    <label v-if="isBooleanInput(field)" [class]="classes.checkboxRow">
                        <input type="checkbox" [checked]="fieldChecked(field)"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeBoolean(field, $event)" />
                        <span v-if="field.description">{{field.description}}</span>
                    </label>
                    <select v-if="isSelectInput(field)" [class]="selectClass(field)"
                        [value]="fieldValue(field)" [multiple]="isMultiSelect(field)"
                        [disabled]="field.disabled || field.readonly"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}"
                        @change="changeSelect(field, $event)">
                        <option v-for="option in field.options" [value]="option.value"
                            [selected]="optionSelected(field, option.value)"
                            [disabled]="option.disabled">{{option.label}}</option>
                    </select>
                    <div v-if="isRadioInput(field)" [class]="classes.options" role="radiogroup"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}">
                        <label v-for="option in field.options" data-option-value="{{option.value}}"
                            [class]="optionClass(field, option)">
                            <input type="radio" name="{{formId}}-{{field.key}}"
                                [value]="option.value"
                                [checked]="sameOptionValue(option.value, fieldValue(field))"
                                [disabled]="field.disabled || field.readonly || option.disabled"
                                @change="chooseOption(field, option.value)" />
                            <span>{{option.label}}</span>
                        </label>
                    </div>
                    <textarea v-if="isJsonTextArea(field)" [class]="textareaClass(field)"
                        data-dynamic-code="json"
                        [value]="jsonTextValue(field)" [rows]="field.rows || 4"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isJsonObjectEditor(field)" [class]="classes.keyValue">
                        <div [class]="classes.keyValueRow" v-for="(entry, index) in jsonEntries(field)">
                            <input [class]="classes.keyValueKey" type="text" [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeJsonEntryKey(field, index, $event)" />
                            <input [class]="classes.keyValueValue" type="text" [value]="entry.display"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeJsonEntryValue(field, index, $event)" />
                            <button [class]="classes.listRemove" type="button" @click="removeJsonEntry(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addJsonEntry(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <textarea v-if="isTextareaInput(field)" [class]="textareaClass(field)"
                        [value]="fieldValue(field)" [rows]="field.rows || (field.type === 'json' ? 4 : 3)"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <textarea v-if="isCodeInput(field)" [class]="codeClass(field)"
                        data-dynamic-code="{{field.language || 'javascript'}}"
                        data-code-value="{{encodeValue(field)}}"
                        data-code-suggestions="{{suggestionData(field)}}"
                        [value]="fieldValue(field)" [rows]="field.rows || 8"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        aria-describedby="{{describedByFor(field)}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isListInput(field)" [class]="classes.list">
                        <div [class]="classes.listRow" v-for="(item, rowIndex) in listItems(field)">
                            <div [class]="classes.listFields">
                                <div v-for="child in field.itemFields" v-if="isListItemVisible(child, item)">
                                    <div [class]="classes.listField" data-field-key="{{child.key}}">
                                        <div [class]="classes.labelRow">
                                            <label [class]="classes.label">{{fieldLabel(child)}}<span [class]="classes.required" v-if="isRequired(child)">*</span></label>
                                            <span class="df-field-actions" v-if="child.actions && child.actions.length">
                                                <button [class]="classes.fieldAction" v-for="action in child.actions" type="button"
                                                    data-field-action="{{action.id}}"
                                                    title="{{action.title || action.label}}" aria-label="{{action.title || action.label}}"
                                                    [disabled]="child.disabled || child.readonly"
                                                    @click="runListItemAction(field, listIndex(field, item), child, action)">{{action.label}}</button>
                                            </span>
                                        </div>
                                        <div [class]="classes.typedRow" v-if="isTypedInput(child) && !isWidgetInput(child)">
                                            <select [class]="classes.typedType" data-value-type="true"
                                                [disabled]="child.disabled || child.readonly"
                                                @change="changeListItemTypedType(field, listIndex(field, item), child, $event)">
                                                <option v-for="source in typedSourceOptionsFor(child)" [value]="source.value"
                                                    [selected]="listItemTypedType(item, child) === source.value">{{source.label}}</option>
                                            </select>
                                        </div>
                                        <dynamic-field-widget v-if="isWidgetInput(child) && fieldWidgetComponent(child)"
                                            :component="fieldWidgetComponent(child)" :field="child"
                                            :value="listItemValueAt(field, rowIndex, child)" :values="item"
                                            :disabled="child.disabled || child.readonly"
                                            :error="listItemErrorAt(field, rowIndex, child)"
                                            :itemIndex="rowIndex"
                                            :changeAction="listWidgetChange(field, rowIndex)"
                                            :label="fieldLabel(child)" :required="isRequired(child)"></dynamic-field-widget>
                                        <input v-if="isWidgetInput(child) && !fieldWidgetComponent(child)" [class]="inputClass(child)"
                                            type="text" [value]="listItemValueAt(field, rowIndex, child)"
                                            [placeholder]="child.placeholder || ''"
                                            @input="changeListItem(field, rowIndex, child, $event)" />
                                        <input v-if="isTextInput(child) || isNumberInput(child)" [class]="inputClass(child)"
                                            type="{{htmlType(child)}}"
                                            [value]="listItemValue(item, child)"
                                            [placeholder]="child.placeholder || ''"
                                            [min]="child.min" [max]="child.max" [step]="child.step"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)" />
                                        <textarea v-if="isTextareaInput(child) || isJsonInput(child)" [class]="textareaClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [rows]="child.rows || (isJsonInput(child) ? 3 : 2)"
                                            [placeholder]="child.placeholder || ''"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)"></textarea>
                                        <label v-if="isBooleanInput(child)" [class]="classes.checkboxRow">
                                            <input type="checkbox" [checked]="listItemChecked(item, child)"
                                                @change="changeListItem(field, listIndex(field, item), child, $event)" />
                                        </label>
                                        <select v-if="isSelectInput(child)" [class]="selectClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [disabled]="child.disabled || child.readonly"
                                            @change="changeListItemSelect(field, listIndex(field, item), child, $event)">
                                            <option v-for="option in child.options" [value]="option.value"
                                                [selected]="sameOptionValue(option.value, listItemValue(item, child))"
                                                [disabled]="option.disabled">{{option.label}}</option>
                                        </select>
                                        <div v-if="isRadioInput(child)" [class]="classes.options">
                                            <label v-for="option in child.options" data-option-value="{{option.value}}"
                                                [class]="optionClass(child, listItemValue(item, child))">
                                                <input type="radio" name="{{formId}}-{{field.key}}-{{rowIndex}}-{{child.key}}"
                                                    [value]="option.value"
                                                    [checked]="sameOptionValue(option.value, listItemValue(item, child))"
                                                    @change="changeListItemOption(field, listIndex(field, item), child, option.value)" />
                                                <span>{{option.label}}</span>
                                            </label>
                                        </div>
                                        <div [class]="classes.error" role="alert" v-if="listItemError(child, item)">{{listItemError(child, item)}}</div>
                                    </div>
                                </div>
                            </div>
                            <span [class]="classes.listSummary" v-if="listRowSummary(field, item, rowIndex)">{{listRowSummary(field, item, rowIndex)}}</span>
                            <span class="df-list-actions" v-if="field.reorder">
                                <button [class]="classes.listMove" type="button" data-list-move="up"
                                    aria-label="Move up" [disabled]="rowIndex === 0"
                                    @click="moveListItem(field, rowIndex, -1)">↑</button>
                                <button [class]="classes.listMove" type="button" data-list-move="down"
                                    aria-label="Move down" [disabled]="rowIndex >= listItems(field).length - 1"
                                    @click="moveListItem(field, rowIndex, 1)">↓</button>
                            </span>
                            <button [class]="classes.listRemove" type="button" @click="removeListItem(field, listIndex(field, item))">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addListItem(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <div v-if="isKeyValueInput(field)" [class]="classes.keyValue">
                        <div [class]="classes.keyValueRow" v-for="(entry, index) in keyValueEntries(field)">
                            <input [class]="classes.keyValueKey" type="text"
                                [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeKeyValueKey(field, index, $event)" />
                            <label v-if="keyValueValueType(field) === 'boolean'" [class]="classes.checkboxRow">
                                <input type="checkbox" [checked]="entry.value === true"
                                    @change="changeKeyValueValue(field, index, $event)" />
                            </label>
                            <input v-else [class]="classes.keyValueValue"
                                type="{{keyValueValueType(field) === 'number' ? 'number' : 'text'}}"
                                [value]="entry.value"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeKeyValueValue(field, index, $event)" />
                            <button [class]="classes.listRemove" type="button" @click="removeKeyValue(field, index)">{{field.removeLabel || '✕'}}</button>
                        </div>
                        <button [class]="classes.listAdd" type="button" @click="addKeyValue(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="classes.error" id="{{fieldErrorId(field)}}" role="alert"
                        data-severity="{{issueSeverity(field)}}" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="classes.hint" id="{{fieldHintId(field)}}" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
                </div>
            </div>
            <div [class]="classes.actions" v-if="showActions">
                <button type="button" [class]="classes.btn" @click="resetForm()">{{resetText}}</button>
                <button type="button" [class]="classes.btnPrimary" @click="submit()">{{submitText}}</button>
            </div>
        </div>
    </div>`;
