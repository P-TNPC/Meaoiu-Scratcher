import type { RefObject } from 'preact';
import type { PromptState } from '../services/executor';

interface ConsoleProps {
	isRunning: boolean;
	hasLogs: boolean;
	pendingPrompt: PromptState;
	inputValue: string;
	setInputValue: (val: string) => void;
	handleInputKeyDown: (e: KeyboardEvent) => void;
	handleClearConsole: () => void;
	inputRef: RefObject<HTMLInputElement>;
	logsContainerRef: RefObject<HTMLDivElement>;
	terminalEndRef: RefObject<HTMLDivElement>;
}

export function Console({
	isRunning,
	hasLogs,
	pendingPrompt,
	inputValue,
	setInputValue,
	handleInputKeyDown,
	handleClearConsole,
	inputRef,
	logsContainerRef,
	terminalEndRef,
}: ConsoleProps) {
	return (
		<>
			<div className='console-header'>
				<span className='console-title'>回音垫</span>
				<div className='console-actions'>
					<button className='console-btn' onClick={handleClearConsole} disabled={isRunning} title='清空杂念'>
						<span className='nerd-icon'>󰐓</span>
					</button>
				</div>
			</div>
			<div className='console-output' onClick={() => inputRef.current?.focus()}>
				<div ref={logsContainerRef} />

				{pendingPrompt ? (
					// 内联输入区
					<div className='term-input-line'>
						<span className='term-input-prompt'>{'>'}</span>
						<input
							ref={inputRef}
							id='term-input'
							type='text'
							className='term-input'
							value={inputValue}
							onInput={e => setInputValue(e.currentTarget.value)}
							onKeyDown={handleInputKeyDown}
							spellcheck={false}
							autoComplete='off'
						/>
					</div>
				) : !hasLogs ? (
					// 空状态提示
					<div className='term-empty'>
						<span className='term-cursor-static'>Zzz</span> 呼噜轱辘…
					</div>
				) : null}

				<div ref={terminalEndRef} className='term-spacer' />
			</div>
		</>
	);
}
