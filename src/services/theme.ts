import { HighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export const meaoiuEditorBaseTheme = EditorView.theme({
	'&': { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', height: '100%', fontSize: '0.9375rem' },
	'.cm-scroller, .cm-content, .cm-gutters': { fontFamily: 'var(--font-mono) !important', fontVariantLigatures: 'contextual' },
	'.cm-scroller': { scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) transparent' },
	'.cm-scroller::-webkit-scrollbar': { width: '0.75rem', height: '0.75rem' },
	'.cm-scroller::-webkit-scrollbar-track': { background: 'transparent' },
	'.cm-scroller::-webkit-scrollbar-thumb': {
		backgroundColor: 'var(--scrollbar-thumb)',
		borderRadius: '0.375rem',
		border: '0.2rem solid var(--bg-primary)',
	},
	'.cm-scroller::-webkit-scrollbar-thumb:hover': { backgroundColor: 'var(--scrollbar-thumb-hover)' },
	'.cm-content': { caretColor: 'var(--accent-blue)' },
	'&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent-blue)' },
	'&.cm-focused .cm-selectionBackground, .cm-selectionBackground, :not(#魔法) .cm-content ::selection': {
		backgroundColor: 'var(--selection-bg) !important',
	},
	'&.cm-focused .cm-selectionMatch, .cm-selectionMatch': { backgroundColor: 'var(--selection-bg)' },
	'.cm-gutters': { backgroundColor: 'var(--bg-primary)', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' },
	'.cm-activeLineGutter': { backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' },
	'.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--bg-hover) 50%, transparent)' },
	'.cm-tooltip': {
		padding: '0.5rem 0.75rem',
		border: '1px solid var(--border)',
		borderRadius: '1rem',
		boxShadow: '0 0 0.25rem var(--border)',
		backgroundColor: 'var(--bg-secondary)',
		color: 'var(--text-secondary)',
	},
	'.cm-tooltip-lint': { padding: '0' },
	'.cm-tooltip-lint .cm-diagnostic': { position: 'relative', padding: '0 0 0 0.75em', borderLeft: 'none' },
	'.cm-tooltip-lint .cm-diagnostic::before': {
		content: '""',
		position: 'absolute',
		left: '0.25em',
		top: '0',
		bottom: '0',
		margin: 'auto',
		width: '0.25em',
		height: '1em',
		borderRadius: '0.25rem',
	},
	'.cm-tooltip-lint .cm-diagnostic-error::before': { backgroundColor: 'var(--accent-red)' },
	'.cm-tooltip-lint .cm-diagnostic-warning::before': { backgroundColor: 'var(--accent-yellow)' },
	'.cm-tooltip-autocomplete': { padding: '0.5rem 0.375rem' },
	'.cm-tooltip-autocomplete > ul > li': { padding: '0.25rem 0.5rem !important' },
	'.cm-tooltip-autocomplete > ul > li[aria-selected]': {
		borderRadius: '0.625rem',
		backgroundColor: 'var(--selection-bg)',
		color: 'var(--text-primary)',
	},
});

export const meaoiuTheme = EditorView.baseTheme({
	'.cm-miu-variable, .cm-miu-variable *': { color: 'var(--accent-yellow) !important' },
	'.cm-miu-parameter, .cm-miu-parameter *': { color: 'var(--accent-yellow) !important', fontStyle: 'italic' },
	'.cm-miu-function, .cm-miu-function *': { color: 'var(--accent-function) !important', fontWeight: 'bold' },
	'.cm-miu-builtin, .cm-miu-builtin *': { color: 'var(--accent-builtin) !important' },
	'.cm-miu-deprecated, .cm-miu-deprecated *': {
		textDecoration: 'line-through !important',
		color: 'var(--text-muted) !important',
		opacity: '0.875',
	},
	'.cm-miu-modification, .cm-miu-modification *': { borderBottom: '1px dotted var(--accent-blue) !important' },

	'.cm-miu-inlay': { padding: '0 0.25ch', borderRadius: '0.375rem', userSelect: 'none' },
	'.cm-miu-inlay.type': {
		marginLeft: '0.5ch',
		color: 'color-mix(in srgb, var(--text-secondary) 72%, transparent)',
		backgroundColor: 'color-mix(in srgb, var(--text-secondary) 12%, transparent)',
	},
	'.cm-miu-inlay.param': {
		marginRight: '0.5ch',
		color: 'color-mix(in srgb, var(--accent-green) 72%, transparent)',
		backgroundColor: 'color-mix(in srgb, var(--accent-green) 12%, transparent)',
	},

	'.cm-miu-runtime-error': {
		backgroundColor: 'color-mix(in srgb, var(--accent-red) 25%, transparent)',
		outline: '0.125em dashed var(--accent-red)',
	},
});

export const meaoiuHighlightStyle = HighlightStyle.define([
	{ tag: [t.keyword, t.modifier], color: 'var(--accent-purple)' },
	{ tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--accent-red)' },
	{ tag: [t.function(t.variableName), t.labelName], color: 'var(--accent-function)' },
	{ tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--accent-yellow)' },
	{ tag: [t.definition(t.name), t.separator], color: 'var(--text-primary)' },
	{
		tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
		color: 'var(--accent-yellow)',
	},
	{
		tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
		color: 'var(--accent-blue)',
	},
	{ tag: [t.meta, t.comment], color: 'var(--text-muted)' },
	{ tag: [t.strong], fontWeight: 'bold' },
	{ tag: [t.emphasis], fontStyle: 'italic' },
	{ tag: [t.strikethrough], textDecoration: 'line-through' },
	{ tag: [t.link], color: 'var(--text-muted)', textDecoration: 'underline' },
	{ tag: [t.heading], fontWeight: 'bold', color: 'var(--accent-red)' },
	{ tag: [t.atom, t.bool, t.special(t.variableName)], color: 'var(--accent-blue)' },
	{ tag: [t.processingInstruction, t.string, t.inserted], color: 'var(--accent-green)' },
	{ tag: [t.invalid], color: 'var(--accent-red)' },
]);
