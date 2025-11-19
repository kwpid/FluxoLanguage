import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the Fluxo runtime script
let fluxoRuntimeScript: string | null = null;

function getFluxoRuntime(): string {
  if (!fluxoRuntimeScript) {
    try {
      const runtimePath = join(__dirname, '../client/public/fluxo-runtime.js');
      fluxoRuntimeScript = readFileSync(runtimePath, 'utf-8');
    } catch (error) {
      console.error('Failed to load Fluxo runtime:', error);
      fluxoRuntimeScript = '// Fluxo runtime failed to load';
    }
  }
  return fluxoRuntimeScript;
}

/**
 * Injects the Fluxo runtime into an HTML document
 * This allows Fluxo scripts to execute in the browser
 */
export function injectFluxoRuntime(html: string): string {
  const runtime = getFluxoRuntime();
  
  // Create the runtime script tag
  const runtimeScript = `<script data-fluxo-runtime>${runtime}</script>`;
  
  // Try to inject before closing </body> tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${runtimeScript}\n</body>`);
  }
  
  // Try to inject before closing </html> tag
  if (html.includes('</html>')) {
    return html.replace('</html>', `${runtimeScript}\n</html>`);
  }
  
  // If neither tag exists, append to the end
  return html + '\n' + runtimeScript;
}

/**
 * Checks if HTML already has Fluxo runtime injected
 */
export function hasFluxoRuntime(html: string): boolean {
  return html.includes('data-fluxo-runtime');
}

/**
 * Gets all Fluxo module entry points from HTML
 */
export function getFluxoEntryPoints(html: string): string[] {
  const entryRegex = /<script\s+[^>]*data-fluxo-entry=["']([^"']+)["'][^>]*>/gi;
  const entries: string[] = [];
  let match;
  
  while ((match = entryRegex.exec(html)) !== null) {
    entries.push(match[1]);
  }
  
  return entries;
}
