import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Home, Book, Search, Sparkles } from "lucide-react";

export default function Docs() {
  const [searchQuery, setSearchQuery] = useState("");

  const sections = useMemo(() => ({
    gettingStarted: {
      id: "getting-started",
      title: "Getting Started",
      keywords: ["introduction", "welcome", "overview", "beginner", "start"],
      content: (
        <div className="space-y-8">
          <section>
            <h2 className="text-3xl font-bold mb-4">Welcome to Fluxo</h2>
            <p className="text-lg text-muted-foreground">
              Fluxo is a simple, beginner-friendly programming language designed for learning fundamental programming concepts.
              It features a clean syntax inspired by JavaScript with support for functions, modules, control flow, and interactive HTML elements.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">File Extensions</h3>
            <div className="space-y-2">
              <div className="bg-card border border-border rounded-md p-4">
                <p className="font-semibold mb-1">.fxo - Script Files</p>
                <p className="text-sm text-muted-foreground">
                  Regular Fluxo script files that can be executed directly. Use these for your main programs and scripts.
                </p>
              </div>
              <div className="bg-card border border-border rounded-md p-4">
                <p className="font-semibold mb-1">.fxm - Module Files</p>
                <p className="text-sm text-muted-foreground">
                  Module files that export reusable functions. These files define modules using the <code className="bg-muted px-1 py-0.5 rounded-md text-xs">module</code> keyword.
                </p>
              </div>
            </div>
          </section>
        </div>
      ),
    },
    basics: {
      id: "basics",
      title: "Language Basics",
      keywords: ["variables", "functions", "local", "function", "basics", "syntax"],
      content: (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Code className="h-6 w-6 text-primary" />
              Variables
            </h2>
            <p className="text-muted-foreground">
              Variables in Fluxo are declared using the <code className="bg-muted px-2 py-1 rounded-md text-sm">local</code> keyword.
              Variables can store numbers, strings, booleans, and other values.
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
              Functions can accept variable numbers of arguments using rest parameters with <code className="bg-muted px-2 py-1 rounded-md text-sm">...</code>
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
            <h2 className="text-2xl font-bold">Operators</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Arithmetic Operators</h3>
                <div className="bg-card border border-border rounded-md p-4">
                  <pre className="font-mono text-sm text-foreground">
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
                <div className="bg-card border border-border rounded-md p-4">
                  <pre className="font-mono text-sm text-foreground">
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
        </div>
      ),
    },
    controlFlow: {
      id: "control-flow",
      title: "Control Flow",
      keywords: ["if", "else", "while", "for", "loop", "condition", "control"],
      content: (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">If-Else Statements</h2>
            <p className="text-muted-foreground">
              Execute different code blocks based on conditions.
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
{`for (local i = 0; i < 10; i = i + 1) {
  console.log("Iteration:", i)
}`}
              </pre>
            </div>
          </section>
        </div>
      ),
    },
    modules: {
      id: "modules",
      title: "Modules",
      keywords: ["module", "export", "require", "import", "organize"],
      content: (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Working with Modules</h2>
            <p className="text-muted-foreground">
              Modules allow you to organize code into reusable components. Module files use the <code className="bg-muted px-2 py-1 rounded-md text-sm">.fxm</code> extension.
            </p>
            <h3 className="text-xl font-semibold">Creating a Module</h3>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
              Import modules using the <code className="bg-muted px-2 py-1 rounded-md text-sm">require()</code> function.
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
        </div>
      ),
    },
    htmlSupport: {
      id: "html-support",
      title: "HTML Support",
      keywords: ["html", "css", "button", "input", "onclick", "event", "ui", "interface", "create"],
      content: (
        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
              <h2 className="text-3xl font-bold">HTML & UI Elements</h2>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-md p-4 mb-6">
              <p className="text-sm font-semibold mb-2">Requires HTMLSupporter Extension</p>
              <p className="text-sm text-muted-foreground">
                To use HTML elements and event handlers, install the <strong>HTMLSupporter</strong> extension from the Extensions panel.
              </p>
            </div>
            <p className="text-lg text-muted-foreground">
              Fluxo supports creating interactive HTML and CSS elements using a simple, intuitive API. Build user interfaces,
              handle user interactions, and create dynamic web applications.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Creating Elements</h3>
            <p className="text-muted-foreground">
              Use the create functions to build UI elements with properties and styles.
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
{`// Create a button
local myButton = createButton({
  text: "Click Me",
  class: "btn-primary"
})

// Create an input field
local nameInput = createInput({
  type: "text",
  placeholder: "Enter your name"
})

// Create a container div
local container = createDiv({
  class: "container"
})`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Event Handlers</h3>
            <p className="text-muted-foreground">
              Add interactivity to your elements using event handler methods.
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
{`// Button click handler
local button = createButton({ text: "Submit" })
button.onClick(function() {
  console.log("Button was clicked!")
})

// Input change handler
local input = createInput({ type: "text" })
input.onChange(function(value) {
  console.log("Input value:", value)
})

// Hover handler
local card = createDiv({ class: "card" })
card.onHover(function() {
  console.log("Mouse is hovering!")
})`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Complete Example</h3>
            <p className="text-muted-foreground">
              Here's a complete interactive form example:
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
{`// Create a simple greeting form

local nameInput = createInput({
  type: "text",
  placeholder: "Enter your name"
})

local greetButton = createButton({
  text: "Greet Me!"
})

local resultText = createParagraph({
  text: ""
})

// Handle button click
greetButton.onClick(function() {
  // Get input value
  local name = nameInput.value
  
  if (name != "") {
    resultText.text = "Hello, " + name + "!"
  } else {
    resultText.text = "Please enter your name"
  }
})

// Add elements to page
local container = createDiv({ class: "form-container" })
container.append(nameInput)
container.append(greetButton)
container.append(resultText)`}
              </pre>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Available Elements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createButton()</code>
                <p className="text-xs text-muted-foreground mt-1">Interactive button element</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createInput()</code>
                <p className="text-xs text-muted-foreground mt-1">Text input field</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createDiv()</code>
                <p className="text-xs text-muted-foreground mt-1">Container element</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createText()</code>
                <p className="text-xs text-muted-foreground mt-1">Text element</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createParagraph()</code>
                <p className="text-xs text-muted-foreground mt-1">Paragraph element</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">createHeading()</code>
                <p className="text-xs text-muted-foreground mt-1">Heading element</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Available Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onClick()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle click events</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onChange()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle input changes</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onHover()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle mouse hover</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onSubmit()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle form submission</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onFocus()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle focus events</p>
              </div>
              <div className="bg-card border border-border rounded-md p-3">
                <code className="text-sm font-semibold text-primary">onBlur()</code>
                <p className="text-xs text-muted-foreground mt-1">Handle blur events</p>
              </div>
            </div>
          </section>
        </div>
      ),
    },
    bestPractices: {
      id: "best-practices",
      title: "Best Practices",
      keywords: ["tips", "best", "practice", "style", "guide", "convention"],
      content: (
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Tips and Best Practices</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Use descriptive variable and function names</li>
              <li>Add comments to explain complex logic</li>
              <li>Break down large programs into smaller functions</li>
              <li>Organize related functions into modules</li>
              <li>Test your code incrementally as you write it</li>
              <li>Use the console to debug and understand your program's flow</li>
              <li>When creating UI elements, keep event handlers simple and focused</li>
              <li>Use meaningful class names for styling elements</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold">Complete Example</h3>
            <p className="text-muted-foreground">
              Here's a complete example that demonstrates various Fluxo features:
            </p>
            <div className="bg-card border border-border rounded-md p-4">
              <pre className="font-mono text-sm text-foreground">
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
        </div>
      ),
    },
  }), []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    const filtered: typeof sections = {} as any;

    Object.entries(sections).forEach(([key, section]) => {
      const matchesKeywords = section.keywords.some(keyword =>
        keyword.toLowerCase().includes(query)
      );
      const matchesTitle = section.title.toLowerCase().includes(query);

      if (matchesKeywords || matchesTitle) {
        filtered[key as keyof typeof sections] = section;
      }
    });

    return filtered;
  }, [searchQuery, sections]);

  const hasResults = Object.keys(filteredSections).length > 0;

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Book className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Fluxo Documentation</h1>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-to-ide">
            <Home className="h-4 w-4 mr-2" />
            Back to IDE
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-docs"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              {hasResults
                ? `Found ${Object.keys(filteredSections).length} matching section${Object.keys(filteredSections).length !== 1 ? 's' : ''}`
                : 'No matching sections found'}
            </p>
          )}
        </div>

        {!hasResults ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try searching for something else</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="getting-started" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(filteredSections).map(([key, section]) => (
                <TabsTrigger key={key} value={section.id} data-testid={`tab-${section.id}`}>
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(filteredSections).map(([key, section]) => (
              <TabsContent key={key} value={section.id} className="flex-1 mt-6">
                <ScrollArea className="h-[calc(100vh-240px)]">
                  <div className="pr-6">
                    {section.content}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
