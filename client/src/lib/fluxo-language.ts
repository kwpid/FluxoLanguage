import { loader } from "@monaco-editor/react";

export function registerFluxoLanguage() {
  loader.init().then((monaco) => {
    // Register Fluxo language
    monaco.languages.register({ id: 'fluxo' });

    // Define syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('fluxo', {
      keywords: [
        'module', 'export', 'require', 'function', 'return', 'if', 'else',
        'while', 'for', 'break', 'continue', 'local',
        'true', 'false', 'null', 'undefined'
      ],

      htmlElements: [
        'createButton', 'createDiv', 'createInput', 'createText', 'createImage',
        'createContainer', 'createForm', 'createHeading', 'createParagraph',
        'createLink', 'createList', 'createListItem', 'createSpan'
      ],

      eventHandlers: [
        'onClick', 'onHover', 'onChange', 'onSubmit', 'onFocus', 'onBlur',
        'onKeyPress', 'onKeyDown', 'onKeyUp', 'onMouseEnter', 'onMouseLeave'
      ],

      operators: [
        '=', '>', '<', '!', ':', '+', '-', '*', '/', '%',
        '==', '!=', '<=', '>=', '&&', '||', '++', '--'
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      tokenizer: {
        root: [
          // Identifiers and keywords
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@htmlElements': 'type',
              '@eventHandlers': 'function',
              '@default': 'identifier'
            }
          }],

          // Whitespace
          { include: '@whitespace' },

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],

          // Delimiter: after number because of .\d floats
          [/[;,.]/, 'delimiter'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
        ],

        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],

        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ],
      },
    });

    // Define autocomplete suggestions
    monaco.languages.registerCompletionItemProvider('fluxo', {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: 'module',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'module ${1:moduleName} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a module',
          },
          {
            label: 'export',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'export function ${1:functionName}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Export a function from a module',
          },
          {
            label: 'require',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'require("${1:path}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import a module',
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a function',
          },
          {
            label: 'createButton',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createButton({ text: "${1:Button Text}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an interactive button element (requires HTMLSupporter extension)',
          },
          {
            label: 'createDiv',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createDiv({ class: "${1:container}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a container div element (requires HTMLSupporter extension)',
          },
          {
            label: 'createInput',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'createInput({ type: "${1:text}", placeholder: "${2:Enter text}" })',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create an input field (requires HTMLSupporter extension)',
          },
          {
            label: 'onClick',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onClick(function() {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a click event handler to an element (requires HTMLSupporter extension)',
          },
          {
            label: 'onChange',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onChange(function(value) {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a change event handler to an element (requires HTMLSupporter extension)',
          },
          {
            label: 'onHover',
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: 'onHover(function() {\n\t$0\n})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a hover event handler to an element (requires HTMLSupporter extension)',
          },
        ];

        return { suggestions };
      },
    });

    // Set theme for Fluxo
    monaco.editor.defineTheme('fluxo-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'ABB2BF' },
        { token: 'string', foreground: '98C379' },
        { token: 'number', foreground: 'D19A66' },
        { token: 'operator', foreground: '56B6C2' },
        { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background': '#1a1a1a',
      },
    });
  });
}
