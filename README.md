# Ask ChatGPT Chrome Extension

This Chrome extension allows you to quickly send selected text from any web page to ChatGPT.

## Features

- **Context Menu Integration:** Simply right-click on any selected text and choose "Send selected text to ChatGPT" from the context menu.
- **Extension Icon:** Click the extension icon in your toolbar to send the selected text. If no text is selected, it will open a new ChatGPT tab.
- **Resilient Text Insertion:** The extension is designed to work with different versions of the ChatGPT interface and will retry inserting text to ensure it's not lost.
- **Automatic Tab Management:** The extension opens a new ChatGPT tab for you and handles sending the text.

## Installation

### From the Chrome Web Store (Recommended)

1.  Go to the [Ask ChatGPT extension page](https://chrome.google.com/webstore/detail/your-extension-id) in the Chrome Web Store.
2.  Click "Add to Chrome".
3.  The extension will be installed, and you'll see the Ask ChatGPT icon in your toolbar.

**(Note: You will need to replace `your-extension-id` with the actual ID after publishing.)**

### Manual Installation (for Developers)

1.  Clone this repository to your local machine:
    ```bash
    git clone https://github.com/your-username/chrome_ex_ask_gpt.git
    ```
2.  Open Google Chrome and go to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the `chrome_ex_ask_gpt` directory.
5.  The extension will be installed.

## How to Use

1.  Select any text on a web page.
2.  **Method 1 (Context Menu):** Right-click on the selected text and click "Send selected text to ChatGPT".
3.  **Method 2 (Extension Icon):** Click on the Ask ChatGPT extension icon in your toolbar.
4.  A new tab will open with ChatGPT, and your selected text will be automatically pasted into the input field.

**Note:** The context menu item is in Russian ("Отправить выделенный текст в ChatGPT").

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or find any bugs, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
