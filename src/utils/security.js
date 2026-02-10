/**
 * 前端防護腳本
 * 1. 禁用右鍵與常用開發者快捷鍵
 * 2. 防止控制台輸出
 */

export function initSecurity() {
    // Vite 環境建議使用 import.meta.env.PROD
    if (!import.meta.env.PROD) return;

    // 1. 禁用右鍵選單
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 2. 禁用常用快捷鍵 (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // 3. 防止控制台輸出 (保留 warn/error 供線上除錯與事故追蹤)
    const noop = () => { };
    window.console.log = noop;
    window.console.info = noop;
}

