import { VERSION } from 'meaoiu';
import { useEffect, useState } from 'preact/hooks';

export const LAYOUT_MODES = [
	{ value: 'auto', label: '自动' },
	{ value: 'horizontal', label: '横着' },
	{ value: 'vertical', label: '竖着' },
] as const;
export type LayoutMode = (typeof LAYOUT_MODES)[number]['value'];

export const THEME_MODES = [
	{ value: 'auto', label: '普通' },
	{ value: 'light', label: '浅色' },
	{ value: 'dark', label: '深色' },
] as const;
export type ThemeMode = (typeof THEME_MODES)[number]['value'];

const originalTitle = document.title;
let currentBaseTitle = originalTitle,
	titleTimer: ReturnType<typeof setInterval> = 0;
function* titleAnimator(sourceChars: string[], targetChars: string[], cursor: string = '█') {
	const maxLength = Math.max(sourceChars.length, targetChars.length);
	for (let i = 0, revealed = ''; i < maxLength; ) {
		const currentSourceChar = i < sourceChars.length ? sourceChars[i] : '';
		const currentTargetChar = i < targetChars.length ? targetChars[i] : '\u00A0'; // 空格这里是
		const remainingDisplay = sourceChars.slice(++i).join('');
		const remainingBase = currentSourceChar + remainingDisplay;
		yield { display: revealed + cursor + remainingDisplay, base: revealed + remainingBase };
		revealed += currentTargetChar;
	}
	const finalTarget = targetChars.join('');
	yield { display: finalTarget, base: finalTarget };
}
function setTitleState(state: string, durationMs: number = 233): void {
	clearInterval(titleTimer);
	const targetTitle = `${state ? `[${state}] ` : ''}${originalTitle}`;
	if (currentBaseTitle === targetTitle) return void (document.title = targetTitle);

	const sourceChars = [...currentBaseTitle];
	const targetChars = [...targetTitle];
	const maxLength = Math.max(sourceChars.length, targetChars.length);
	const intervalTime = Math.max(8, Math.trunc(durationMs / (maxLength + 1)));

	const animator = titleAnimator(sourceChars, targetChars);
	titleTimer = setInterval(() => {
		const { value, done } = animator.next();
		if (value) ({ display: document.title, base: currentBaseTitle } = value);
		if (done) clearInterval(titleTimer);
	}, intervalTime);
}

interface ToolbarProps {
	layoutMode: LayoutMode;
	toggleLayout: () => void;
	themeMode: ThemeMode;
	toggleTheme: () => void;
	tabSize: number;
	setTabSize: (size: number) => void;
	showInlayHints: boolean;
	setShowInlayHints: (show: boolean) => void;
	isRunning: boolean;
	handleFormat: () => void;
	handleRunOrStop: () => void;
}
export function Toolbar({
	layoutMode,
	toggleLayout,
	themeMode,
	toggleTheme,
	tabSize,
	setTabSize,
	showInlayHints,
	setShowInlayHints,
	isRunning,
	handleFormat,
	handleRunOrStop,
}: ToolbarProps) {
	const [showMenu, setShowMenu] = useState(false);
	useEffect(() => setTitleState(isRunning ? '= ω =' : ''), [isRunning]);

	return (
		<div className='ide-toolbar'>
			<button className='meaoiu-btn btn-secondary menu-toggle' onClick={() => setShowMenu(!showMenu)}>
				<span className='nerd-icon'></span>
			</button>
			<h2 className='title' title={VERSION}>
				喵谕
				<span className='title-suffix' title='不是手抓饭'>
					爪抓板
				</span>
			</h2>
			<div className={`secondary-actions ${showMenu ? 'open' : ''}`}>
				<button
					className='meaoiu-btn btn-secondary'
					onClick={() => window.open('https://github.com/P-TNPC/Meaoiu', '_blank')}
					title='访问 Github 仓库'
				>
					触手怪
				</button>
				<button
					className='meaoiu-btn btn-secondary'
					onClick={() => (toggleTheme(), setShowMenu(false))}
					title='切换配色主题'
				>
					{THEME_MODES.find(m => m.value === themeMode)?.label}抓板
				</button>
				<button
					className='meaoiu-btn btn-secondary'
					onClick={() => (toggleLayout(), setShowMenu(false))}
					title='切换布局方向'
				>
					{LAYOUT_MODES.find(m => m.value === layoutMode)?.label}摆
				</button>
				<button
					className='meaoiu-btn btn-secondary'
					onClick={() => (setTabSize(2 << +(tabSize !== 4)), setShowMenu(false))}
					title='切换Tab缩进宽度'
				>
					{tabSize === 2 ? '~~两' : '~~~~四'}格
				</button>
				<button
					className='meaoiu-btn btn-secondary'
					onClick={() => (setShowInlayHints(!showInlayHints), setShowMenu(false))}
					title={showInlayHints ? '隐藏内联提示' : '显示内联提示'}
				>
					{showInlayHints ? '大声暗示' : '隐隐推敲'}
				</button>
			</div>
			<div className='actions'>
				<button className='meaoiu-btn btn-secondary' onClick={handleFormat} title={'格式化脚本'}>
					排整齐
				</button>
				<button
					id='execute-btn'
					className={`meaoiu-btn btn-${isRunning ? 'danger' : 'primary'}`}
					style={{ boxSizing: 'content-box', minWidth: '10ch' }}
					onClick={handleRunOrStop}
				>
					<span className='nerd-icon'>{isRunning ? '' : ''}</span>
					{` ${isRunning ? '打断施法' : '开动喵'}`}
				</button>
			</div>
		</div>
	);
}
