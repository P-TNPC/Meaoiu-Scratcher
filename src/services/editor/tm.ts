import { StreamLanguage } from '@codemirror/language';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const enum FuncState {
	NONE,
	EXPECTING_PARAM_START,
	IN_PARAM,
	EXPECTING_FUNC_NAME,
}
type MeaoiuState = {
	commentLevel: number;
	blockDepth: number;
	funcState: FuncState;
};

const KEYWORDS_LIST =
	'蹭|就是|就像|才是|高仿|抢走|好不好\\?|不然|玩耍|累了|想要|扒|叼回来|偷袭|好喵|坏喵|空碗|和|或|都好|不坏|都坏|不好';

const KEYWORDS_REGEX = new RegExp(`^(?:${KEYWORDS_LIST})`);
const ID_REGEX = new RegExp(`^[\\p{ID_Start}_](?:(?!(${KEYWORDS_LIST}))[\\p{ID_Continue}])*`, 'u');
const FUNC_NAME_REGEX = /^[^\s~[\]()#@+\-*/=<>,!]+/;

export const meaoiuSyntaxLanguage = StreamLanguage.define<MeaoiuState>({
	name: 'meaoiu',
	startState: () => ({ commentLevel: 0, blockDepth: 0, funcState: FuncState.NONE }),
	token: (stream, state) => {
		if (state.commentLevel > 0) {
			if (stream.match('(')) return (state.commentLevel++, 'comment');
			if (stream.match(')')) return (state.commentLevel--, 'comment');
			stream.next();
			return 'comment';
		}
		if (stream.match('(')) return (state.commentLevel++, 'comment');
		if (stream.eatSpace()) return null;

		switch (state.funcState) {
			case FuncState.EXPECTING_FUNC_NAME:
				state.funcState = FuncState.NONE;
				if (stream.match(/^\{[^}]+\}/) || stream.match(FUNC_NAME_REGEX)) return 'def';
				break;
			case FuncState.EXPECTING_PARAM_START:
				if (stream.match('[=')) return ((state.funcState = FuncState.IN_PARAM), 'punctuation');
				state.funcState = FuncState.NONE;
				break;
			case FuncState.IN_PARAM:
				if (stream.match('=]')) return ((state.funcState = FuncState.EXPECTING_FUNC_NAME), 'punctuation');
				break;
		}

		if (stream.match(/^".*?"/) || stream.match(/^'.*?'/)) return 'string';
		if (stream.match(/^["']/)) return (stream.skipToEnd(), 'string');

		const kwMatch = stream.match(KEYWORDS_REGEX);
		if (kwMatch && kwMatch !== true) {
			const word = kwMatch[0];
			if (word === '想要') return ((state.funcState = FuncState.EXPECTING_PARAM_START), 'keyword');
			if (word === '扒') return 'keyword';
			if (/^(?:不然|玩耍|累了|叼回来|偷袭|蹭|好不好\?)$/.test(word)) return 'keyword';
			if (/^(?:和|或|都好|不坏|都坏|不好|就是|就像|才是|高仿|抢走)$/.test(word)) return 'operator';
			if (/^(?:好喵|坏喵)$/.test(word)) return 'bool';
			if (word === '空碗') return 'atom';
		}

		if (stream.match('~')) return ((state.funcState = FuncState.NONE), 'punctuation');
		if (stream.match('[#')) return (state.blockDepth++, 'punctuation');
		if (stream.match('#]')) return ((state.blockDepth = Math.max(0, state.blockDepth - 1)), 'punctuation');

		if (stream.match(/^(?:\[=|=\]|,|@)/)) return 'punctuation';
		if (stream.match(/^(?:==|!=|>=|<=|>|<|\+|-|\*|\/)/)) return 'operator';
		if (stream.match(/^[0-9]+(?:\.[0-9]+)?/)) return 'number';
		if (stream.match(/^\{[^}]+\}/)) return 'variableName';
		if (stream.match(ID_REGEX)) return 'variableName';

		stream.next();
		return null;
	},
	indent: (state, textAfter, { unit }) => {
		const isClosing = /^\s*#\]/.test(textAfter);
		return Math.max(0, (state.blockDepth - +isClosing) * unit);
	},

	languageData: {
		closeBrackets: { brackets: ['(', "'", '"', '['] },
		commentTokens: { block: { open: '(', close: ')' } },
		indentOnInput: /^\s*#\]$/,
	},
});

const patternWrap = ({ state, dispatch }: EditorView, char: string, open: string, close: string): boolean => {
	if (state.selection.ranges.every(r => r.empty)) return false;

	const changeByRange = state.changeByRange(range => {
		// 其中某个光标无选中内容，插入单字符
		const { empty, from } = range;
		if (empty) return { changes: { from, insert: char }, range: EditorSelection.cursor(from + char.length) };
		// 有选中内容，两侧插入闭合符
		const changes = [
			{ from, insert: open },
			{ from: range.to, insert: close },
		];
		return { changes, range: EditorSelection.range(range.anchor + open.length, range.head + open.length) };
	});
	dispatch({ ...changeByRange, scrollIntoView: true, userEvent: 'input.type' });
	return true;
};
export const meaoiuAutoPair = EditorView.inputHandler.of((view, _from, _to, text) => {
	if (text === '=') return patternWrap(view, '=', '[=', '=]');
	if (text === '#') return patternWrap(view, '#', '[#', '#]');
	return false;
});
