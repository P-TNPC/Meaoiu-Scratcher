import type { MeaoiuError } from 'meaoiu';
import type { LogType } from './executor';

type RunMessage = { type: 'RUN'; sourceCode: string };
type AnswerMessage = { type: 'ANSWER'; answer: string };
type WakeupMessage = { type: 'WAKEUP' };
/** 主线程给 Worker 的消息 */
export type HostMessage = RunMessage | AnswerMessage | WakeupMessage;

type LogMessage = { type: 'LOG'; text: string; logType: LogType };
type PromptMessage = { type: 'PROMPT'; question: string };
type SleepMessage = { type: 'SLEEP'; seconds: number };
type SleepEndMessage = { type: 'AWAKE' };
type DoneMessage = { type: 'DONE' };
type ErrorPayload = Pick<MeaoiuError, 'message' | 'phase' | 'line' | 'col' | 'endLine' | 'endCol'>;
type ErrorMessage = { type: 'ERROR'; error: ErrorPayload };
/** Worker 给主线程的消息 */
export type WorkerMessage = LogMessage | PromptMessage | SleepMessage | SleepEndMessage | DoneMessage | ErrorMessage;
