export function confirmDialog(title: string, message: string, confirmText: string = '好喵'): Promise<boolean> {
	const { promise, resolve } = Promise.withResolvers<boolean>();

	const dialog = document.createElement('dialog');
	dialog.className = 'confirm-dialog';

	dialog.innerHTML = `
		<p class="confirm-title"></p>
		<p class="confirm-message"></p>
		<form method="dialog" class="confirm-actions">
			<button class="meaoiu-btn btn-secondary" value="cancel">算了</button>
			<button class="meaoiu-btn btn-danger" value="confirm" autofocus></button>
		</form>
	`;

	dialog.querySelector('.confirm-title')!.textContent = title;
	dialog.querySelector('.confirm-message')!.textContent = message;
	dialog.querySelector('[value="confirm"]')!.textContent = confirmText;

	dialog.addEventListener('close', () => {
		resolve(dialog.returnValue === 'confirm');
		// 等退出动画完成再移除
		dialog.addEventListener('transitionend', () => dialog.remove(), { once: true });
		setTimeout(() => dialog.remove(), 300); // 防 transition 意外失效卡 DOM
	});

	// 点击背景层关闭
	dialog.addEventListener('click', e => void (e.target === dialog && dialog.close('cancel')));

	document.body.append(dialog);
	dialog.showModal();

	return promise;
}
