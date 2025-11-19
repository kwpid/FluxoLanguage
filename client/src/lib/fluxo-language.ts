import { loader } from "@monaco-editor/react";

export function registerFluxoLanguage() {
  loader.init().then((monaco) => {
    // Register Fluxo language
    monaco.languages.register({ id: 'fluxo' });

    // Define syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('fluxo', {
      keywords: [
        'module', 'export', 'require', 'function', 'return', 'if', 'else',
        'while', 'for', 'break', 'continue', 'var', 'let', 'const',
        'true', 'false', 'null', 'undefined'
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
