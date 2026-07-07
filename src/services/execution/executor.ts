import { EditorView } from 'codemirror';
import { MeaoiuError } from 'meaoiu';
import { setRuntimeErrorEffect } from '../editor/lsp';
import RunnerWorker from './runner.worker?worker';
import type { HostMessage, WorkerMessage } from './workerTypes';

export type LogType = 'system' | 'output' | 'input' | 'error' | 'success' | 'prompt-label';
export type PromptState = {
	question: string;
	resolve: (answer: string) => void;
} | null;

const MARKER_REGEX = /\x01(\w+)\x02([\s\S]*?)\x03/g;
export function appendStyledText(parent: HTMLElement, raw: string): void {
	let lastIndex = (MARKER_REGEX.lastIndex = 0); // 重置 lastIndex 以从头匹配
	for (let match: RegExpExecArray | null; (match = MARKER_REGEX.exec(raw)); ) {
		// 标记之前的普通文本
		if (match.index > lastIndex) parent.appendChild(document.createTextNode(raw.slice(lastIndex, match.index)));

		const [, type, content] = match;
		const span = document.createElement('span');
		span.className = `val-${type}`;
		span.textContent = content!;
		parent.appendChild(span);
		lastIndex = MARKER_REGEX.lastIndex;
	}
	if (lastIndex < raw.length) parent.appendChild(document.createTextNode(raw.slice(lastIndex))); // 补尾
}

let worker = new RunnerWorker(); // 预热

export function terminateExecution() {
	worker.terminate();
	worker = new RunnerWorker(); // 强制中断后立即重建
}

interface executeParam {
	view: EditorView;
	addLog: (text: string, type: LogType) => void;
	setPendingPrompt: (prompt: PromptState) => void;
	setIsRunning: (isRunning: boolean) => void;
	setInputValue: (value: string) => void;
}
async function execute({ view, addLog, setPendingPrompt, setIsRunning, setInputValue }: executeParam) {
	setIsRunning(true);

	view.dispatch({ effects: setRuntimeErrorEffect.of(null) });

	addLog('正在咏唱喵…', 'system');
	addLog('\n', 'system');

	const snapshotDoc = view.state.doc;
	const sourceCode = snapshotDoc.toString();

	const post = (msg: HostMessage) => worker.postMessage(msg);
	const finish = () => (setPendingPrompt(null), setIsRunning(false), setInputValue(''));

	worker.onmessage = ({ data }: MessageEvent<WorkerMessage>): void => {
		switch (data.type) {
			case 'LOG':
				return addLog(data.text, data.logType);
			case 'PROMPT': {
				const { question } = data;
				addLog(question, 'prompt-label');
				return setPendingPrompt({
					question,
					resolve: answer => (post({ type: 'ANSWER', answer }), setPendingPrompt(null), setInputValue('')),
				});
			}
			case 'DONE':
				addLog('\n结束了~', 'system');
				addLog('神谕显影喵~', 'success');
				return finish();
			case 'ERROR': {
				addLog('\n哈气了…', 'system');
				const { message, phase, line, col, endLine, endCol } = data.error;
				const isLineValid = line > 0;
				const phaseText = MeaoiuError.phaseTextTuple[phase];
				const location = isLineValid ? `\n[行 ${line} 列 ${col}] -> [行 ${endLine} 列 ${endCol}]` : '';
				addLog(`[${phaseText}]${location}:`, 'error');
				addLog('————', 'system');
				addLog(`${message}`, 'error');

				if (!isLineValid || !view.state.doc.eq(snapshotDoc)) {
					return (addLog(`提示：${isLineValid ? '偷偷改原文？位置自己找' : '问题好像很严重'}`, 'system'), finish());
				}

				const from = snapshotDoc.line(line).from + col - 1;
				const to = snapshotDoc.line(endLine).from + endCol - 1;
				view.dispatch({
					effects: [setRuntimeErrorEffect.of({ from, to }), EditorView.scrollIntoView(from, { y: 'center' })],
				});

				return finish();
			}
			default:
				const _d: never = data;
				return console.error('不应存在此类消息：', _d);
		}
	};

	post({ type: 'RUN', sourceCode });
}

export default { execute };
