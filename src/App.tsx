import { EditorView } from 'codemirror';
import type { TargetedPointerEvent } from 'preact';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { Console } from './components/Console';
import { Editor } from './components/Editor';
import { LAYOUT_MODES, type LayoutMode, THEME_MODES, type ThemeMode, Toolbar } from './components/Toolbar';
import type { LogType, PromptState } from './services/executor';
import { appendStyledText, runCode, terminateExecution } from './services/executor';
import { meaoiuFormatting } from './services/lsp';

export function App() {
	const viewRef = useRef<EditorView>(null);
	const terminalEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const logsContainerRef = useRef<HTMLDivElement>(null);
	const resizerRef = useRef<HTMLDivElement>(null);

	const [isRunning, setIsRunning] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<PromptState>(null);
	const [inputValue, setInputValue] = useState('');
	const [showInlayHints, setShowInlayHints] = useState(false);
	const [tabSize, setTabSize] = useState<number>(4);
	const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('theme-mode') || 'auto') as ThemeMode);
	const [splitRatio, setSplitRatio] = useState<number>(60);
	const [hasLogs, setHasLogs] = useState(false);

	// 自动滚到底
	useEffect(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [pendingPrompt]);
	// 自动聚焦 prompt 输入框
	useEffect(() => void (pendingPrompt && requestAnimationFrame(() => inputRef.current?.focus())), [pendingPrompt]);
	// 自动换配色
	useLayoutEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

		const apply = () => {
			const resolved = themeMode === 'auto' ? (mediaQuery.matches ? 'light' : 'dark') : themeMode;
			document.documentElement.dataset['theme'] = resolved;

			requestAnimationFrame(() => {
				const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
				if (!meta) return;
				const color = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim();
				if (color) meta.content = color;
			}); // 等一帧 CSS 变量
		};
		apply();
		localStorage.setItem('theme-mode', themeMode);

		if (themeMode !== 'auto') return;
		mediaQuery.addEventListener('change', apply);
		return () => mediaQuery.removeEventListener('change', apply);
	}, [themeMode]);

	const addLog = useCallback((text: string, type: LogType) => {
		if (!logsContainerRef.current) return;
		setHasLogs(true);

		const div = document.createElement('div');
		div.className = `term-line term-${type}`;
		if (type === 'output') appendStyledText(div, text);
		else div.textContent = text;

		logsContainerRef.current.appendChild(div);
		terminalEndRef.current?.scrollIntoView();
	}, []);
	const clearLogs = () => (logsContainerRef.current?.replaceChildren(), setHasLogs(false));

	// 顶栏用
	const handleRunOrStop = async () => {
		if (!viewRef.current) return;
		setPendingPrompt(null);
		setInputValue('');
		if (isRunning) {
			terminateExecution();
			addLog('\n不玩了…', 'system');
			addLog('施法被打断了~', 'error');
			setIsRunning(false);
			return;
		}
		clearLogs();
		await runCode(viewRef.current, addLog, setPendingPrompt, setIsRunning, setInputValue);
	};
	const handleFormat = () => void (viewRef.current && meaoiuFormatting(viewRef.current));
	const toggleLayout = () => {
		setLayoutMode(m => LAYOUT_MODES[(LAYOUT_MODES.findIndex(x => x.value === m) + 1) % LAYOUT_MODES.length]!.value);
	};
	const toggleTheme = () => {
		setThemeMode(m => THEME_MODES[(THEME_MODES.findIndex(x => x.value === m) + 1) % THEME_MODES.length]!.value);
	};

	// 分隔条用
	const handleResizerDown = (e: TargetedPointerEvent<HTMLDivElement>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		document.body.style.userSelect = 'none';
	};
	const handleResizerMove = (e: TargetedPointerEvent<HTMLDivElement>) => {
		if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
		const mainEl = e.currentTarget.parentElement;
		if (!mainEl) return;

		const rect = mainEl.getBoundingClientRect();
		const isColumn = getComputedStyle(mainEl).flexDirection === 'column';
		const pos = isColumn ? e.clientY - rect.top : e.clientX - rect.left;
		const size = isColumn ? rect.height : rect.width;

		setSplitRatio(Math.max(10, Math.min(90, (pos / size) * 100)));
	};
	const handleResizerUp = () => void (document.body.style.userSelect = '');

	// 输出区用
	const handlePromptSubmit = (e: KeyboardEvent) => {
		if (e.key !== 'Enter' || !pendingPrompt) return;
		e.preventDefault();
		const answer = inputValue;
		addLog(`> ${answer}`, 'input');
		setInputValue('');
		setPendingPrompt(null);
		pendingPrompt.resolve(answer);
	};

	return (
		<div className={`meaoiu-ide layout-${layoutMode}`}>
			<Toolbar
				layoutMode={layoutMode}
				toggleLayout={toggleLayout}
				themeMode={themeMode}
				toggleTheme={toggleTheme}
				tabSize={tabSize}
				setTabSize={setTabSize}
				showInlayHints={showInlayHints}
				setShowInlayHints={setShowInlayHints}
				isRunning={isRunning}
				handleFormat={handleFormat}
				handleRunOrStop={handleRunOrStop}
			/>

			<div className='ide-main'>
				<Editor
					tabSize={tabSize}
					showInlayHints={showInlayHints}
					viewRef={viewRef}
					style={{ flexBasis: `${splitRatio}%` }}
				/>
				<div
					className='ide-resizer'
					ref={resizerRef}
					onPointerDown={handleResizerDown}
					onPointerMove={handleResizerMove}
					onPointerUp={handleResizerUp}
					onPointerCancel={handleResizerUp}
				/>
				<div className='ide-console' style={{ flexBasis: `${100 - splitRatio}%` }}>
					<Console
						isRunning={isRunning}
						hasLogs={hasLogs}
						pendingPrompt={pendingPrompt}
						inputValue={inputValue}
						setInputValue={setInputValue}
						handleInputKeyDown={handlePromptSubmit}
						handleClearConsole={clearLogs}
						inputRef={inputRef}
						logsContainerRef={logsContainerRef}
						terminalEndRef={terminalEndRef}
					/>
				</div>
			</div>
		</div>
	);
}
