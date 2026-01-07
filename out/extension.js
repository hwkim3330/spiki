"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const SpikiViewProvider_1 = require("./SpikiViewProvider");
let spikiProvider;
let statusBarItem;
let typingTimer;
let saveCount = 0;
// 에디터 데코레이션 (스피키가 에디터에서 돌아다님)
let editorSpikiDecoration;
let editorSpikiPosition = { line: 0, character: 0 };
let editorSpikiTimer;
let editorSpikiEnabled = true;
function activate(context) {
    console.log('Spiki is waking up! 🐾');
    // Webview Provider 등록
    spikiProvider = new SpikiViewProvider_1.SpikiViewProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('spiki.panel', spikiProvider));
    // 상태바 아이템
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'spiki.show';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // 에디터 스피키 데코레이션 생성
    createEditorSpikiDecoration(context);
    // 명령어 등록
    context.subscriptions.push(vscode.commands.registerCommand('spiki.show', () => {
        vscode.commands.executeCommand('spiki.panel.focus');
    }), vscode.commands.registerCommand('spiki.feed', () => {
        spikiProvider.sendMessage({ type: 'action', action: 'feed' });
    }), vscode.commands.registerCommand('spiki.play', () => {
        spikiProvider.sendMessage({ type: 'action', action: 'play' });
    }), vscode.commands.registerCommand('spiki.pet', () => {
        spikiProvider.sendMessage({ type: 'action', action: 'pet' });
    }), vscode.commands.registerCommand('spiki.toggleEditorSpiki', () => {
        editorSpikiEnabled = !editorSpikiEnabled;
        if (editorSpikiEnabled) {
            startEditorSpiki();
            vscode.window.showInformationMessage('🐾 스피키가 에디터에 나타났어요!');
        }
        else {
            stopEditorSpiki();
            vscode.window.showInformationMessage('🐾 스피키가 에디터에서 숨었어요!');
        }
    }));
    // 코딩 활동 감지
    const config = vscode.workspace.getConfiguration('spiki');
    // 타이핑 감지
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length > 0 && config.get('autoFeed')) {
            handleTyping();
            // 타이핑하면 스피키가 반응
            if (editorSpikiEnabled && Math.random() < 0.1) {
                moveEditorSpiki();
            }
        }
    });
    // 파일 저장 감지
    vscode.workspace.onDidSaveTextDocument(() => {
        if (config.get('autoFeed')) {
            saveCount++;
            if (saveCount >= 3) {
                spikiProvider.sendMessage({ type: 'reward', reason: 'save', amount: 5 });
                saveCount = 0;
            }
        }
    });
    // 디버그 시작 감지
    vscode.debug.onDidStartDebugSession(() => {
        spikiProvider.sendMessage({ type: 'reward', reason: 'debug', amount: 10 });
    });
    // 터미널 명령 실행 감지
    vscode.window.onDidOpenTerminal(() => {
        spikiProvider.sendMessage({ type: 'event', event: 'terminal' });
    });
    // 에디터 변경 감지
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editorSpikiEnabled) {
            updateEditorSpiki(editor);
        }
    });
    // 스피키 상태 업데이트 수신
    spikiProvider.onStateUpdate((state) => {
        updateStatusBar(state);
    });
    // 30분마다 스탯 감소
    setInterval(() => {
        spikiProvider.sendMessage({ type: 'tick' });
    }, 30000);
    // 에디터 스피키 시작
    if (editorSpikiEnabled) {
        startEditorSpiki();
    }
}
function createEditorSpikiDecoration(context) {
    const spikiImages = [];
    for (let i = 1; i <= 15; i++) {
        spikiImages.push(vscode.Uri.joinPath(context.extensionUri, 'media', 'images', `spiki${i}.png`));
    }
    // 현재 스피키 이미지 (랜덤)
    const currentImage = spikiImages[Math.floor(Math.random() * spikiImages.length)];
    editorSpikiDecoration = vscode.window.createTextEditorDecorationType({
        gutterIconPath: currentImage,
        gutterIconSize: '80%',
    });
}
function startEditorSpiki() {
    // 주기적으로 스피키 이동
    editorSpikiTimer = setInterval(() => {
        moveEditorSpiki();
    }, 5000 + Math.random() * 5000);
    // 초기 위치 설정
    moveEditorSpiki();
}
function stopEditorSpiki() {
    if (editorSpikiTimer) {
        clearInterval(editorSpikiTimer);
        editorSpikiTimer = undefined;
    }
    // 데코레이션 제거
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        editor.setDecorations(editorSpikiDecoration, []);
    }
}
function moveEditorSpiki() {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const document = editor.document;
    const lineCount = document.lineCount;
    if (lineCount === 0)
        return;
    // 랜덤 위치로 이동
    const newLine = Math.floor(Math.random() * Math.min(lineCount, 50));
    editorSpikiPosition.line = newLine;
    updateEditorSpiki(editor);
}
function updateEditorSpiki(editor) {
    if (!editorSpikiEnabled)
        return;
    const lineCount = editor.document.lineCount;
    if (lineCount === 0)
        return;
    // 범위 체크
    const line = Math.min(editorSpikiPosition.line, lineCount - 1);
    const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 0));
    editor.setDecorations(editorSpikiDecoration, [{ range }]);
}
function handleTyping() {
    if (typingTimer) {
        clearTimeout(typingTimer);
    }
    typingTimer = setTimeout(() => {
        spikiProvider.sendMessage({ type: 'reward', reason: 'typing', amount: 1 });
    }, 2000);
}
function updateStatusBar(state) {
    const happiness = state?.happiness ?? 100;
    const level = state?.level ?? 1;
    const count = state?.spikiCount ?? 1;
    let emoji = '😊';
    if (happiness < 30)
        emoji = '😢';
    else if (happiness < 60)
        emoji = '😐';
    else if (happiness > 80)
        emoji = '😄';
    statusBarItem.text = `$(heart) Spiki ${emoji} Lv.${level}${count > 1 ? ` x${count}` : ''}`;
    statusBarItem.tooltip = state
        ? `행복: ${Math.round(happiness)}% | 포만감: ${Math.round(state.hunger)}% | 에너지: ${Math.round(state.energy)}%\n스피키: ${count}마리`
        : 'Click to see Spiki!';
}
function deactivate() {
    if (editorSpikiTimer) {
        clearInterval(editorSpikiTimer);
    }
    console.log('Spiki is sleeping... 💤');
}
//# sourceMappingURL=extension.js.map