// Создаем пункт контекстного меню при установке.
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "send-to-chatgpt",
        title: "Отправить выделенный текст в ChatGPT",
        contexts: ["selection"]
    });
});

// Обработчик клика по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "send-to-chatgpt" && info.selectionText) {
        openChatWithText(info.selectionText);
    }
});

// Обработчик нажатия на иконку расширения
chrome.action.onClicked.addListener(async (tab) => {
    const [result] = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: () => window.getSelection().toString()
    });
    const selectedText = (result && result.result) ? result.result.trim() : "";
    openChatWithText(selectedText);
});

async function openChatWithText(text) {
    // Открываем новую вкладку с ChatGPT
    const chatTab = await chrome.tabs.create({url: "https://chat.openai.com/chat"});

    if (text) {
        // Дожидаемся загрузки страницы и вставляем текст
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === chatTab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                chrome.scripting.executeScript({
                    target: {tabId: chatTab.id},
                    func: insertTextIntoChatGPT,
                    args: [text]
                });
            }
        });
    }
}

function insertTextIntoChatGPT(selectedText) {
    let editableDiv = document.querySelector("div#prompt-textarea");
editableDiv.focus();


    if (textarea) {
        document.execCommand("insertText", false, selectedText);
    } else {
        alert("Не удалось найти поле ввода на странице ChatGPT.");
    }
}
