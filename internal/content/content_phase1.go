package content

func init() {
	registerExplanations(map[string]string{
		"print": `## From console.log() to fmt.Println()

In Node.js, you use **console.log()** for everything. In Go, the **fmt** package handles all output.

**Key differences:**
- Go requires ` + "`import \"fmt\"`" + ` at the top
- ` + "`fmt.Println()`" + ` adds a newline automatically (like console.log)
- ` + "`fmt.Printf()`" + ` uses **format verbs** like %s, %d, %v instead of template literals
- To print to stderr: ` + "`fmt.Fprintf(os.Stderr, ...)`" + ` instead of console.error()
- Every Go file starts with ` + "`package main`" + ` and needs a ` + "`func main()`" + ``,

		"comments": `## Comments: Almost Identical

Good news — comments work the same way!

- ` + "`//`" + ` for single-line comments (same as JS)
- ` + "`/* */`" + ` for multi-line comments (same as JS)
- Go has a convention: comments on exported functions start with the function name`,

		"variables": `## From var/let/const to Go's Variables

In Node.js you have **var**, **let**, and **const**. Go has its own system:

- ` + "`var x string = \"hello\"`" + ` — explicit type declaration
- ` + "`x := \"hello\"`" + ` — shorthand with type inference (most common!)
- ` + "`const x = \"hello\"`" + ` — constants (like JS const, but truly immutable)

**Big difference:** Go is **statically typed**. Once a variable has a type, it can't change.
**Huge difference:** **Unused variables cause a compile error** in Go! Use ` + "`_`" + ` to discard.`,

		"types": `## Static Types vs Dynamic Types

This is the **biggest mental shift** from Node.js. In JS, a variable can hold anything:
` + "```js\nlet x = 5;      // number\nx = \"hello\";    // now it's a string — JS doesn't care\n```" + `

In Go, types are **fixed at declaration**:
` + "```go\nvar x int = 5\nx = \"hello\"    // COMPILE ERROR: cannot use string as int\n```" + `

**Go's basic types:** bool, string, int, int8/16/32/64, float32/64, byte, rune`,

		"interpolation": "## Template Literals → fmt.Sprintf\n\nNode.js template literals are elegant:\n```js\nconst name = \"World\";\nconsole.log(`Hello, ${name}!`);\n```\n\nGo uses **fmt.Sprintf** with format verbs:\n```go\nname := \"World\"\nfmt.Printf(\"Hello, %s!\\n\", name)\n```\n\n**Common format verbs:** %s (string), %d (integer), %f (float), %v (any value), %T (type name)",

		"ifelse": `## If/Else: Almost the Same, But Better

Go's if/else looks familiar but has two differences:

1. **No parentheses** around the condition: ` + "`if x > 5 {`" + ` not ` + "`if (x > 5) {`" + `
2. **Init statement**: you can declare a variable right in the if:
` + "```go\nif err := doSomething(); err != nil {\n    // handle error\n}\n// err doesn't exist out here!\n```" + `

This pattern is **everywhere** in Go. You'll see ` + "`if err != nil`" + ` hundreds of times.`,

		"switch": `## Switch: No Break Needed!

In JS, forgetting ` + "`break`" + ` causes fall-through bugs. Go fixed this:

- **No break needed** — Go stops after the first matching case automatically
- Use ` + "`fallthrough`" + ` keyword if you actually want fall-through (rare)
- Switch can work **without a condition** (acts like if/else chain)
- Cases can have **multiple values**: ` + "`case 1, 2, 3:`" + ``,

		"for_loop": `## The Only Loop: for

Node.js has for, while, do-while, for-of, for-in, forEach...

Go has **one loop: for**. It does everything:

- Classic: ` + "`for i := 0; i < 10; i++ { }`" + `
- While-style: ` + "`for condition { }`" + `
- Infinite: ` + "`for { }`" + `
- Range (like for-of): ` + "`for i, v := range slice { }`" + `

Less to remember, more consistent.`,

		"while_loop": `## While Loop = Just "for"

There is no ` + "`while`" + ` keyword in Go. You use ` + "`for`" + ` without the init and post statements:

` + "```go\n// This IS your while loop\nfor i < 10 {\n    i++\n}\n```" + `

Simple and clean. One keyword for all loops.`,

		"functions": `## Functions: Multiple Return Values!

Go functions look similar to JS, but with a superpower — **multiple return values**:

` + "```go\nfunc divide(a, b float64) (float64, error) {\n    if b == 0 {\n        return 0, errors.New(\"division by zero\")\n    }\n    return a / b, nil\n}\n```" + `

This is how Go handles errors — no try/catch, just return the error as a second value.

**Other differences:**
- Types come **after** parameter names: ` + "`func add(a int, b int) int`" + `
- No function hoisting — declare before you use
- Functions are first-class (can be passed around, just like JS)`,

		"default_values": `## No Default Parameters!

In JS: ` + "`function greet(name = \"World\") { }`" + `

Go doesn't have default parameters. Instead, you use these patterns:

1. **Variadic arguments**: ` + "`func greet(names ...string) { }`" + `
2. **Options struct**: pass a config object
3. **Multiple functions**: ` + "`Greet()`" + ` and ` + "`GreetWithName(name)`" + `
4. **Zero values**: Go initializes variables to their zero value (0, "", false, nil)`,

		"iife": `## IIFE: Immediately Invoked Functions

In JS, IIFEs create isolated scopes:
` + "```js\n(function() { /* isolated */ })();\n```" + `

Go has the same concept with anonymous functions:
` + "```go\nfunc() {\n    // isolated scope\n}()\n```" + `

In Go, this is mainly used with **goroutines**: ` + "`go func() { ... }()`" + ``,
	})

	registerTips(map[string][]TeacherTip{
		"print": {
			{Type: "gotcha", Title: "fmt.Printf needs format verbs!",
				Content: "Coming from console.log, you might try fmt.Printf(\"hello\"). That works for plain text, but to insert values you MUST use format verbs:\n\n%s = string\n%d = integer\n%f = float\n%v = any value (Go figures it out)\n%T = prints the TYPE of a value\n%t = boolean\n%x = hexadecimal\n\nExample: fmt.Printf(\"Name: %s, Age: %d\\n\", name, age)"},
			{Type: "remember", Title: "Printf does NOT add a newline!",
				Content: "fmt.Println() adds \\n automatically. fmt.Printf() does NOT. You must add \\n yourself, or your next print runs into the same line."},
			{Type: "protip", Title: "Use fmt.Sprintf to build strings",
				Content: "fmt.Sprintf works like Printf but RETURNS a string instead of printing:\n\nmessage := fmt.Sprintf(\"Hello %s, you are %d\", name, age)"},
		},
		"comments": {
			{Type: "protip", Title: "Doc comments = your documentation",
				Content: "Comments before exported functions become official docs. Start with the function name:\n\n// Add returns the sum of a and b.\nfunc Add(a, b int) int { ... }"},
		},
		"variables": {
			{Type: "gotcha", Title: "Unused variables = compile error!",
				Content: "This is the #1 surprise for JS devs. If you declare a variable and don't use it, the code WON'T COMPILE. Use _ to ignore values:\n\nresult, _ := someFunction()"},
			{Type: "remember", Title: ":= only works INSIDE functions",
				Content: "The short declaration := only works inside a function. At package level, use var:\n\nvar GlobalName = \"hello\"  // package level\nfunc main() {\n    localName := \"world\"  // inside function only\n}"},
			{Type: "protip", Title: "Zero values are your friend",
				Content: "Every type has a zero value — no 'undefined' in Go:\n\nint → 0\nstring → \"\" (empty)\nbool → false\npointer/slice/map → nil\n\nvar count int  // count is already 0!"},
		},
		"types": {
			{Type: "gotcha", Title: "Types are FIXED at compile time",
				Content: "In JS: let x = 5; x = 'hello'; // fine!\nIn Go: x := 5; x = \"hello\" // COMPILE ERROR\n\nOnce a variable has a type, it keeps that type forever."},
			{Type: "remember", Title: "int size depends on your system",
				Content: "'int' is 64-bit on 64-bit systems, 32-bit on 32-bit. For specific sizes use int32 or int64."},
		},
		"interpolation": {
			{Type: "gotcha", Title: "No template literals in Go!",
				Content: "There is no ${variable} syntax. You MUST use fmt.Sprintf:\n\nJS:  `Hello ${name}, age ${age}`\nGo:  fmt.Sprintf(\"Hello %s, age %d\", name, age)\n\nVerbs must match types: %s=string, %d=int, %f=float"},
			{Type: "remember", Title: "Format verb cheat sheet",
				Content: "%v = any value (auto-detect)\n%s = string\n%d = integer\n%f = float (default precision)\n%.2f = float with 2 decimals\n%t = boolean\n%T = type name\n%+v = struct with field names\n%#v = Go syntax representation"},
		},
		"ifelse": {
			{Type: "gotcha", Title: "Brace MUST be on the same line!",
				Content: "This is a compile error:\n\nif x > 5\n{    // WRONG! Brace can't go here\n}\n\nThe { must always be on the same line as if/else/for/func."},
			{Type: "protip", Title: "if with init statement is powerful",
				Content: "Declare a variable in the if:\n\nif err := doSomething(); err != nil {\n    // err exists here\n}\n// err is gone here!"},
		},
		"switch": {
			{Type: "remember", Title: "No break needed — ever!",
				Content: "Each case automatically breaks. If you actually WANT fall-through (rare), use the 'fallthrough' keyword explicitly."},
		},
		"for_loop": {
			{Type: "remember", Title: "'for' is the ONLY loop in Go",
				Content: "No while. No do-while. No for-of. Just 'for':\n\nfor i := 0; i < 10; i++ {}  // classic\nfor i < 10 {}                // while\nfor {}                        // infinite\nfor i, v := range slice {}   // for-of"},
			{Type: "gotcha", Title: "range gives INDEX and VALUE",
				Content: "for i, v := range mySlice {}\ni = index, v = value\n\nOnly value: for _, v := range slice {}\nOnly index: for i := range slice {}"},
		},
		"while_loop": {
			{Type: "protip", Title: "break and continue work the same",
				Content: "'break' exits the loop, 'continue' skips to next iteration. Go also supports labeled breaks for nested loops."},
		},
		"functions": {
			{Type: "gotcha", Title: "Multiple return values change everything",
				Content: "This is how Go handles errors — no try/catch!\n\nresult, err := doSomething()\nif err != nil { return err }\n\nYou'll write this pattern thousands of times."},
			{Type: "remember", Title: "Types come AFTER the name",
				Content: "JS: function add(a, b)\nGo: func add(a int, b int) int\n\nShorthand: func add(a, b int) int"},
		},
		"default_values": {
			{Type: "gotcha", Title: "No default parameters in Go!",
				Content: "Workarounds:\n1. Zero values (always valid)\n2. Variadic: func log(msgs ...string)\n3. Options struct\n4. Functional options (advanced)"},
		},
		"iife": {
			{Type: "protip", Title: "IIFEs + goroutines = concurrency",
				Content: "Main use in Go:\n\ngo func() {\n    // runs concurrently\n}()"},
		},
	})

	registerAnnotations(map[string][]Annotation{
		"print": {
			{LineNode: 1, LineGo: 1, Text: "Every Go file starts with a package declaration. 'main' means this is an executable."},
			{LineNode: 1, LineGo: 3, Text: "Go requires explicit imports. The 'fmt' package handles formatted I/O."},
			{LineNode: 1, LineGo: 7, Text: "Entry point must be 'func main()' — like Node running a file directly."},
			{LineNode: 1, LineGo: 8, Text: "fmt.Println() is your console.log(). Adds newline automatically."},
		},
		"variables": {
			{LineNode: 1, LineGo: 7, Text: "'var' declares with explicit type. Like 'let' but typed."},
			{LineNode: 3, LineGo: 9, Text: "':=' is shorthand — declares AND infers type. You'll use this 90% of the time."},
			{LineNode: 5, LineGo: 11, Text: "'const' works similarly but in Go, constants must be compile-time values."},
		},
		"for_loop": {
			{LineNode: 1, LineGo: 8, Text: "Same structure: init; condition; post. But no parentheses in Go."},
		},
		"functions": {
			{LineNode: 1, LineGo: 7, Text: "Parameters have types AFTER the name: 'a int' not 'int a'."},
			{LineNode: 1, LineGo: 7, Text: "Return type comes after the parameters: 'func add(a, b int) int'."},
		},
	})

	registerChallenges(map[string]Challenge{
		"print": {
			Type:   "rewrite",
			Prompt: "Rewrite this Node.js code in Go:\n\n```js\nconsole.log('Hello, GoQuest!')\nconsole.log('You have %d lives', 3)\n```\n\nRequirements:\n- Use `fmt.Println(\"Hello, GoQuest!\")` for the first line (adds newline automatically)\n- Use `fmt.Printf(\"You have %d lives\\n\", 3)` for the second line (format verb `%d` for integer, add `\\n` yourself)\n- Output must be exactly two lines:\n  - `Hello, GoQuest!`\n  - `You have 3 lives`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Rewrite console.log to Go
 *
 * Rewrite these two JavaScript lines in Go:
 *   console.log('Hello, GoQuest!')        → use fmt.Println("Hello, GoQuest!")
 *   console.log('You have %d lives', 3)   → use fmt.Printf("You have %d lives\n", 3)
 *
 * fmt.Println adds a newline automatically.
 * fmt.Printf does NOT — you must add \n yourself.
 * %d is the format verb for integers.
 *
 * Expected output (exactly):
 *   Hello, GoQuest!
 *   You have 3 lives
 */

func main() {
	// Line 1: use fmt.Println to print "Hello, GoQuest!"

	// Line 2: use fmt.Printf with %d to print "You have 3 lives"

}`,
			Solution: `package main

import "fmt"

func main() {
	fmt.Println("Hello, GoQuest!")
	fmt.Printf("You have %d lives\n", 3)
}`,
			ExpectedOut: "Hello, GoQuest!\nYou have 3 lives\n",
			Hints:       []string{"Use fmt.Println for simple output", "Use fmt.Printf with %d for integers — don't forget \\n"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"variables": {
			Type:   "fill_blank",
			Prompt: "Fill in the blanks to declare variables in Go.\nReplace `___` with the correct Go keyword.\n\nRequirements:\n- Use `var` for the explicit type declaration\n- Use `:=` for the short variable declaration\n- Use `const` for the constant\n- The final `fmt.Println(name, age, isActive)` prints all three space-separated on one line: `GoQuest 5 true`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Fill in the blanks
 *
 * Replace each ___ with the correct Go keyword:
 *   ___ name string = "GoQuest"   → use 'var' (explicit type declaration)
 *   age ___ 5                     → use ':=' (short declaration with type inference)
 *   ___ isActive = true           → use 'const' (constant — value never changes)
 *
 * fmt.Println(name, age, isActive) prints all values separated by spaces.
 *
 * Expected output (exactly):
 *   GoQuest 5 true
 */

func main() {
	___ name string = "GoQuest"
	age ___ 5
	___ isActive = true
	fmt.Println(name, age, isActive)
}`,
			Solution: `package main

import "fmt"

func main() {
	var name string = "GoQuest"
	age := 5
	const isActive = true
	fmt.Println(name, age, isActive)
}`,
			ExpectedOut: "GoQuest 5 true\n",
			Hints:       []string{"Use 'var' for explicit type declarations", "Use ':=' for shorthand with type inference", "Use 'const' for values that never change"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"for_loop": {
			Type:   "build",
			Prompt: "Write a Go program that prints numbers 1 to 10.\n\nRequirements:\n- Use a `for` loop with `i := 1; i <= 10; i++`\n- Use `fmt.Println(i)` inside the loop — this prints one number per line with a newline after each\n- Output must be exactly 10 lines: `1` then `2` then `3` ... then `10`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Print numbers 1 to 10
 *
 * Use a classic for loop:
 *   for i := 1; i <= 10; i++ {
 *       fmt.Println(i)
 *   }
 *
 * Go only has 'for' — no while, no do-while.
 * fmt.Println(i) prints the number followed by a newline.
 *
 * Expected output (exactly 10 lines):
 *   1
 *   2
 *   3
 *   ...
 *   10
 */

func main() {
	// Write a for loop: for i := 1; i <= 10; i++ { ... }

}`,
			Solution: `package main

import "fmt"

func main() {
	for i := 1; i <= 10; i++ {
		fmt.Println(i)
	}
}`,
			ExpectedOut: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n",
			Hints:       []string{"Go only has 'for', no 'while'", "Use := to initialize the loop variable"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"ifelse": {
			Type:   "rewrite",
			Prompt: "Convert JS if/else to Go.\n\nJavaScript:\n```js\nconst age = 20;\nif (age >= 18) { console.log('adult'); } else { console.log('minor'); }\n```\n\nRequirements:\n- Declare `age := 20` using short declaration\n- Use `if age >= 18 {` — no parentheses around the condition\n- Use `fmt.Println(\"adult\")` or `fmt.Println(\"minor\")`\n- Output: `adult`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Rewrite JS if/else to Go
 *
 * JavaScript version:
 *   const age = 20;
 *   if (age >= 18) { console.log('adult'); }
 *   else { console.log('minor'); }
 *
 * Go version differences:
 *   - Use := instead of const (short declaration)
 *   - No parentheses around the condition: if age >= 18 {
 *   - Opening brace { MUST be on the same line as if/else
 *   - Use fmt.Println("adult") or fmt.Println("minor")
 *
 * Since age is 20 (>= 18), the output must be exactly:
 *   adult
 */

func main() {
	// Step 1: declare age := 20
	// Step 2: if age >= 18 { fmt.Println("adult") } else { fmt.Println("minor") }

}`,
			Solution: `package main

import "fmt"

func main() {
	age := 20
	if age >= 18 {
		fmt.Println("adult")
	} else {
		fmt.Println("minor")
	}
}`,
			ExpectedOut: "adult\n",
			Hints:       []string{"No parentheses around the condition in Go", "Opening brace { must be on the same line as if/else"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"switch": {
			Type:   "rewrite",
			Prompt: "Convert JS switch to Go.\n\nJavaScript:\n```js\nswitch(day) { case 'monday': console.log('Start of week'); break; ... }\n```\n\nRequirements:\n- Declare `day := \"monday\"`\n- Use `switch day {` — no parentheses, no break needed in Go\n- Use `fmt.Println` to print the matching message\n- Output: `Start of week`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Rewrite JS switch to Go
 *
 * JavaScript version:
 *   switch(day) {
 *     case 'monday': console.log('Start of week'); break;
 *     case 'friday': console.log('TGIF'); break;
 *     default: console.log('Regular day');
 *   }
 *
 * Go differences:
 *   - No parentheses: switch day {
 *   - No break needed — Go stops after the matching case automatically
 *   - Cases use fmt.Println to print the message
 *
 * Since day is "monday", the output must be exactly:
 *   Start of week
 */

func main() {
	// Step 1: declare day := "monday"
	// Step 2: switch day { case "monday": ... case "friday": ... default: ... }

}`,
			Solution: `package main

import "fmt"

func main() {
	day := "monday"
	switch day {
	case "monday":
		fmt.Println("Start of week")
	case "friday":
		fmt.Println("TGIF")
	default:
		fmt.Println("Regular day")
	}
}`,
			ExpectedOut: "Start of week\n",
			Hints:       []string{"No break needed in Go — it's automatic", "No parentheses around the switch value"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"functions": {
			Type:   "build",
			Prompt: "Write a Go function called `add` that takes two integers and returns their sum.\n\nRequirements:\n- Define `func add(a, b int) int` that returns `a + b`\n- In main, call `fmt.Println(add(3, 5))` — this prints the result on its own line\n- Output must be exactly one line: `8`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Write an add function
 *
 * Define a function with this signature:
 *   func add(a, b int) int
 *
 * It should return a + b.
 *
 * In Go, parameter types come AFTER the name.
 * When params share a type: (a, b int) instead of (a int, b int)
 * Return type goes after the parameters: func add(a, b int) int
 *
 * Then in main, call: fmt.Println(add(3, 5))
 *
 * Expected output (exactly):
 *   8
 */

// Write your add function here: func add(a, b int) int { ... }

func main() {
	// Print the result of add(3, 5)

}`,
			Solution: `package main

import "fmt"

func add(a, b int) int {
	return a + b
}

func main() {
	fmt.Println(add(3, 5))
}`,
			ExpectedOut: "8\n",
			Hints:       []string{"Return type goes after the parameters: func add(a, b int) int", "When parameters share a type, you can write 'a, b int' instead of 'a int, b int'"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"arrays": {
			Type:   "fix_bug",
			Prompt: "This Go code has 2 bugs. Fix them so it compiles and runs correctly.\n\nRequirements:\n- Fix the slice literal syntax (should be `[]int{...}` not `[int]{...}`)\n- Fix the missing closing parenthesis on the `make()` call\n- The code uses `fmt.Println` to print each slice — output format is `[1 2 3 4 5]` (space-separated, in brackets)\n- Output must be exactly two lines:\n  - `[1 2 3 4 5]`\n  - `[2 4 6 8 10]`",
			StarterCode: `package main

import "fmt"

/*
 * CHALLENGE: Fix 2 bugs in this code
 *
 * Bug 1 (line below): [int]{...} is wrong.
 *   Fix: slice literals use []int{...} (square brackets before type)
 *
 * Bug 2 (further below): make([]int, len(numbers) is missing a closing ')'
 *   Fix: make([]int, len(numbers))
 *
 * Expected output (exactly 2 lines):
 *   [1 2 3 4 5]
 *   [2 4 6 8 10]
 */

func main() {
	numbers := [int]{1, 2, 3, 4, 5}
	fmt.Println(numbers)

	doubled := make([]int, len(numbers)
	for i, v := range numbers {
		doubled[i] = v * 2
	}
	fmt.Println(doubled)
}`,
			Solution: `package main

import "fmt"

func main() {
	numbers := []int{1, 2, 3, 4, 5}
	fmt.Println(numbers)

	doubled := make([]int, len(numbers))
	for i, v := range numbers {
		doubled[i] = v * 2
	}
	fmt.Println(doubled)
}`,
			ExpectedOut: "[1 2 3 4 5]\n[2 4 6 8 10]\n",
			Hints:       []string{"Slice literals use []int not [int]", "Check for missing closing parenthesis"},
			BonusXP:     10,
			BonusCoins:  5,
		},
	})

	registerTests(map[string][]TestCase{
		"print": {
			{Name: "Use fmt.Println to print 'Go is fun!' and fmt.Printf to print 'Version: 1.21' (with %s and \\n)", ExpectedOut: "Go is fun!\nVersion: 1.21\n"},
			{Name: "Use fmt.Println to print 'Hello' and fmt.Printf with %d to print 'Count: 42'", ExpectedOut: "Hello\nCount: 42\n"},
			{Name: "Use fmt.Println to print 'GoQuest' and fmt.Printf with %s to print 'Lang: Go'", ExpectedOut: "GoQuest\nLang: Go\n"},
		},
		"for_loop": {
			{Name: "Use a for loop to print even numbers from 2 to 20, each on its own line using fmt.Println", ExpectedOut: "2\n4\n6\n8\n10\n12\n14\n16\n18\n20\n"},
			{Name: "Use a for loop to print numbers 5 to 1 (countdown), each on its own line using fmt.Println", ExpectedOut: "5\n4\n3\n2\n1\n"},
			{Name: "Use a for loop to print multiples of 3 from 3 to 15, each on its own line using fmt.Println", ExpectedOut: "3\n6\n9\n12\n15\n"},
		},
		"functions": {
			{Name: "Write func multiply(a, b int) int that returns a * b. Print multiply(6, 7) using fmt.Println", ExpectedOut: "42\n"},
			{Name: "multiply(0, 5) returns 0", ExpectedOut: "0\n", WrapperCode: `func main() { fmt.Println(multiply(0, 5)) }`},
			{Name: "multiply(-3, 4) returns -12", ExpectedOut: "-12\n", WrapperCode: `func main() { fmt.Println(multiply(-3, 4)) }`},
			{Name: "multiply(10, 10) returns 100", ExpectedOut: "100\n", WrapperCode: `func main() { fmt.Println(multiply(10, 10)) }`},
		},
		"variables": {
			{Name: "Declare lang := \"Go\", year := 2009, compiled := true. Print all three with fmt.Println(lang, year, compiled)", ExpectedOut: "Go 2009 true\n"},
			{Name: "Declare fruit := \"apple\", count := 3, fresh := true. Print all three with fmt.Println(fruit, count, fresh)", ExpectedOut: "apple 3 true\n"},
		},
		"ifelse": {
			{Name: "Declare temp := 35. If temp > 30 print 'hot' else print 'cool' using fmt.Println", ExpectedOut: "hot\n"},
			{Name: "Declare score := 85. If score >= 60 print 'pass' else print 'fail' using fmt.Println", ExpectedOut: "pass\n"},
		},
		"switch": {
			{Name: "Declare grade := \"A\". Switch on grade: A prints 'Excellent', B prints 'Good', default prints 'OK'. Use fmt.Println", ExpectedOut: "Excellent\n"},
			{Name: "Declare color := \"red\". Switch on color: red prints 'Stop', green prints 'Go', default prints 'Wait'. Use fmt.Println", ExpectedOut: "Stop\n"},
		},
	})
}
