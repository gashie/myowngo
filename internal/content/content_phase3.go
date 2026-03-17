package content

func init() {
	registerExplanations(map[string]string{
		"errors": "## Creating Errors: errors.New & Custom Types\n\nIn JS: `throw new Error('message')`\nIn Go: errors are just **values** that implement the `error` interface.\n\n```go\n// Simple error\nerr := errors.New(\"something went wrong\")\n\n// Custom error type\ntype NotFoundError struct {\n    ID string\n}\nfunc (e *NotFoundError) Error() string {\n    return \"not found: \" + e.ID\n}\n```\n\nThe `error` interface has just one method: `Error() string`. Any type that implements it IS an error.",

		"try_catch": "## Try/Catch → Return Errors\n\nThis is the **biggest paradigm shift** from JS to Go.\n\nJS wraps risky code in try/catch:\n```js\ntry {\n    const result = riskyOperation();\n} catch(err) {\n    console.error(err);\n}\n```\n\nGo returns errors as values:\n```go\nresult, err := riskyOperation()\nif err != nil {\n    log.Fatal(err)\n}\n```\n\nNo exceptions, no try/catch. Every function that can fail returns an `error` as its last return value. You check it immediately.",

		"exceptions": "## Panic & Recover: Go's Emergency Exit\n\nGo has `panic` for truly exceptional situations (like a bug, not normal errors):\n```go\npanic(\"something impossible happened\")\n```\n\n`recover()` catches panics (like catch for uncaught exceptions):\n```go\ndefer func() {\n    if r := recover(); r != nil {\n        fmt.Println(\"recovered:\", r)\n    }\n}()\n```\n\n**Rule of thumb:** Use error returns for expected failures. Use panic only for programmer bugs or impossible states.",

		"type_check": "## Type Checking: reflect.TypeOf\n\nJS: `typeof x` or `Object.prototype.toString.call(x)`\nGo: `reflect.TypeOf(x)` or type switches:\n\n```go\nswitch v := x.(type) {\ncase int:\n    fmt.Println(\"it's an int:\", v)\ncase string:\n    fmt.Println(\"it's a string:\", v)\ndefault:\n    fmt.Println(\"unknown type\")\n}\n```\n\nType switches are idiomatic Go. `reflect` is powerful but slow — use type switches when possible.",

		"stack_trace": "## Stack Traces: runtime/debug\n\nJS: `console.trace()` or `err.stack`\nGo: `runtime/debug.Stack()` returns the current stack trace as bytes.\n\nUsually used inside `recover()`:\n```go\ndefer func() {\n    if r := recover(); r != nil {\n        fmt.Println(string(debug.Stack()))\n    }\n}()\n```\n\nFor better error context in production, consider the `fmt.Errorf` wrapping pattern:\n```go\nreturn fmt.Errorf(\"loading user %d: %w\", id, err)\n```",
	})

	registerTips(map[string][]TeacherTip{
		"errors": {
			{Type: "remember", Title: "if err != nil — the Go mantra",
				Content: "Errors are values. Every fallible function returns an error:\n\nresult, err := doThing()\nif err != nil { return err }"},
			{Type: "protip", Title: "Wrap errors with context",
				Content: "Don't just return err. Add context:\n\nreturn fmt.Errorf(\"loading user %d: %w\", id, err)\n\nThe %w verb wraps the error so you can unwrap it later with errors.Is() or errors.As()."},
		},
		"try_catch": {
			{Type: "gotcha", Title: "No try/catch in Go!",
				Content: "This is the hardest habit to break from JS.\n\nJS: try { } catch(err) { }\nGo: result, err := fn(); if err != nil { }\n\nEvery function that can fail returns an error. Check it immediately."},
			{Type: "remember", Title: "Always handle errors",
				Content: "Never do: result, _ := riskyFunc()\n\nAlways check:\nresult, err := riskyFunc()\nif err != nil {\n    return err\n}"},
		},
		"exceptions": {
			{Type: "warning", Title: "panic is NOT for normal errors!",
				Content: "Don't use panic like throw in JS.\n\npanic = program BUG, impossible state\nerror return = expected failure\n\nPanic crashes the program unless recovered."},
			{Type: "remember", Title: "defer runs in LIFO order",
				Content: "Deferred functions run when the surrounding function returns, in Last-In-First-Out order.\n\ndefer fmt.Println(\"first\")\ndefer fmt.Println(\"second\")\n// prints: second, then first"},
		},
		"type_check": {
			{Type: "protip", Title: "Type switches are idiomatic",
				Content: "switch v := x.(type) {\ncase int:    // v is int\ncase string: // v is string\n}\n\nPrefer type switches over reflect for known types."},
		},
		"stack_trace": {
			{Type: "protip", Title: "Use %w for error wrapping",
				Content: "fmt.Errorf(\"context: %w\", err) wraps errors.\nerrors.Is(err, target) checks the chain.\nerrors.As(err, &target) extracts typed errors."},
		},
	})

	registerChallenges(map[string]Challenge{
		"errors": {
			Type:        "build",
			Prompt:      "Create a custom error type and divide function.\n\nRequirements:\n- Define `type DivideError struct { message string }`\n- Implement `func (e *DivideError) Error() string` → returns `e.message`\n- Define `func divide(a, b float64) (float64, error)` → returns error when `b == 0`\n- `main` already calls `divide(10, 0)` and prints the error\n- Output: `cannot divide by zero`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Create a custom error type and a divide function.\n// The error interface requires one method: Error() string\n//\n// Expected output: cannot divide by zero\n\n// Define DivideError and divide function here\n\nfunc main() {\n\tresult, err := divide(10, 0)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\ntype DivideError struct {\n\tmessage string\n}\n\nfunc (e *DivideError) Error() string {\n\treturn e.message\n}\n\nfunc divide(a, b float64) (float64, error) {\n\tif b == 0 {\n\t\treturn 0, &DivideError{message: \"cannot divide by zero\"}\n\t}\n\treturn a / b, nil\n}\n\nfunc main() {\n\tresult, err := divide(10, 0)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}",
			ExpectedOut: "cannot divide by zero\n",
			Hints:       []string{"Implement the Error() string method on your struct", "Return 0 and the error when b == 0"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"try_catch": {
			Type:        "rewrite",
			Prompt:      "Convert JS try/catch to Go error handling.\n\nJavaScript:\n```js\ntry { foo(true); } catch(err) { console.log('caught:', err.message); }\n```\n\nRequirements:\n- Define `func foo(fail bool) error` that returns `errors.New(\"my error\")` when `fail` is true\n- In main, check `err != nil` and print with `fmt.Printf`\n- Output: `caught: my error`",
			StarterCode: "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\n// Go has no try/catch. Functions return errors as values.\n// Write a function that returns an error, then check it.\n//\n// Expected output: caught: my error\n\n// Write foo function here\n\nfunc main() {\n\t// Call foo(true) and handle the error\n}",
			Solution:    "package main\n\nimport (\n\t\"errors\"\n\t\"fmt\"\n)\n\nfunc foo(fail bool) error {\n\tif fail {\n\t\treturn errors.New(\"my error\")\n\t}\n\treturn nil\n}\n\nfunc main() {\n\terr := foo(true)\n\tif err != nil {\n\t\tfmt.Printf(\"caught: %s\\n\", err.Error())\n\t}\n}",
			ExpectedOut: "caught: my error\n",
			Hints:       []string{"Return errors.New() instead of throwing", "Check err != nil instead of try/catch"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"exceptions": {
			Type:        "build",
			Prompt:      "Use panic and defer/recover to catch an error.\n\nRequirements:\n- `dangerous()` should call `panic(\"oops\")`\n- In `main`, use `defer func() { if r := recover(); r != nil { ... } }()`\n- Print `recovered: oops` using `fmt.Printf`\n- Output: `recovered: oops`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Use panic() and defer/recover to catch an emergency.\n// The deferred recover must be set up BEFORE the panic.\n//\n// Expected output: recovered: oops\n\nfunc dangerous() {\n\t// Trigger a panic here\n}\n\nfunc main() {\n\t// Set up defer/recover, then call dangerous()\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc dangerous() {\n\tpanic(\"oops\")\n}\n\nfunc main() {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\tfmt.Printf(\"recovered: %s\\n\", r)\n\t\t}\n\t}()\n\tdangerous()\n}",
			ExpectedOut: "recovered: oops\n",
			Hints:       []string{"Use defer func() { ... }() before the panic call", "recover() returns the value passed to panic()"},
			BonusXP:     15,
			BonusCoins:  8,
		},
		"type_check": {
			Type:        "build",
			Prompt:      "Write a type switch function.\n\nRequirements:\n- Define `func describe(x interface{})` that uses `switch x.(type) { ... }`\n- Print `\"bool\"`, `\"int\"`, `\"string\"`, or `\"unknown\"` for each type\n- `main` already calls it with `true`, `42`, `\"hello\"`\n- Output: `bool`, `int`, `string` (3 lines)",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Use a type switch to identify the type of each value.\n// Print \"bool\", \"int\", \"string\", or \"unknown\".\n//\n// Expected output:\n//   bool\n//   int\n//   string\n\nfunc describe(x interface{}) {\n\t// Your code here\n}\n\nfunc main() {\n\tdescribe(true)\n\tdescribe(42)\n\tdescribe(\"hello\")\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc describe(x interface{}) {\n\tswitch x.(type) {\n\tcase bool:\n\t\tfmt.Println(\"bool\")\n\tcase int:\n\t\tfmt.Println(\"int\")\n\tcase string:\n\t\tfmt.Println(\"string\")\n\tdefault:\n\t\tfmt.Println(\"unknown\")\n\t}\n}\n\nfunc main() {\n\tdescribe(true)\n\tdescribe(42)\n\tdescribe(\"hello\")\n}",
			ExpectedOut: "bool\nint\nstring\n",
			Hints:       []string{"Use switch x.(type) { case int: ... }", "interface{} can hold any value"},
			BonusXP:     10,
			BonusCoins:  5,
		},
	})

	registerTests(map[string][]TestCase{
		"errors": {
			{Name: "Prints error message", ExpectedOut: "cannot divide by zero\n"},
			{Name: "divide(10, 2) returns 5", ExpectedOut: "5\n",
				WrapperCode: "func main() {\n\tresult, err := divide(10, 2)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}"},
			{Name: "divide(9, 3) returns 3", ExpectedOut: "3\n",
				WrapperCode: "func main() {\n\tresult, err := divide(9, 3)\n\tif err != nil {\n\t\tfmt.Println(err)\n\t} else {\n\t\tfmt.Println(result)\n\t}\n}"},
		},
		"try_catch": {
			{Name: "Catches error", ExpectedOut: "caught: my error\n"},
			{Name: "foo(false) returns nil — no output when no error", ExpectedOut: "",
				WrapperCode: "func main() {\n\terr := foo(false)\n\tif err != nil {\n\t\tfmt.Printf(\"caught: %s\\n\", err.Error())\n\t}\n}"},
		},
		"exceptions": {
			{Name: "Recovers from panic", ExpectedOut: "recovered: oops\n"},
			{Name: "Recover from panic(\"boom\") and print 'recovered: boom'", ExpectedOut: "recovered: boom\n"},
		},
		"type_check": {
			{Name: "Identifies types", ExpectedOut: "bool\nint\nstring\n"},
			{Name: "describe(3.14) prints 'unknown' since float64 is not handled", ExpectedOut: "unknown\n",
				WrapperCode: "func main() { describe(3.14) }"},
			{Name: "describe(false) prints 'bool'", ExpectedOut: "bool\n",
				WrapperCode: "func main() { describe(false) }"},
		},
	})
}
