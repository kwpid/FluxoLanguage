import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Home, Book } from "lucide-react";

export default function Docs() {
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Book className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Fluxo Documentation</h1>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Back to IDE
          </Button>
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          <section>
            <h2 className="text-3xl font-bold mb-4">Welcome to Fluxo</h2>
            <p className="text-lg text-muted-foreground">
              Fluxo is a simple, beginner-friendly programming language designed for learning fundamental programming concepts.
              It features a clean syntax inspired by JavaScript with support for functions, modules, and control flow.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 text-primary" />
              Variables
            </h2>
            <p className="text-muted-foreground">
              Variables in Fluxo are declared using the <code className="bg-muted px-2 py-1 rounded text-sm">local</code> keyword.
              Variables can store numbers, strings, booleans, and other values.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`local name = "Alice"
local age = 25
local isStudent = true
local pi = 3.14159`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Functions</h2>
            <p className="text-muted-foreground">
              Functions are reusable blocks of code that can accept parameters and return values.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// Define a function
function greet(name) {
  return "Hello, " + name + "!"
}

// Call the function
local message = greet("World")
console.log(message)  // Output: Hello, World!`}
              </pre>
            </div>
            <h3 className="text-xl font-semibold mt-6">Rest Parameters</h3>
            <p className="text-muted-foreground">
              Functions can accept variable numbers of arguments using rest parameters with <code className="bg-muted px-2 py-1 rounded text-sm">...</code>
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`function sum(...numbers) {
  local total = 0
  for (local i = 0; i < numbers.length; i = i + 1) {
    total = total + numbers[i]
  }
  return total
}

local result = sum(1, 2, 3, 4, 5)
console.log(result)  // Output: 15`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Control Flow</h2>
            <h3 className="text-xl font-semibold">If-Else Statements</h3>
            <p className="text-muted-foreground">
              Execute different code blocks based on conditions.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`local age = 18

if (age >= 18) {
  console.log("You are an adult")
} else {
  console.log("You are a minor")
}`}
              </pre>
            </div>

            <h3 className="text-xl font-semibold mt-6">While Loops</h3>
            <p className="text-muted-foreground">
              Repeat code while a condition is true.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`local count = 0

while (count < 5) {
  console.log("Count:", count)
  count = count + 1
}`}
              </pre>
            </div>

            <h3 className="text-xl font-semibold mt-6">For Loops</h3>
            <p className="text-muted-foreground">
              Iterate a specific number of times with initialization, condition, and increment.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`for (local i = 0; i < 10; i = i + 1) {
  console.log("Iteration:", i)
}`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Modules</h2>
            <p className="text-muted-foreground">
              Modules allow you to organize code into reusable components. Module files use the <code className="bg-muted px-2 py-1 rounded text-sm">.fxm</code> extension.
            </p>
            <h3 className="text-xl font-semibold">Creating a Module</h3>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// File: modules/mathUtils.fxm
module mathUtils {
  export function add(a, b) {
    return a + b
  }
  
  export function multiply(a, b) {
    return a * b
  }
  
  export function square(x) {
    return multiply(x, x)
  }
}`}
              </pre>
            </div>

            <h3 className="text-xl font-semibold mt-6">Using a Module</h3>
            <p className="text-muted-foreground">
              Import modules using the <code className="bg-muted px-2 py-1 rounded text-sm">require()</code> function.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// Import the module
require("modules/mathUtils")

// Use exported functions
local sum = mathUtils.add(10, 5)
local product = mathUtils.multiply(4, 7)
local squared = mathUtils.square(9)

console.log("Sum:", sum)        // Output: 15
console.log("Product:", product) // Output: 28
console.log("Squared:", squared) // Output: 81`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Operators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Arithmetic Operators</h3>
                <div className="bg-card border border-border rounded-lg p-4">
                  <pre className="font-mono text-sm">
{`+   Addition
-   Subtraction
*   Multiplication
/   Division
%   Modulo`}
                  </pre>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Comparison Operators</h3>
                <div className="bg-card border border-border rounded-lg p-4">
                  <pre className="font-mono text-sm">
{`==  Equal to
!=  Not equal to
<   Less than
>   Greater than
<=  Less than or equal
>=  Greater than or equal`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Built-in Console Methods</h2>
            <p className="text-muted-foreground">
              Fluxo provides console methods for output and debugging.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// Print to console
console.log("Hello, World!")

// Log multiple values
console.log("Name:", "Alice", "Age:", 25)`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Comments</h2>
            <p className="text-muted-foreground">
              Use comments to document your code and add notes.
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// This is a single-line comment

/*
  This is a
  multi-line comment
*/

local x = 10  // Comments can also be inline`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">File Extensions</h2>
            <div className="space-y-2">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-semibold mb-1">.fxo - Script Files</p>
                <p className="text-sm text-muted-foreground">
                  Regular Fluxo script files that can be executed directly. Use these for your main programs and scripts.
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="font-semibold mb-1">.fxm - Module Files</p>
                <p className="text-sm text-muted-foreground">
                  Module files that export reusable functions. These files define modules using the <code className="bg-muted px-1 py-0.5 rounded text-xs">module</code> keyword.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Complete Example</h2>
            <p className="text-muted-foreground">
              Here's a complete example that demonstrates various Fluxo features:
            </p>
            <div className="bg-card border border-border rounded-lg p-4">
              <pre className="font-mono text-sm">
{`// Temperature converter program

function celsiusToFahrenheit(celsius) {
  return (celsius * 9 / 5) + 32
}

function fahrenheitToCelsius(fahrenheit) {
  return (fahrenheit - 32) * 5 / 9
}

function printConversion(temp, unit) {
  if (unit == "C") {
    local fahrenheit = celsiusToFahrenheit(temp)
    console.log(temp, "°C =", fahrenheit, "°F")
  } else {
    local celsius = fahrenheitToCelsius(temp)
    console.log(temp, "°F =", celsius, "°C")
  }
}

// Test the conversions
local temperatures = [0, 25, 100]

for (local i = 0; i < temperatures.length; i = i + 1) {
  local temp = temperatures[i]
  printConversion(temp, "C")
}

console.log("Conversion complete!")`}
              </pre>
            </div>
          </section>

          <section className="space-y-4 pb-8">
            <h2 className="text-2xl font-bold">Tips and Best Practices</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Use descriptive variable and function names</li>
              <li>Add comments to explain complex logic</li>
              <li>Break down large programs into smaller functions</li>
              <li>Organize related functions into modules</li>
              <li>Test your code incrementally as you write it</li>
              <li>Use the console to debug and understand your program's flow</li>
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
