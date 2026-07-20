import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PromptState, SleepState } from '../services/execution/executor';

interface ConsoleProps {
	isRunning: boolean;
	hasLogs: boolean;
	pendingPrompt: PromptState;
	sleepState: SleepState;
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
	sleepState,
	inputValue,
	setInputValue,
	handleInputKeyDown,
	handleClearConsole,
	inputRef,
	logsContainerRef,
	terminalEndRef,
}: ConsoleProps) {
	const lastSpaceRef = useRef<number>(0);
	const sleepRef = useRef<HTMLDivElement>(null);
	const [countdown, setCountdown] = useState(0);

	const isForever = !sleepState || sleepState.seconds <= 0;

	// 抢焦，防止空格误触外部按钮
	useEffect(() => void (sleepState && sleepRef.current?.focus()), [sleepState]);
	// 倒计时
	useEffect(() => {
		if (isForever) return setCountdown(0);

		setCountdown(sleepState.seconds);
		const timer = setInterval(() => setCountdown(c => Math.max(0, --c)), 1000);
		return () => clearInterval(timer);
	}, [sleepState]);
	// 双击空格唤醒
	useEffect(() => {
		if (!sleepState) return;

		const handler = (e: KeyboardEvent) => {
			if (e.key !== ' ' || (e.target as Element).className === 'cm-content') return void (lastSpaceRef.current = 0);
			e.preventDefault();

			const now = Date.now();
			lastSpaceRef.current = now - lastSpaceRef.current < 400 ? (sleepState.wakeup(), 0) : now;
		};

		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [sleepState]);

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
				) : sleepState ? (
					// 打盹状态条，tabIndex={-1} 捕获焦点
					<div className='term-sleep' ref={sleepRef} tabIndex={-1}>
						<span className='term-sleep-reason'>{isForever ? '睡死了喵' : `装睡喵`}</span>
						<span className='term-sleep-icon'>󰒲</span>
						{!isForever && countdown >= 0.5 && (
							<span className='term-sleep-reason countdown'>({+(countdown + Number.EPSILON).toFixed(1)}秒)</span>
						)}
						<span className='term-sleep-hint' title='键盘上的任意键不见了喵'>
							锤两下空格
						</span>
						<button className='term-sleep-btn' onClick={() => sleepState.wakeup()}>
							敲醒
						</button>
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
