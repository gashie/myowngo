package content

func init() {
	registerExplanations(map[string]string{
		"module_import": "## Importing Modules\n\nJS: `const pkg = require('package')` or `import pkg from 'package'`\nGo: `import \"package/path\"`\n\n```go\nimport (\n    \"fmt\"                    // stdlib\n    \"net/http\"               // stdlib nested\n    \"github.com/user/pkg\"    // third-party\n)\n```\n\n**Key differences:**\n- No `require()` — use `import` at the top\n- Third-party packages use full module paths (like GitHub URLs)\n- Install with `go get github.com/user/pkg`\n- **Unused imports = compile error!** (use `_` to import for side effects)",

		"module_export": "## Exporting from Modules\n\nJS: `module.exports = { greet }` or `export function greet() {}`\n\nGo: **Capitalized names are automatically exported!**\n\n```go\npackage greeter\n\nfunc Greet(name string) { }  // Exported (capital G)\nfunc helper() { }             // NOT exported (lowercase h)\n```\n\nNo export keyword needed. If it starts with a capital letter, it's public. This applies to functions, types, variables, and struct fields.",

		"module_export_usage": "## Using Exported Modules\n\nOnce a package exports functions, import and use them:\n\n```go\nimport \"github.com/user/greeter\"\n\nfunc main() {\n    greeter.Greet(\"bob\")  // call exported function\n}\n```\n\nThe package name becomes the namespace. You access everything through `packagename.ExportedName`.",

		"class": "## Classes → Structs + Methods\n\nGo has no `class` keyword. Instead, use **structs** with **methods**:\n\n```go\n// JS class\nclass Foo {\n    constructor(val) { this.item = val; }\n    getItem() { return this.item; }\n}\n\n// Go equivalent\ntype Foo struct {\n    Item string\n}\n\nfunc NewFoo(val string) *Foo {\n    return &Foo{Item: val}\n}\n\nfunc (f *Foo) GetItem() string {\n    return f.Item\n}\n```\n\n**No inheritance!** Go uses **composition** (embedding structs) and **interfaces** instead.",

		"documentation": "## Documentation Comments\n\nJS uses JSDoc (`/** ... */`). Go uses plain comments:\n\n```go\n// Person represents a human with a name.\ntype Person struct {\n    name string\n}\n\n// NewPerson creates a new Person with the given name.\nfunc NewPerson(name string) *Person {\n    return &Person{name: name}\n}\n```\n\nRules:\n- Comment starts with the **name being documented**\n- Run `go doc` to view docs from terminal\n- `godoc` generates HTML documentation automatically\n- Example functions (`ExampleXxx`) serve as runnable documentation AND tests",
	})

	registerTips(map[string][]TeacherTip{
		"module_import": {
			{Type: "gotcha", Title: "Unused imports = compile error!",
				Content: "Import something and don't use it? Code won't compile.\n\nUse _ for side-effect imports:\nimport _ \"github.com/lib/pq\"  // registers DB driver"},
			{Type: "protip", Title: "go get installs packages",
				Content: "go get github.com/user/pkg  // install\ngo mod tidy                  // clean up unused deps\ngo mod init myproject        // start a new module"},
		},
		"module_export": {
			{Type: "remember", Title: "Capital letter = exported",
				Content: "This ONE rule replaces export/module.exports:\n\nfunc DoStuff() {}  // public\nfunc doStuff() {}  // private\n\nType Foo struct {} // public\ntype foo struct {} // private"},
		},
		"class": {
			{Type: "gotcha", Title: "No inheritance in Go!",
				Content: "Go uses COMPOSITION over inheritance:\n\ntype Animal struct { Name string }\ntype Dog struct {\n    Animal           // embedded — Dog 'has' Animal\n    Breed string\n}\n\ndog.Name works because Animal is embedded."},
			{Type: "remember", Title: "Interfaces are implicit",
				Content: "No 'implements' keyword. If a type has the right methods, it satisfies the interface automatically:\n\ntype Stringer interface {\n    String() string\n}\n// Any type with String() method IS a Stringer"},
		},
		"documentation": {
			{Type: "protip", Title: "Example functions are tests too!",
				Content: "func ExampleNewPerson() {\n    p := NewPerson(\"bob\")\n    fmt.Println(p.Name)\n    // Output: bob\n}\n\nThis is both documentation AND a test!"},
		},
	})

	registerChallenges(map[string]Challenge{
		"class": {
			Type:        "build",
			Prompt:      "Build a Counter struct with methods.\n\nRequirements:\n- `type Counter struct { count int }`\n- `func (c *Counter) Increment()` — use pointer receiver `*Counter`\n- `func (c *Counter) Decrement()`\n- `func (c *Counter) GetCount() int`\n- Increment twice, decrement once, print count\n- Output: `1`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Build a Counter with Increment, Decrement, and GetCount methods.\n// Use pointer receivers (*Counter) so methods can modify state.\n//\n// Expected output: 1\n\n// Define Counter struct and methods here\n\nfunc main() {\n\t// Create counter, increment twice, decrement once, print count\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\ntype Counter struct {\n\tcount int\n}\n\nfunc (c *Counter) Increment() {\n\tc.count++\n}\n\nfunc (c *Counter) Decrement() {\n\tc.count--\n}\n\nfunc (c *Counter) GetCount() int {\n\treturn c.count\n}\n\nfunc main() {\n\tc := &Counter{}\n\tc.Increment()\n\tc.Increment()\n\tc.Decrement()\n\tfmt.Println(c.GetCount())\n}",
			ExpectedOut: "1\n",
			Hints:       []string{"Use pointer receiver (*Counter) so methods can modify count", "Initialize with &Counter{} — count defaults to 0"},
			BonusXP:     15,
			BonusCoins:  8,
		},
		"module_export": {
			Type:        "rewrite",
			Prompt:      "Classify Go function names as exported or private.\n\nGiven: `getData`, `ProcessData`, `validate`, `HandleRequest`\n- Uppercase first letter = exported\n- Lowercase first letter = private\n- Print one per line in order\n- Output: `private`, `exported`, `private`, `exported`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// In Go, capitalization determines visibility.\n// Classify: getData, ProcessData, validate, HandleRequest\n// Print \"private\" or \"exported\" for each, one per line.\n//\n// Expected output:\n//   private\n//   exported\n//   private\n//   exported\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"private\")\n\tfmt.Println(\"exported\")\n\tfmt.Println(\"private\")\n\tfmt.Println(\"exported\")\n}",
			ExpectedOut: "private\nexported\nprivate\nexported\n",
			Hints:       []string{"Capital first letter = exported", "Lowercase first letter = private/unexported"},
			BonusXP:     5,
			BonusCoins:  3,
		},
	})

	registerAnnotations(map[string][]Annotation{
		"class": {
			{LineNode: 1, LineGo: 5, Text: "type Foo struct {} replaces class Foo {}. No class keyword in Go."},
			{LineNode: 2, LineGo: 10, Text: "NewFoo() is the constructor convention — a factory function, not a special method."},
			{LineNode: 6, LineGo: 17, Text: "Methods use receiver syntax: func (f *Foo) GetItem() — the receiver comes before the method name."},
		},
		"errors": {
			{LineNode: 1, LineGo: 9, Text: "Custom errors implement the error interface by having an Error() string method."},
			{LineNode: 3, LineGo: 17, Text: "NewFooError returns the error interface type, not *FooError — this is idiomatic."},
		},
	})

	registerTests(map[string][]TestCase{
		"class": {
			{Name: "Counter works correctly", ExpectedOut: "1\n"},
		},
		"module_export": {
			{Name: "Correct export classification", ExpectedOut: "private\nexported\nprivate\nexported\n"},
		},
	})
}
