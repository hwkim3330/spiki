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
let editorSpikis = [];
let editorSpikiTimer;
let editorSpikiEnabled = true;
let extensionContext;
function activate(context) {
    console.log('Spiki is waking up! 🐾');
    extensionContext = context;
    // Webview Provider 등록
    spikiProvider = new SpikiViewProvider_1.SpikiViewProvider(context.extensionUri, context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('spiki.panel', spikiProvider));
    // 상태바 아이템
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'spiki.show';
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
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
            startEditorSpikis();
            vscode.window.showInformationMessage('🐾 스피키가 에디터에 나타났어요!');
        }
        else {
            stopEditorSpikis();
            vscode.window.showInformationMessage('🐾 스피키가 에디터에서 숨었어요!');
        }
    }), vscode.commands.registerCommand('spiki.addEditorSpiki', () => {
        if (editorSpikiEnabled) {
            addEditorSpiki();
            vscode.window.showInformationMessage('🐾 에디터에 스피키 추가!');
        }
    }));
    // 코딩 활동 감지
    const config = vscode.workspace.getConfiguration('spiki');
    // 타이핑 감지
    vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length > 0 && config.get('autoFeed')) {
            handleTyping();
            // 타이핑하면 스피키들 반응
            if (editorSpikiEnabled && Math.random() < 0.15) {
                moveAllEditorSpikis();
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
                // 저장하면 스피키 추가 확률
                if (editorSpikiEnabled && Math.random() < 0.2) {
                    addEditorSpiki();
                }
            }
        }
    });
    // 디버그 시작 감지
    vscode.debug.onDidStartDebugSession(() => {
        spikiProvider.sendMessage({ type: 'reward', reason: 'debug', amount: 10 });
        // 디버그하면 스피키들 놀람
        if (editorSpikiEnabled) {
            moveAllEditorSpikis();
        }
    });
    // 터미널 명령 실행 감지
    vscode.window.onDidOpenTerminal(() => {
        spikiProvider.sendMessage({ type: 'event', event: 'terminal' });
    });
    // 에디터 변경 감지
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editorSpikiEnabled) {
            updateAllEditorSpikis();
        }
    });
    // 스피키 상태 업데이트 수신
    spikiProvider.onStateUpdate((state) => {
        updateStatusBar(state);
    });
    // 30초마다 스탯 감소
    setInterval(() => {
        spikiProvider.sendMessage({ type: 'tick' });
    }, 30000);
    // 에디터 스피키 시작
    if (editorSpikiEnabled) {
        startEditorSpikis();
    }
}
function getRandomSpikiImage() {
    const imageIndex = Math.floor(Math.random() * 15) + 1;
    return vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'images', `spiki${imageIndex}.png`);
}
function createSpikiDecoration(imageUri, isGutter = false) {
    if (isGutter) {
        return vscode.window.createTextEditorDecorationType({
            gutterIconPath: imageUri,
            gutterIconSize: 'contain',
        });
    }
    else {
        // 인라인 데코레이션 (코드 뒤에 나타남)
        return vscode.window.createTextEditorDecorationType({
            after: {
                contentIconPath: imageUri,
                margin: '0 0 0 20px',
                width: '24px',
                height: '24px',
            }
        });
    }
}
function addEditorSpiki() {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const document = editor.document;
    const lineCount = document.lineCount;
    if (lineCount === 0)
        return;
    // 랜덤 위치
    const line = Math.floor(Math.random() * Math.min(lineCount, 100));
    const lineText = document.lineAt(line).text;
    const character = Math.min(lineText.length, Math.floor(Math.random() * 50));
    const imageIndex = Math.floor(Math.random() * 15) + 1;
    const imageUri = vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'images', `spiki${imageIndex}.png`);
    // gutter 또는 inline 랜덤 선택
    const isGutter = Math.random() < 0.3;
    const decoration = createSpikiDecoration(imageUri, isGutter);
    const spiki = {
        id: 'spiki_' + Date.now() + '_' + Math.random(),
        line,
        character,
        imageIndex,
        decoration,
    };
    editorSpikis.push(spiki);
    updateEditorSpiki(spiki, editor);
}
function moveEditorSpiki(spiki) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const document = editor.document;
    const lineCount = document.lineCount;
    if (lineCount === 0)
        return;
    // 새 위치로 이동 (점프하듯이)
    const newLine = Math.floor(Math.random() * Math.min(lineCount, 100));
    const lineText = document.lineAt(newLine).text;
    const newChar = Math.min(lineText.length, Math.floor(Math.random() * 50));
    spiki.line = newLine;
    spiki.character = newChar;
    // 표정 변경
    spiki.imageIndex = Math.floor(Math.random() * 15) + 1;
    const imageUri = vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'images', `spiki${spiki.imageIndex}.png`);
    // 기존 데코레이션 제거하고 새로 생성
    spiki.decoration.dispose();
    const isGutter = Math.random() < 0.3;
    spiki.decoration = createSpikiDecoration(imageUri, isGutter);
    updateEditorSpiki(spiki, editor);
}
function updateEditorSpiki(spiki, editor) {
    const lineCount = editor.document.lineCount;
    if (lineCount === 0)
        return;
    const line = Math.min(spiki.line, lineCount - 1);
    const lineText = editor.document.lineAt(line).text;
    const char = Math.min(spiki.character, lineText.length);
    const range = new vscode.Range(new vscode.Position(line, char), new vscode.Position(line, char));
    editor.setDecorations(spiki.decoration, [{ range }]);
}
function updateAllEditorSpikis() {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    editorSpikis.forEach(spiki => {
        updateEditorSpiki(spiki, editor);
    });
}
function moveAllEditorSpikis() {
    editorSpikis.forEach(spiki => {
        if (Math.random() < 0.5) {
            moveEditorSpiki(spiki);
        }
    });
}
function startEditorSpikis() {
    // 초기 스피키 몇 마리 추가
    for (let i = 0; i < 3; i++) {
        setTimeout(() => addEditorSpiki(), i * 500);
    }
    // 주기적으로 이동
    editorSpikiTimer = setInterval(() => {
        // 랜덤하게 이동
        editorSpikis.forEach(spiki => {
            if (Math.random() < 0.3) {
                moveEditorSpiki(spiki);
            }
        });
        // 가끔 새 스피키 추가 (최대 20마리)
        if (editorSpikis.length < 20 && Math.random() < 0.1) {
            addEditorSpiki();
        }
    }, 3000 + Math.random() * 2000);
}
function stopEditorSpikis() {
    if (editorSpikiTimer) {
        clearInterval(editorSpikiTimer);
        editorSpikiTimer = undefined;
    }
    // 모든 데코레이션 제거
    editorSpikis.forEach(spiki => {
        spiki.decoration.dispose();
    });
    editorSpikis = [];
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
    const editorCount = editorSpikis.length;
    const totalCount = count + editorCount;
    statusBarItem.text = `$(heart) Spiki ${emoji} Lv.${level} x${totalCount}`;
    statusBarItem.tooltip = state
        ? `행복: ${Math.round(happiness)}% | 포만감: ${Math.round(state.hunger)}% | 에너지: ${Math.round(state.energy)}%\n패널: ${count}마리 | 에디터: ${editorCount}마리`
        : 'Click to see Spiki!';
}
function deactivate() {
    stopEditorSpikis();
    console.log('Spiki is sleeping... 💤');
}
//# sourceMappingURL=extension.js.map