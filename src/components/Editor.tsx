import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import {
	crosshairCursor,
	drawSelection,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	rectangularSelection,
} from '@codemirror/view';
import { EditorView } from 'codemirror';
import type { CSSProperties, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { inlayHintsCompartment, meaoiuInlayHints, meaoiuLanguageSupport, runtimeErrorField } from '../services/editor/lsp';
import { meaoiuEditorBaseTheme } from '../services/editor/theme';

import exampleMiu from '../example.miu?raw';

interface EditorProps {
	tabSize: number;
	showInlayHints: boolean;
	viewRef: RefObject<EditorView>;
	style: CSSProperties;
}

const tabSizeCompartment = new Compartment();
export function Editor({ tabSize, showInlayHints, viewRef, style }: EditorProps) {
	const editorRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const editorParent = editorRef.current;
		if (!editorParent) return;

		const state = EditorState.create({
			doc: exampleMiu,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				history(),
				foldGutter(),
				drawSelection(),
				dropCursor(),
				EditorState.allowMultipleSelections.of(true),
				EditorView.clickAddsSelectionRange.of(e => e.altKey),
				indentUnit.of('\t'),
				tabSizeCompartment.of(EditorState.tabSize.of(4)),
				indentOnInput(),
				bracketMatching(),
				closeBrackets(),
				autocompletion(),
				rectangularSelection(),
				crosshairCursor(),
				highlightActiveLine(),
				highlightSelectionMatches(),
				keymap.of([
					...closeBracketsKeymap,
					...defaultKeymap,
					...searchKeymap,
					...historyKeymap,
					...foldKeymap,
					...completionKeymap,
					...lintKeymap,
					indentWithTab,
				]),
				meaoiuEditorBaseTheme,
				...meaoiuLanguageSupport,
				runtimeErrorField,
			],
		});

		const view = new EditorView({ state, parent: editorParent });
		viewRef.current = view;
		return () => ((viewRef.current = null), view.destroy());
	}, [viewRef]);

	useEffect(() => {
		viewRef.current?.dispatch({ effects: inlayHintsCompartment.reconfigure(showInlayHints ? meaoiuInlayHints : []) });
	}, [showInlayHints]);

	useEffect(() => {
		viewRef.current?.dispatch({ effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize)) });
	}, [tabSize]);

	return <div className={'ide-editor'} ref={editorRef} style={style} />;
}
