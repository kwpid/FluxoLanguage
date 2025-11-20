import { type OutputMessage } from "@shared/schema";
import { randomUUID } from "crypto";
import { storage } from "./storage";

interface FluxoContext {
  variables: Map<string, any>;
  functions: Map<string, FluxoFunction>;
  modules: Map<string, FluxoModule>;
  output: OutputMessage[];
  returnValue?: any;
  shouldReturn: boolean;
}

interface FluxoFunction {
  params: string[];
  body: string;
  hasRestParam: boolean;
}

interface FluxoModule {
  name: string;
  exports: Map<string, FluxoFunction | any>;  // Can export functions or variables
  variables: Map<string, any>;  // Track module-level variables
}

export class FluxoInterpreter {
  private context: FluxoContext;
  private currentFilePath: string;

  constructor(filePath: string) {
    this.currentFilePath = filePath;
    this.context = {
      variables: new Map(),
      functions: new Map(),
      modules: new Map(),
      output: [],
      shouldReturn: false,
    };

    this.setupBuiltins();
  }

  private setupBuiltins() {
    const consoleLog = (...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      }).join(' ');
      this.addOutput('log', message);
    };

    const selectElement = (selector: string) => {
      return {
        selector,
        text: '',
        onClick: (handler: Function) => {
          this.addOutput('log', `Event handler registered for ${selector}: onClick`);
        },
        onChange: (handler: Function) => {
          this.addOutput('log', `Event handler registered for ${selector}: onChange`);
        },
        onHover: (handler: Function) => {
          this.addOutput('log', `Event handler registered for ${selector}: onHover`);
        },
      };
    };

    const wait = (seconds: number) => {
      return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    };

    this.context.variables.set('console', {
      log: consoleLog,
    });
    
    this.context.variables.set('selectElement', selectElement);
    this.context.variables.set('wait', wait);
  }

  private addOutput(type: OutputMessage['type'], message: string, line?: number, column?: number) {
    this.context.output.push({
      id: randomUUID(),
      type,
      message,
      timestamp: Date.now(),
      filePath: this.currentFilePath,
      line,
      column,
    });
  }

  async execute(code: string, isHtmlFile: boolean = false): Promise<OutputMessage[]> {
    try {
      if (isHtmlFile) {
        code = this.extractFluxoFromHtml(code);
      }
      code = this.removeComments(code);
      await this.parseAndExecute(code);
    } catch (error: any) {
      this.addOutput('error', error.message || 'Unknown error');
    }
    return this.context.output;
  }

  private extractFluxoFromHtml(html: string): string {
    // New approach: look for script tags with data-fluxo-entry attribute
    const entryRegex = /<script\s+[^>]*data-fluxo-entry=["']([^"']+)["'][^>]*>/gi;
    const entryMatches = [];
    let match;
    
    while ((match = entryRegex.exec(html)) !== null) {
      entryMatches.push(match[1]);
    }
    
    if (entryMatches.length > 0) {
      // Generate import statements for each entry point
      const htmlFileDir = this.currentFilePath.substring(0, this.currentFilePath.lastIndexOf('/'));
      const importStatements = entryMatches.map(entry => {
        let resolvedPath = entry;
        if (!entry.startsWith('/')) {
          resolvedPath = `${htmlFileDir}/${entry}`;
        }
        return `import("${resolvedPath}")`;
      }).join('\n');
      return importStatements;
    }
    
    // Fallback: check for old-style embedded Fluxo scripts (deprecated)
    const scriptRegex = /<script\s+[^>]*type=["']text\/fluxo["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [];
    
    while ((match = scriptRegex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    
    if (matches.length === 0) {
      this.addOutput('warning', 'No Fluxo entry points found. Use <script data-fluxo-entry="filename.fxm"> to import Fluxo modules.');
      return '';
    }
    
    this.addOutput('warning', 'Embedded Fluxo scripts are deprecated. Use <script data-fluxo-entry="filename.fxm"> instead.');
    return matches.join('\n\n');
  }

  private removeComments(code: string): string {
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    code = code.replace(/\/\/.*/g, '');
    return code;
  }

  private async parseAndExecute(code: string) {
    let pos = 0;

    while (pos < code.length) {
      pos = this.skipWhitespace(code, pos);
      if (pos >= code.length) break;

      if (code.substring(pos).startsWith('import from ')) {
        pos = await this.parseImportFrom(code, pos);
      } else if (code.substring(pos).startsWith('import(')) {
        pos = await this.parseImport(code, pos);
      } else if (code.substring(pos).startsWith('module folder ')) {
        pos = await this.parseModuleFolder(code, pos);
      } else if (code.substring(pos).startsWith('module ')) {
        pos = await this.parseModule(code, pos);
      } else if (code.substring(pos).startsWith('function ')) {
        pos = this.parseFunctionDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('local ')) {
        pos = await this.parseVariableDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('wait(')) {
        pos = await this.parseWaitStatement(code, pos);
      } else if (code.substring(pos).startsWith('if ')) {
        pos = await this.parseIfStatement(code, pos);
      } else if (code.substring(pos).startsWith('while ')) {
        pos = await this.parseWhileLoop(code, pos);
      } else if (code.substring(pos).startsWith('for ')) {
        pos = await this.parseForLoop(code, pos);
      } else if (code.substring(pos).startsWith('return ')) {
        pos = await this.parseReturn(code, pos);
      } else {
        pos = await this.parseStatement(code, pos);
      }

      if (this.context.shouldReturn) break;
    }
  }

  private skipWhitespace(code: string, pos: number): number {
    while (pos < code.length && /\s/.test(code[pos])) {
      pos++;
    }
    return pos;
  }

  private findMatchingBrace(code: string, startPos: number): number {
    let depth = 1;
    let pos = startPos + 1;
    let inString = false;
    let stringChar = '';

    while (pos < code.length && depth > 0) {
      if ((code[pos] === '"' || code[pos] === "'") && !inString) {
        inString = true;
        stringChar = code[pos];
      } else if (code[pos] === stringChar && inString && code[pos - 1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (code[pos] === '{') depth++;
        if (code[pos] === '}') depth--;
      }
      pos++;
    }

    return pos;
  }

  private async parseImportFrom(code: string, pos: number): Promise<number> {
    // Support both syntaxes:
    // 1. import from "fileName" { var1, var2 } (original)
    // 2. import { var1, var2 } from "fileName" (ES6-style)
    
    const oldStyleMatch = code.substring(pos).match(/import\s+from\s+"([^"]+)"\s*\{([^}]+)\}/);
    const es6StyleMatch = code.substring(pos).match(/import\s*\{([^}]+)\}\s+from\s+"([^"]+)"/);
    
    const match = es6StyleMatch || oldStyleMatch;
    if (match) {
      let modulePath: string;
      let importList: string[];
      
      if (es6StyleMatch) {
        // ES6-style: import { var1, var2 } from "fileName"
        importList = match[1].split(',').map(name => name.trim()).filter(n => n);
        modulePath = match[2];
      } else {
        // Old-style: import from "fileName" { var1, var2 }
        modulePath = match[1];
        importList = match[2].split(',').map(name => name.trim()).filter(n => n);
      }
      
      const fullPath = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
      const moduleFilePath = fullPath.endsWith('.fxm') ? fullPath : `${fullPath}.fxm`;

      const moduleContent = await storage.getFileContent(moduleFilePath);
      if (moduleContent) {
        // Load the module if not already loaded
        const moduleMatch = moduleContent.match(/module\s+(\w+)\s*\{/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          
          // Check if module is already loaded
          if (!this.context.modules.has(moduleName)) {
            await this.loadModule(moduleContent, moduleFilePath);
          }
          
          const loadedModule = this.context.modules.get(moduleName);
          if (loadedModule) {
            // Import only the specified variables/functions
            importList.forEach(name => {
              if (loadedModule.exports.has(name)) {
                const exported = loadedModule.exports.get(name);
                if (typeof exported === 'object' && exported.params !== undefined) {
                  // It's a function - create wrapper
                  this.context.variables.set(name, (...args: any[]) => {
                    return this.executeFunction(exported, args);
                  });
                } else {
                  // It's a variable
                  this.context.variables.set(name, exported);
                }
              } else {
                this.addOutput('warning', `Export '${name}' not found in module '${moduleName}'`);
              }
            });
          }
        } else {
          throw new Error(`No module definition found in ${modulePath}`);
        }
      } else {
        throw new Error(`Module not found: ${modulePath}`);
      }

      return pos + match[0].length;
    }
    return pos + 1;
  }

  private async parseImport(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/import\("([^"]+)"\)/);
    if (match) {
      const modulePath = match[1];
      const fullPath = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
      const moduleFilePath = fullPath.endsWith('.fxm') ? fullPath : `${fullPath}.fxm`;

      const moduleContent = await storage.getFileContent(moduleFilePath);
      if (moduleContent) {
        await this.loadModule(moduleContent, moduleFilePath);
      } else {
        throw new Error(`Module not found: ${modulePath}`);
      }

      return pos + match[0].length;
    }
    return pos + 1;
  }

  private async parseModuleFolder(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/module\s+folder\s+"([^"]+)"\s+as\s+(\w+)/);
    if (match) {
      const folderPath = match[1];
      const alias = match[2];
      const fullPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;

      try {
        const fileTree = await storage.getFileTree();
        const folder = this.findNodeByPath(fileTree, fullPath);
        
        if (!folder || folder.type !== 'folder') {
          throw new Error(`Folder not found: ${folderPath}`);
        }

        const folderModules: Record<string, any> = {};

        if (folder.children) {
          for (const file of folder.children) {
            if (file.type === 'file' && (file.extension === '.fxo' || file.extension === '.fxm')) {
              const content = await storage.getFileContent(file.path);
              if (content) {
                const fileName = file.name.replace(/\.(fxo|fxm)$/, '');
                
                const moduleMatch = content.match(/module\s+(\w+)\s*\{/);
                if (moduleMatch) {
                  const moduleName = moduleMatch[1];
                  await this.loadModule(content, file.path);
                  
                  const loadedModule = this.context.modules.get(moduleName);
                  if (loadedModule) {
                    const exportedFunctions: Record<string, any> = {};
                    loadedModule.exports.forEach((func, name) => {
                      exportedFunctions[name] = (...args: any[]) => {
                        return this.executeFunction(func, args);
                      };
                    });
                    folderModules[fileName] = exportedFunctions;
                  }
                }
              }
            }
          }
        }

        this.context.variables.set(alias, folderModules);
        this.addOutput('log', `Loaded ${Object.keys(folderModules).length} modules from ${folderPath} as ${alias}`);
      } catch (error: any) {
        throw new Error(`Failed to load folder modules: ${error.message}`);
      }

      return pos + match[0].length;
    }
    return pos + 1;
  }

  private findNodeByPath(nodes: any[], path: string): any {
    for (const node of nodes) {
      if (node.path === path) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  private async parseModule(code: string, pos: number): Promise<number> {
    const nameMatch = code.substring(pos).match(/module\s+(\w+)\s*\{/);
    if (!nameMatch) return pos + 1;

    const moduleName = nameMatch[1];
    const bracePos = pos + nameMatch[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const moduleBody = code.substring(bracePos + 1, endPos - 1);

    await this.loadModule(`module ${moduleName} {${moduleBody}}`, this.currentFilePath);

    return endPos;
  }

  private async loadModule(moduleCode: string, moduleFilePath?: string) {
    const match = moduleCode.match(/module\s+(\w+)\s*\{([\s\S]*)\}/);
    if (!match) return;

    const moduleName = match[1];
    const moduleBody = match[2];

    const moduleObj: FluxoModule = {
      name: moduleName,
      exports: new Map(),
      variables: new Map(),
    };

    // Check if this file is allowed to use export {} syntax
    // Use the module's own file path, not the caller's path
    const actualFilePath = moduleFilePath || this.currentFilePath;
    const isModuleFile = actualFilePath.endsWith('.fxm');
    // More precise regex that won't match import statements
    const hasExportBlock = /(?:^|\n)\s*export\s*\{[\s\S]*?\}/.test(moduleBody);
    
    if (hasExportBlock && !isModuleFile) {
      throw new Error(
        `Syntax Error: export { } can only be used in module files (.fxm).\n` +
        `File: ${actualFilePath}\n` +
        `Hint: Rename this file to use the .fxm extension, or use 'export function' instead.`
      );
    }

    // First pass: Execute the module body to collect variables and functions
    // We need to execute variables before export block
    const cleanBody = moduleBody.replace(/export\s*\{[\s\S]*?\}/g, ''); // Remove export block temporarily
    await this.executeModuleBody(cleanBody, moduleObj);

    // Second pass: Parse exports
    let pos = 0;
    while (pos < moduleBody.length) {
      pos = this.skipWhitespace(moduleBody, pos);
      if (pos >= moduleBody.length) break;

      if (moduleBody.substring(pos).startsWith('export function ')) {
        const funcMatch = moduleBody.substring(pos).match(/export\s+function\s+(\w+)\s*\(([^)]*)\)\s*\{/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          const paramsStr = funcMatch[2].trim();
          let params: string[];
          let hasRestParam = false;

          if (paramsStr.includes('...')) {
            hasRestParam = true;
            params = [paramsStr.replace('...', '').trim()];
          } else {
            params = paramsStr.split(',').map(p => p.trim()).filter(p => p);
          }

          const bracePos = pos + funcMatch[0].length - 1;
          const endPos = this.findMatchingBrace(moduleBody, bracePos);
          const body = moduleBody.substring(bracePos + 1, endPos - 1);

          moduleObj.exports.set(funcName, { params, body, hasRestParam });
          pos = endPos;
        } else {
          pos++;
        }
      } else if (moduleBody.substring(pos).startsWith('export {')) {
        // NEW: Handle export { var1, var2 } syntax
        const exportMatch = moduleBody.substring(pos).match(/export\s*\{([^}]+)\}/);
        if (exportMatch) {
          const exportList = exportMatch[1].split(',').map(name => name.trim()).filter(n => n);
          exportList.forEach(varName => {
            if (moduleObj.variables.has(varName)) {
              moduleObj.exports.set(varName, moduleObj.variables.get(varName));
            } else {
              this.addOutput('warning', `Variable '${varName}' not found in module '${moduleName}' for export`);
            }
          });
          pos += exportMatch[0].length;
        } else {
          pos++;
        }
      } else {
        pos++;
      }
    }

    this.context.modules.set(moduleName, moduleObj);

    const moduleProxy: any = {};
    moduleObj.exports.forEach((item, name) => {
      if (typeof item === 'object' && item.params !== undefined) {
        // It's a function
        moduleProxy[name] = (...args: any[]) => {
          return this.executeFunction(item, args);
        };
      } else {
        // It's a variable
        moduleProxy[name] = item;
      }
    });

    this.context.variables.set(moduleName, moduleProxy);
    
    if (typeof globalThis !== 'undefined') {
      (globalThis as any)[moduleName] = moduleProxy;
    }
  }

  private async executeModuleBody(body: string, moduleObj: FluxoModule) {
    // Execute the module body to collect variables
    // Similar to parseAndExecute but stores in module context
    let pos = 0;
    while (pos < body.length) {
      pos = this.skipWhitespace(body, pos);
      if (pos >= body.length) break;

      if (body.substring(pos).startsWith('local ')) {
        const end = this.findStatementEnd(body, pos);
        const statement = body.substring(pos, end);
        const match = statement.match(/local\s+(\w+)\s*=\s*(.+)/);

        if (match) {
          const varName = match[1];
          const value = await this.evaluateExpression(match[2]);
          moduleObj.variables.set(varName, value);
          this.context.variables.set(varName, value); // Also set in context for evaluation
        }
        pos = end;
      } else if (body.substring(pos).startsWith('function ')) {
        const match = body.substring(pos).match(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/);
        if (match) {
          const funcName = match[1];
          const paramsStr = match[2].trim();
          let params: string[];
          let hasRestParam = false;

          if (paramsStr.includes('...')) {
            hasRestParam = true;
            params = [paramsStr.replace('...', '').trim()];
          } else {
            params = paramsStr.split(',').map(p => p.trim()).filter(p => p);
          }

          const bracePos = pos + match[0].length - 1;
          const endPos = this.findMatchingBrace(body, bracePos);
          const funcBody = body.substring(bracePos + 1, endPos - 1);

          moduleObj.variables.set(funcName, { params, body: funcBody, hasRestParam });
          pos = endPos;
        } else {
          pos++;
        }
      } else {
        pos++;
      }
    }
  }

  private parseFunctionDeclaration(code: string, pos: number): number {
    const match = code.substring(pos).match(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/);
    if (!match) return pos + 1;

    const funcName = match[1];
    const paramsStr = match[2].trim();
    let params: string[];
    let hasRestParam = false;

    if (paramsStr.includes('...')) {
      hasRestParam = true;
      params = [paramsStr.replace('...', '').trim()];
    } else {
      params = paramsStr.split(',').map(p => p.trim()).filter(p => p);
    }

    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    this.context.functions.set(funcName, { params, body, hasRestParam });

    return endPos;
  }

  private async parseVariableDeclaration(code: string, pos: number): Promise<number> {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end);
    const match = statement.match(/local\s+(\w+)\s*=\s*(.+)/);

    if (match) {
      const varName = match[1];
      const value = await this.evaluateExpression(match[2]);
      this.context.variables.set(varName, value);
    }

    return end;
  }

  private async parseWaitStatement(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/wait\s*\(([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const secondsExpr = match[1];
    const seconds = await this.evaluateExpression(secondsExpr);
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    
    // Execute the block after waiting
    await this.executeBlock(body);

    return endPos;
  }

  private async parseIfStatement(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/if\s*\(([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const condition = await this.evaluateExpression(match[1]);
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    if (condition) {
      await this.executeBlock(body);
    } else {
      const elseMatch = code.substring(endPos).match(/\s*else\s*\{/);
      if (elseMatch) {
        const elseBracePos = endPos + elseMatch[0].length - 1;
        const elseEndPos = this.findMatchingBrace(code, elseBracePos);
        const elseBody = code.substring(elseBracePos + 1, elseEndPos - 1);
        await this.executeBlock(elseBody);
        return elseEndPos;
      }
    }

    return endPos;
  }

  private async parseWhileLoop(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/while\s*\(([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const conditionExpr = match[1];
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    let iterations = 0;
    const maxIterations = 10000;

    while (await this.evaluateExpression(conditionExpr) && iterations < maxIterations) {
      await this.executeBlock(body);
      if (this.context.shouldReturn) break;
      iterations++;
    }

    return endPos;
  }

  private async parseForLoop(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/for\s*\(([^;]+);([^;]+);([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const init = match[1].trim();
    const conditionExpr = match[2].trim();
    const increment = match[3].trim();
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    await this.parseStatement(init, 0);

    let iterations = 0;
    const maxIterations = 10000;

    while (await this.evaluateExpression(conditionExpr) && iterations < maxIterations) {
      await this.executeBlock(body);
      if (this.context.shouldReturn) break;
      await this.parseStatement(increment, 0);
      iterations++;
    }

    return endPos;
  }

  private async parseReturn(code: string, pos: number): Promise<number> {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end);
    const value = statement.substring(7).trim();
    this.context.returnValue = await this.evaluateExpression(value);
    this.context.shouldReturn = true;
    return end;
  }

  private async parseStatement(code: string, pos: number): Promise<number> {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end).trim();

    if (!statement) return end;

    if (statement.includes('=') && !statement.includes('==') && !statement.includes('!=') && !statement.includes('<=') && !statement.includes('>=')) {
      const parts = statement.split('=');
      const varName = parts[0].trim();
      const value = await this.evaluateExpression(parts.slice(1).join('=').trim());
      this.context.variables.set(varName, value);
    } else {
      await this.evaluateExpression(statement);
    }

    return end;
  }

  private async executeBlock(code: string) {
    const interpreter = new FluxoInterpreter(this.currentFilePath);
    interpreter.context.variables = new Map(this.context.variables);
    interpreter.context.functions = new Map(this.context.functions);
    interpreter.context.modules = new Map(this.context.modules);
    interpreter.context.output = this.context.output;
    interpreter.context.shouldReturn = false;
    interpreter.context.returnValue = undefined;

    let pos = 0;
    while (pos < code.length && !interpreter.context.shouldReturn) {
      pos = interpreter.skipWhitespace(code, pos);
      if (pos >= code.length) break;

      if (code.substring(pos).startsWith('local ')) {
        pos = await interpreter.parseVariableDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('wait(')) {
        pos = await interpreter.parseWaitStatement(code, pos);
      } else if (code.substring(pos).startsWith('if ')) {
        pos = await interpreter.parseIfStatement(code, pos);
      } else if (code.substring(pos).startsWith('while ')) {
        pos = await interpreter.parseWhileLoop(code, pos);
      } else if (code.substring(pos).startsWith('for ')) {
        pos = await interpreter.parseForLoop(code, pos);
      } else if (code.substring(pos).startsWith('return ')) {
        pos = await interpreter.parseReturn(code, pos);
      } else {
        pos = await interpreter.parseStatement(code, pos);
      }
    }

    this.context.variables = interpreter.context.variables;
    this.context.output = interpreter.context.output;
    this.context.shouldReturn = interpreter.context.shouldReturn;
    this.context.returnValue = interpreter.context.returnValue;
  }

  private findStatementEnd(code: string, pos: number): number {
    let end = pos;
    let depth = 0;
    let inString = false;
    let stringChar = '';

    while (end < code.length) {
      const char = code[end];

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString && code[end - 1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        if (char === ')' || char === ']' || char === '}') depth--;
        if ((char === '\n' || char === ';') && depth === 0) {
          return end + 1;
        }
      }

      end++;
    }

    return end;
  }

  private async evaluateExpression(expr: string): Promise<any> {
    expr = expr.trim();

    if (expr.endsWith(';')) {
      expr = expr.slice(0, -1).trim();
    }

    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr.slice(1, -1);
    }

    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    if (!isNaN(Number(expr)) && expr.length > 0 && /^-?\d+\.?\d*$/.test(expr)) {
      return Number(expr);
    }

    if (expr.includes('(') && expr.includes(')')) {
      return await this.evaluateFunctionCall(expr);
    }

    if (expr.includes('==') || expr.includes('!=') || expr.includes('<=') || expr.includes('>=') || 
        (expr.includes('<') && !expr.includes('<<')) || (expr.includes('>') && !expr.includes('>>'))) {
      return await this.evaluateComparison(expr);
    }

    if (expr.includes('+') || expr.includes('-') || expr.includes('*') || expr.includes('/') || expr.includes('%')) {
      if (this.containsArithmeticOperators(expr)) {
        return await this.evaluateArithmetic(expr);
      }
    }

    if (this.context.variables.has(expr)) {
      return this.context.variables.get(expr);
    }

    return expr;
  }

  private containsArithmeticOperators(expr: string): boolean {
    const tokens = expr.match(/[+\-*/%]/g);
    if (!tokens) return false;
    
    for (let i = 0; i < expr.length; i++) {
      if (['+', '-', '*', '/', '%'].includes(expr[i])) {
        if (i > 0 && i < expr.length - 1) {
          return true;
        }
      }
    }
    return false;
  }

  private async evaluateFunctionCall(expr: string): Promise<any> {
    const funcMatch = expr.match(/(\w+(?:\.\w+)?)\s*\(([\s\S]*)\)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      const args = await this.parseArguments(argsStr);

      if (funcName.includes('.')) {
        const parts = funcName.split('.');
        const obj = this.context.variables.get(parts[0]);
        if (obj && typeof obj[parts[1]] === 'function') {
          const result = obj[parts[1]](...args);
          // Handle if the built-in function returns a promise
          if (result instanceof Promise) {
            return await result;
          }
          return result;
        }
      }

      if (this.context.functions.has(funcName)) {
        const func = this.context.functions.get(funcName)!;
        return await this.executeFunction(func, args);
      }
    }

    return undefined;
  }

  private async parseArguments(argsStr: string): Promise<any[]> {
    if (!argsStr.trim()) return [];
    
    const args: any[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === stringChar && inString) {
        inString = false;
        current += char;
      } else if (char === '(' && !inString) {
        depth++;
        current += char;
      } else if (char === ')' && !inString) {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0 && !inString) {
        args.push(await this.evaluateExpression(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(await this.evaluateExpression(current.trim()));
    }

    return args;
  }

  private async executeFunction(func: FluxoFunction, args: any[]): Promise<any> {
    const savedContext = {
      shouldReturn: this.context.shouldReturn,
      returnValue: this.context.returnValue,
    };

    // Save pre-existing values for each parameter (to restore later if they shadowed outer variables)
    const savedParams = new Map<string, { existed: boolean; value: any }>();

    if (func.hasRestParam && func.params.length > 0) {
      const paramName = func.params[0];
      savedParams.set(paramName, {
        existed: this.context.variables.has(paramName),
        value: this.context.variables.get(paramName),
      });
      this.context.variables.set(paramName, args);
    } else {
      for (let i = 0; i < func.params.length; i++) {
        const paramName = func.params[i];
        savedParams.set(paramName, {
          existed: this.context.variables.has(paramName),
          value: this.context.variables.get(paramName),
        });
        this.context.variables.set(paramName, args[i]);
      }
    }

    this.context.shouldReturn = false;
    this.context.returnValue = undefined;

    await this.executeBlock(func.body);

    const result = this.context.returnValue;

    // Restore parameter bindings: if parameter shadowed an outer variable, restore it;
    // otherwise delete the parameter
    Array.from(savedParams.entries()).forEach(([paramName, saved]) => {
      if (saved.existed) {
        this.context.variables.set(paramName, saved.value);
      } else {
        this.context.variables.delete(paramName);
      }
    });

    this.context.shouldReturn = savedContext.shouldReturn;
    this.context.returnValue = savedContext.returnValue;

    return result;
  }

  private async evaluateArithmetic(expr: string): Promise<any> {
    try {
      // Check if expression contains + operator for potential string concatenation
      if (!expr.includes('+')) {
        // No + operator, definitely numeric arithmetic only
        const replaced = expr.replace(/(\w+)/g, (match) => {
          if (this.context.variables.has(match)) {
            const val = this.context.variables.get(match);
            return typeof val === 'number' ? String(val) : match;
          }
          return match;
        });
        return eval(replaced);
      }
      
      // Expression contains +, tokenize respecting quotes and parentheses
      const tokens: string[] = [];
      let current = '';
      let inString = false;
      let stringChar = '';
      let parenDepth = 0;
      
      for (let i = 0; i < expr.length; i++) {
        const char = expr[i];
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          stringChar = char;
          current += char;
        } else if (char === stringChar && inString) {
          inString = false;
          current += char;
        } else if (char === '(' && !inString) {
          parenDepth++;
          current += char;
        } else if (char === ')' && !inString) {
          parenDepth--;
          current += char;
        } else if (char === '+' && !inString && parenDepth === 0) {
          if (current.trim()) {
            tokens.push(current.trim());
          }
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        tokens.push(current.trim());
      }
      
      // If we didn't find any top-level + to split on, fall back to numeric
      if (tokens.length <= 1) {
        const replaced = expr.replace(/(\w+)/g, (match) => {
          if (this.context.variables.has(match)) {
            const val = this.context.variables.get(match);
            return typeof val === 'number' ? String(val) : match;
          }
          return match;
        });
        return eval(replaced);
      }
      
      // Check if any token is a string
      let hasStringOperand = false;
      const operands: any[] = [];
      
      for (const token of tokens) {
        // Check if it's a string literal
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
          hasStringOperand = true;
          operands.push(token.slice(1, -1)); // Remove quotes
        } else if (this.context.variables.has(token)) {
          // It's a variable
          const val = this.context.variables.get(token);
          if (typeof val === 'string') {
            hasStringOperand = true;
          }
          operands.push(val);
        } else if (!isNaN(Number(token))) {
          // It's a number literal
          operands.push(Number(token));
        } else {
          // Try to evaluate as sub-expression
          const subResult = await this.evaluateExpression(token);
          if (typeof subResult === 'string') {
            hasStringOperand = true;
          }
          operands.push(subResult);
        }
      }
      
      // If any operand is a string, do string concatenation
      if (hasStringOperand) {
        return operands.map(op => String(op)).join('');
      }
      
      // Otherwise, numeric arithmetic with +
      const replaced = expr.replace(/(\w+)/g, (match) => {
        if (this.context.variables.has(match)) {
          const val = this.context.variables.get(match);
          return typeof val === 'number' ? String(val) : match;
        }
        return match;
      });

      return eval(replaced);
    } catch {
      return 0;
    }
  }

  private evaluateComparison(expr: string): boolean {
    try {
      const replaced = expr.replace(/(\w+)/g, (match) => {
        if (this.context.variables.has(match)) {
          const val = this.context.variables.get(match);
          return typeof val === 'number' ? String(val) : `"${val}"`;
        }
        return match;
      });

      return eval(replaced);
    } catch {
      return false;
    }
  }
}
