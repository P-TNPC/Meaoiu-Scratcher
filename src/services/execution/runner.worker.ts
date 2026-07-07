import { execute, MeaoiuError, parseError, type IOConfig } from 'meaoiu';
import type { HostMessage, WorkerMessage } from './workerTypes';

const M_START = '\x01';
const M_SEP = '\x02';
const M_END = '\x03';

function webColorize(value: unknown, strValue: string): string {
	if (value == null) return `${M_START}null${M_SEP}${strValue}${M_END}`;
	switch (typeof value) {
		case 'number':
		case 'boolean':
			return `${M_START}literal${M_SEP}${strValue}${M_END}`;
		case 'string':
			return `${M_START}string${M_SEP}${strValue}${M_END}`;
		default:
			return strValue;
	}
}

const post = (msg: WorkerMessage): void => self.postMessage(msg);

self.onmessage = async ({ data }: MessageEvent<HostMessage>) => {
	if (data.type !== 'RUN') return;
	const ioConfig: IOConfig = {
		onPrint: text => post({ type: 'LOG', text, logType: 'output' }),
		onPrompt: question => {
			post({ type: 'PROMPT', question });
			const { promise, resolve } = Promise.withResolvers<string>();
			const handler = ({ data: hostMsg }: MessageEvent<HostMessage>) => {
				if (hostMsg.type !== 'ANSWER') return;
				self.removeEventListener('message', handler);
				resolve(hostMsg.answer);
			};
			self.addEventListener('message', handler);
			return promise;
		},
		styleize: webColorize,
	};
	try {
		await execute(data.sourceCode, ioConfig);
		post({ type: 'DONE' });
	} catch (err) {
		const error = err instanceof MeaoiuError ? err : parseError(err instanceof Error ? err.message : String(err));
		post({ type: 'ERROR', error });
	}
};
