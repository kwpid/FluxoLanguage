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
  exports: Map<string, FluxoFunction>;
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

    this.context.variables.set('console', {
      log: consoleLog,
    });
    
    this.context.variables.set('selectElement', selectElement);
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
    const scriptRegex = /<script\s+[^>]*type=["']text\/fluxo["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [];
    let match;
    
    while ((match = scriptRegex.exec(html)) !== null) {
      matches.push(match[1]);
    }
    
    if (matches.length === 0) {
      this.addOutput('warning', 'No <script type="text/fluxo"> tags found in HTML file');
      return '';
    }
    
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

      if (code.substring(pos).startsWith('require(')) {
        pos = await this.parseRequire(code, pos);
      } else if (code.substring(pos).startsWith('module ')) {
        pos = await this.parseModule(code, pos);
      } else if (code.substring(pos).startsWith('function ')) {
        pos = this.parseFunctionDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('local ')) {
        pos = this.parseVariableDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('if ')) {
        pos = this.parseIfStatement(code, pos);
      } else if (code.substring(pos).startsWith('while ')) {
        pos = this.parseWhileLoop(code, pos);
      } else if (code.substring(pos).startsWith('for ')) {
        pos = this.parseForLoop(code, pos);
      } else if (code.substring(pos).startsWith('return ')) {
        pos = this.parseReturn(code, pos);
      } else {
        pos = this.parseStatement(code, pos);
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

  private async parseRequire(code: string, pos: number): Promise<number> {
    const match = code.substring(pos).match(/require\("([^"]+)"\)/);
    if (match) {
      const modulePath = match[1];
      const fullPath = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
      const moduleFilePath = fullPath.endsWith('.fxm') ? fullPath : `${fullPath}.fxm`;

      const moduleContent = await storage.getFileContent(moduleFilePath);
      if (moduleContent) {
        await this.loadModule(moduleContent);
      } else {
        throw new Error(`Module not found: ${modulePath}`);
      }

      return pos + match[0].length;
    }
    return pos + 1;
  }

  private async parseModule(code: string, pos: number): Promise<number> {
    const nameMatch = code.substring(pos).match(/module\s+(\w+)\s*\{/);
    if (!nameMatch) return pos + 1;

    const moduleName = nameMatch[1];
    const bracePos = pos + nameMatch[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const moduleBody = code.substring(bracePos + 1, endPos - 1);

    await this.loadModule(`module ${moduleName} {${moduleBody}}`);

    return endPos;
  }

  private async loadModule(moduleCode: string) {
    const match = moduleCode.match(/module\s+(\w+)\s*\{([\s\S]*)\}/);
    if (!match) return;

    const moduleName = match[1];
    const moduleBody = match[2];

    const moduleObj: FluxoModule = {
      name: moduleName,
      exports: new Map(),
    };

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
      } else {
        pos++;
      }
    }

    this.context.modules.set(moduleName, moduleObj);

    const moduleProxy: any = {};
    moduleObj.exports.forEach((func, funcName) => {
      moduleProxy[funcName] = (...args: any[]) => {
        return this.executeFunction(func, args);
      };
    });

    this.context.variables.set(moduleName, moduleProxy);
    
    if (typeof globalThis !== 'undefined') {
      (globalThis as any)[moduleName] = moduleProxy;
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

  private parseVariableDeclaration(code: string, pos: number): number {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end);
    const match = statement.match(/local\s+(\w+)\s*=\s*(.+)/);

    if (match) {
      const varName = match[1];
      const value = this.evaluateExpression(match[2]);
      this.context.variables.set(varName, value);
    }

    return end;
  }

  private parseIfStatement(code: string, pos: number): number {
    const match = code.substring(pos).match(/if\s*\(([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const condition = this.evaluateExpression(match[1]);
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    if (condition) {
      this.executeBlock(body);
    } else {
      const elseMatch = code.substring(endPos).match(/\s*else\s*\{/);
      if (elseMatch) {
        const elseBracePos = endPos + elseMatch[0].length - 1;
        const elseEndPos = this.findMatchingBrace(code, elseBracePos);
        const elseBody = code.substring(elseBracePos + 1, elseEndPos - 1);
        this.executeBlock(elseBody);
        return elseEndPos;
      }
    }

    return endPos;
  }

  private parseWhileLoop(code: string, pos: number): number {
    const match = code.substring(pos).match(/while\s*\(([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const conditionExpr = match[1];
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    let iterations = 0;
    const maxIterations = 10000;

    while (this.evaluateExpression(conditionExpr) && iterations < maxIterations) {
      this.executeBlock(body);
      if (this.context.shouldReturn) break;
      iterations++;
    }

    return endPos;
  }

  private parseForLoop(code: string, pos: number): number {
    const match = code.substring(pos).match(/for\s*\(([^;]+);([^;]+);([^)]+)\)\s*\{/);
    if (!match) return pos + 1;

    const init = match[1].trim();
    const conditionExpr = match[2].trim();
    const increment = match[3].trim();
    const bracePos = pos + match[0].length - 1;
    const endPos = this.findMatchingBrace(code, bracePos);
    const body = code.substring(bracePos + 1, endPos - 1);

    this.parseStatement(init, 0);

    let iterations = 0;
    const maxIterations = 10000;

    while (this.evaluateExpression(conditionExpr) && iterations < maxIterations) {
      this.executeBlock(body);
      if (this.context.shouldReturn) break;
      this.parseStatement(increment, 0);
      iterations++;
    }

    return endPos;
  }

  private parseReturn(code: string, pos: number): number {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end);
    const value = statement.substring(7).trim();
    this.context.returnValue = this.evaluateExpression(value);
    this.context.shouldReturn = true;
    return end;
  }

  private parseStatement(code: string, pos: number): number {
    const end = this.findStatementEnd(code, pos);
    const statement = code.substring(pos, end).trim();

    if (!statement) return end;

    if (statement.includes('=') && !statement.includes('==') && !statement.includes('!=') && !statement.includes('<=') && !statement.includes('>=')) {
      const parts = statement.split('=');
      const varName = parts[0].trim();
      const value = this.evaluateExpression(parts.slice(1).join('=').trim());
      this.context.variables.set(varName, value);
    } else {
      this.evaluateExpression(statement);
    }

    return end;
  }

  private executeBlock(code: string) {
    const interpreter = new FluxoInterpreter(this.currentFilePath);
    interpreter.context = {
      ...this.context,
      shouldReturn: false,
      returnValue: undefined,
    };

    let pos = 0;
    while (pos < code.length && !interpreter.context.shouldReturn) {
      pos = interpreter.skipWhitespace(code, pos);
      if (pos >= code.length) break;

      if (code.substring(pos).startsWith('local ')) {
        pos = interpreter.parseVariableDeclaration(code, pos);
      } else if (code.substring(pos).startsWith('if ')) {
        pos = interpreter.parseIfStatement(code, pos);
      } else if (code.substring(pos).startsWith('while ')) {
        pos = interpreter.parseWhileLoop(code, pos);
      } else if (code.substring(pos).startsWith('for ')) {
        pos = interpreter.parseForLoop(code, pos);
      } else if (code.substring(pos).startsWith('return ')) {
        pos = interpreter.parseReturn(code, pos);
      } else {
        pos = interpreter.parseStatement(code, pos);
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

  private evaluateExpression(expr: string): any {
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
      return this.evaluateFunctionCall(expr);
    }

    if (expr.includes('==') || expr.includes('!=') || expr.includes('<=') || expr.includes('>=') || 
        (expr.includes('<') && !expr.includes('<<')) || (expr.includes('>') && !expr.includes('>>'))) {
      return this.evaluateComparison(expr);
    }

    if (expr.includes('+') || expr.includes('-') || expr.includes('*') || expr.includes('/') || expr.includes('%')) {
      if (this.containsArithmeticOperators(expr)) {
        return this.evaluateArithmetic(expr);
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

  private evaluateFunctionCall(expr: string): any {
    const funcMatch = expr.match(/(\w+(?:\.\w+)?)\s*\(([\s\S]*)\)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      const args = this.parseArguments(argsStr);

      if (funcName.includes('.')) {
        const parts = funcName.split('.');
        const obj = this.context.variables.get(parts[0]);
        if (obj && typeof obj[parts[1]] === 'function') {
          return obj[parts[1]](...args);
        }
      }

      if (this.context.functions.has(funcName)) {
        const func = this.context.functions.get(funcName)!;
        return this.executeFunction(func, args);
      }
    }

    return undefined;
  }

  private parseArguments(argsStr: string): any[] {
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
        args.push(this.evaluateExpression(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(this.evaluateExpression(current.trim()));
    }

    return args;
  }

  private executeFunction(func: FluxoFunction, args: any[]): any {
    const savedContext = {
      variables: new Map(this.context.variables),
      shouldReturn: this.context.shouldReturn,
      returnValue: this.context.returnValue,
    };

    if (func.hasRestParam && func.params.length > 0) {
      this.context.variables.set(func.params[0], args);
    } else {
      for (let i = 0; i < func.params.length; i++) {
        this.context.variables.set(func.params[i], args[i]);
      }
    }

    this.context.shouldReturn = false;
    this.context.returnValue = undefined;

    this.executeBlock(func.body);

    const result = this.context.returnValue;

    this.context.variables = savedContext.variables;
    this.context.shouldReturn = savedContext.shouldReturn;
    this.context.returnValue = savedContext.returnValue;

    return result;
  }

  private evaluateArithmetic(expr: string): number {
    try {
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
