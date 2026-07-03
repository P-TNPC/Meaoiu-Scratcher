import { autocompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { Compartment, RangeSetBuilder, StateEffect, StateField, type EditorState } from '@codemirror/state';
import { Decoration, EditorView, WidgetType, hoverTooltip, keymap, type DecorationSet } from '@codemirror/view';
import {
	StateManager,
	findDefinition,
	getCompletions,
	getDiagnostics,
	getFormattedCode,
	getHighlightTokens,
	getHoverInfo,
	getInlayHints,
	legend,
	type MeaoiuError,
	type ServiceState,
} from 'meaoiu';
import { meaoiuHighlightStyle, meaoiuTheme } from './theme';
import { meaoiuSyntaxLanguage } from './tm';
import { confirmDialog } from './confirmDialog';

// 状态管理
const stateManager = new StateManager(true);
let versionCounter = 0;
const updateDocState = (docString: string) => stateManager.updateState(StateManager.makeDocState(++versionCounter, docString));
const meaoiuServiceStateField = StateField.define<ServiceState>({
	create: ({ doc }) => updateDocState(doc.toString()),
	update: (value, tr) => (tr.docChanged ? updateDocState(tr.state.doc.toString()) : value),
});

// 静态诊断
const meaoiuLinter = linter(({ state }) => {
	const serviceState = state.field(meaoiuServiceStateField);
	const { doc } = state;
	const { syntaxErrors, semanticErrors } = getDiagnostics(serviceState);
	const diagnostics: Diagnostic[] = [];

	const mapError = (e: MeaoiuError, severity: Diagnostic['severity']) => {
		const from = doc.line(e.line).from + e.col - 1;
		const to = doc.line(e.endLine).from + e.endCol - 1;
		diagnostics.push({ from, to, severity, message: e.message });
	};
	for (const e of syntaxErrors) mapError(e, 'error');
	for (const e of semanticErrors) mapError(e, 'warning');

	return diagnostics;
});

// 自动补全
const meaoiuAutocompletion = autocompletion({
	override: [
		context => {
			const word = context.matchBefore(/[\p{L}_]+/v);
			if (!word && !context.explicit) return null;

			const { state, pos } = context;
			const serviceState = state.field(meaoiuServiceStateField);
			const lineObj = state.doc.lineAt(pos);
			const line = lineObj.number;
			const character = pos - lineObj.from + 1;

			const options = getCompletions(serviceState, { line, character }).map(({ label, kind }) => ({
				label,
				type: kind === 14 ? 'keyword' : kind === 3 ? 'function' : 'variable',
			}));
			return { from: word?.from ?? pos, options };
		},
	],
});

// 悬停资讯
const meaoiuHover = hoverTooltip(({ state }, pos) => {
	const serviceState = state.field(meaoiuServiceStateField);
	const { doc } = state;
	const lineObj = doc.lineAt(pos);
	const line = lineObj.number;
	const character = pos - lineObj.from + 1;

	const hover = getHoverInfo(serviceState, { line, character }, 'plaintext');
	if (!hover) return null;

	const {
		contents: { value: contentText },
		range: { start, end },
	} = hover;
	return {
		pos: doc.line(start.line).from + start.character - 1,
		end: doc.line(end.line).from + end.character - 1,
		create: () => {
			const dom = document.createElement('div');
			dom.className = 'cm-miu-tooltip';
			dom.textContent = contentText;
			return { dom };
		},
	};
});

// 定义跳转
const meaoiuGoToDefinition = EditorView.domEventHandlers({
	mousedown(event, view) {
		if (!event.ctrlKey && !event.metaKey) return false; // 仅为 Ctrl 或 Cmd 键触发跳转

		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
		if (pos === null) return false;

		const { state } = view;
		const serviceState = state.field(meaoiuServiceStateField);
		const { doc } = state;
		const lineObj = doc.lineAt(pos);
		const line = lineObj.number;
		const character = pos - lineObj.from + 1;

		const symbolInfo = findDefinition(serviceState, { line, character });
		if (!symbolInfo?.declarations.length) return false;

		const { line: decLine, col: decCol, endCol: decEndCol } = symbolInfo.declarations[0]!;
		if (decLine > doc.lines) return false;

		const decLineObj = doc.line(decLine);
		const anchor = decLineObj.from + decCol - 1;
		const head = decLineObj.from + decEndCol - 1;
		view.dispatch({ selection: { anchor, head }, effects: EditorView.scrollIntoView(anchor, { y: 'center' }) });

		event.preventDefault();
		return true;
	},
});

// 内联提示
class InlayHintWidget extends WidgetType {
	constructor(
		public label: string,
		public isParam: boolean,
	) {
		super();
	}
	toDOM() {
		const span = document.createElement('span');
		span.className = `cm-miu-inlay ${this.isParam ? 'param' : 'type'}`;
		span.textContent = this.label;
		return span;
	}
}
function buildInlayHints(doc: EditorState['doc'], serviceState: ServiceState) {
	const builder = new RangeSetBuilder<Decoration>();
	const hints = getInlayHints(serviceState);
	for (const { position, label, kind } of hints) {
		const pos = doc.line(position.line).from + position.character - 1;
		const isParam = kind === 2;
		const side = -isParam | 1; // 前参（-1），后型（1）
		builder.add(pos, pos, Decoration.widget({ widget: new InlayHintWidget(label, isParam), side }));
	}
	return builder.finish();
}
export const meaoiuInlayHints = StateField.define<DecorationSet>({
	create: state => buildInlayHints(state.doc, state.field(meaoiuServiceStateField)),
	update: (value, tr) => (tr.docChanged ? buildInlayHints(tr.state.doc, tr.state.field(meaoiuServiceStateField)) : value),
	provide: field => EditorView.decorations.from(field),
});
export const inlayHintsCompartment = new Compartment();

// 语义高亮
function buildSemanticTokens(doc: EditorState['doc'], serviceState: ServiceState) {
	const builder = new RangeSetBuilder<Decoration>();
	const tokens = getHighlightTokens(serviceState);

	const defaultLibraryMask = 1 << legend.tokenModifiers.indexOf('defaultLibrary');
	const deprecatedMask = 1 << legend.tokenModifiers.indexOf('deprecated');
	const modificationMask = 1 << legend.tokenModifiers.indexOf('modification');

	for (const { line, col, tokenType, tokenModifiers, length } of tokens) {
		const from = doc.line(line).from + col - 1;
		const typeName = legend.tokenTypes[tokenType];
		let className = `cm-miu-${typeName}`;

		if (tokenModifiers & defaultLibraryMask) className += ' cm-miu-builtin';
		if (tokenModifiers & deprecatedMask) className += ' cm-miu-deprecated';
		if (tokenModifiers & modificationMask) className += ' cm-miu-modification';

		builder.add(from, from + length, Decoration.mark({ class: className }));
	}
	return builder.finish();
}
const meaoiuSemanticTokens = StateField.define<DecorationSet>({
	create: state => buildSemanticTokens(state.doc, state.field(meaoiuServiceStateField)),
	update: (value, tr) => (tr.docChanged ? buildSemanticTokens(tr.state.doc, tr.state.field(meaoiuServiceStateField)) : value),
	provide: field => EditorView.decorations.from(field),
});

// 格式重排
export const meaoiuFormatting = async (view: EditorView): Promise<void> => {
	const sourceCode = view.state.doc.toString();
	const { errors: e, format } = getFormattedCode(sourceCode);

	if (e.length && !(await confirmDialog(`解析错 ${e.length} 处`, `${e.join('\n')}\n\n真要继续吗？`, '不许反悔'))) return;

	view.dispatch({ changes: { from: 0, to: sourceCode.length, insert: format() } });
};
const meaoiuFormatKeymap = keymap.of([{ key: 'Shift-Alt-f', run: view => (meaoiuFormatting(view), true) }]);

// 运行标错
export const setRuntimeErrorEffect = StateEffect.define<{ from: number; to: number } | null>();
export const runtimeErrorField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update: (errorMarks, tr) => {
		for (const e of tr.effects) {
			if (!e.is(setRuntimeErrorEffect)) continue;
			if (e.value === null) return Decoration.none;
			return Decoration.set([Decoration.mark({ class: 'cm-miu-runtime-error' }).range(e.value.from, e.value.to)]);
		}
		return tr.docChanged ? Decoration.none : errorMarks;
	},
	provide: field => EditorView.decorations.from(field),
});

// 插件整合导出
export const meaoiuLanguageSupport = [
	meaoiuSyntaxLanguage,
	syntaxHighlighting(meaoiuHighlightStyle),
	meaoiuServiceStateField,
	meaoiuLinter,
	meaoiuAutocompletion,
	meaoiuHover,
	meaoiuGoToDefinition,
	inlayHintsCompartment.of([]), // 内联提示默认关闭
	meaoiuSemanticTokens,
	meaoiuFormatKeymap,
	meaoiuTheme,
];
