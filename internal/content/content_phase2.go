package content

func init() {
	registerExplanations(map[string]string{
		"arrays": "## Arrays & Slices: The #1 Data Structure\n\nIn JS, arrays are dynamic and can hold anything. Go has two types:\n\n- **Arrays** (fixed size): `[5]int{1,2,3,4,5}` — rarely used directly\n- **Slices** (dynamic): `[]int{1,2,3,4,5}` — this is what you'll use!\n\n**Key operations:**\n- Create: `nums := []int{1, 2, 3}`\n- Append: `nums = append(nums, 4)` (must reassign!)\n- Slice: `sub := nums[1:3]` (like JS slice)\n- Copy: `copy(dest, src)` (not just assignment!)\n- Length: `len(nums)`\n\n**Big difference:** `append()` returns a new slice — you must reassign!",

		"array_iteration": "## Iterating Arrays: No map/filter/reduce!\n\nIn JS you have forEach, map, filter, reduce. Go has... **for range**. That's it.\n\nYou build map/filter/reduce yourself with loops:\n```go\n// Map equivalent\nmapped := make([]string, len(arr))\nfor i, v := range arr {\n    mapped[i] = strings.ToUpper(v)\n}\n\n// Filter equivalent\nvar filtered []string\nfor _, v := range arr {\n    if condition(v) {\n        filtered = append(filtered, v)\n    }\n}\n```\n\nIt's more verbose but explicit — you always know what's happening.",

		"array_sort": "## Sorting: sort Package\n\nJS uses `array.sort((a, b) => a - b)`. Go uses the **sort** package:\n\n- `sort.Ints(slice)` — sort integers ascending\n- `sort.Strings(slice)` — sort strings ascending\n- `sort.Sort(sort.Reverse(sort.IntSlice(s)))` — descending\n\nFor custom sorting, the simplest way (Go 1.8+):\n```go\nsort.Slice(people, func(i, j int) bool {\n    return people[i].Age < people[j].Age\n})\n```\n\nOr implement the `sort.Interface` with Len, Swap, Less methods.",

		"maps": "## Maps: Your JS Objects\n\nGo maps are like JS objects/Map — key-value pairs:\n```go\nm := make(map[string]string)  // create\nm[\"foo\"] = \"bar\"              // set\nvalue := m[\"foo\"]             // get\ndelete(m, \"foo\")              // delete\n```\n\n**The comma-ok idiom** — checking if a key exists:\n```go\nvalue, ok := m[\"foo\"]\nif ok {\n    // key exists\n}\n```\n\n**Important:** Maps are **unordered** — iteration order is random!",

		"objects": "## Structs: Go's Objects\n\nJS objects are flexible bags of properties. Go uses **structs** — typed, structured data:\n```go\ntype User struct {\n    Name  string\n    Email string\n    Age   int\n}\n\nuser := User{Name: \"Alice\", Age: 30}\n```\n\nMethods are defined OUTSIDE the struct:\n```go\nfunc (u *User) Greet() string {\n    return \"Hi, I'm \" + u.Name\n}\n```\n\nConstructor pattern — Go uses `NewXxx` functions:\n```go\nfunc NewUser(name string) *User {\n    return &User{Name: name}\n}\n```",

		"destructuring": "## Destructuring: Multiple Return Values\n\nJS destructuring: `const { key, value } = obj`\n\nGo doesn't have destructuring syntax, but achieves it through **multiple return values**:\n```go\n// Multiple assignment\nkey, value := obj.Key, obj.Value\n\n// From function return\nkey, value := obj.Read()\n```\n\nThis is idiomatic Go — functions often return multiple values.",

		"spread": "## Spread Operator: The ... Syntax\n\nJS spread: `console.log(...array)`\n\nGo has `...` but it works differently:\n\n- **Unpack a slice into a variadic function:** `fmt.Println(items...)`\n- **Append slices:** `result = append(slice1, slice2...)`\n\nThe `...` in Go only works with slices and variadic function parameters.",

		"rest": "## Rest Parameters: Variadic Functions\n\nJS rest: `function sum(...nums) {}`\n\nGo variadic: `func sum(nums ...int) int {}`\n\nAlmost identical! Inside the function, `nums` is a slice (`[]int`).\n```go\nfunc sum(nums ...int) int {\n    total := 0\n    for _, n := range nums {\n        total += n\n    }\n    return total\n}\n\nsum(1, 2, 3, 4, 5)  // individual args\nnums := []int{1, 2, 3}\nsum(nums...)          // unpack a slice\n```",

		"swapping": "## Variable Swapping: Built-in!\n\nJS: `[a, b] = [b, a]`\n\nGo has native tuple assignment:\n```go\na, b = b, a  // that's it!\n```\n\nNo temporary variable needed. Go evaluates the right side completely before assigning to the left side.",

		"uint8_arrays": "## Byte Slices: Go's Uint8Array\n\nJS has `Uint8Array` and `Buffer`. Go has `[]byte` (byte = uint8):\n```go\nbuf := make([]byte, 10)       // allocate 10 bytes\ncopy(buf[1:], []byte{1,2,3})  // copy at offset\nsub := buf[2:4]               // subarray\nlen(buf)                      // byteLength\n```\n\n`byte` is an alias for `uint8`. Strings can be converted to/from byte slices: `[]byte(\"hello\")`.",

		"big_numbers": "## Big Numbers: math/big\n\nJS has `BigInt` (75n). Go uses the `math/big` package:\n```go\nbn := new(big.Int)\nbn.SetUint64(75)           // from uint64\nbn.SetString(\"75\", 10)     // from string\nbn.SetString(\"4b\", 16)     // from hex\n```\n\nComparison uses `Cmp()`: returns -1, 0, or 1:\n```go\nresult := a.Cmp(b)\n// -1: a < b, 0: a == b, 1: a > b\n```",

		"buffers": "## Buffers: Low-Level Byte Manipulation\n\nNode's `Buffer` → Go's `[]byte` with `bytes` and `encoding/binary` packages:\n```go\nbuf := make([]byte, 6)                    // allocate\nhex.EncodeToString(buf)                   // to hex string\nreflect.DeepEqual(buf1, buf2)             // compare\n```\n\nFor reading/writing binary data, use `encoding/binary`:\n```go\nbinary.BigEndian.PutUint32(buf, value)    // write\nval := binary.BigEndian.Uint32(buf)       // read\n```",
	})

	registerTips(map[string][]TeacherTip{
		"arrays": {
			{Type: "gotcha", Title: "Arrays vs Slices — always use slices!",
				Content: "[5]int{} = array (fixed, rarely used)\n[]int{}  = slice (dynamic, use this!)\n\nSlices are like JS arrays."},
			{Type: "remember", Title: "append() returns a new slice",
				Content: "JS:  arr.push(4)           // modifies arr\nGo:  arr = append(arr, 4)  // must reassign!"},
		},
		"array_iteration": {
			{Type: "gotcha", Title: "No built-in map/filter/reduce!",
				Content: "Coming from JS, this is painful at first. You write manual loops:\n\n// JS: arr.map(x => x * 2)\n// Go:\nresult := make([]int, len(arr))\nfor i, v := range arr {\n    result[i] = v * 2\n}"},
			{Type: "protip", Title: "Use range for everything",
				Content: "for i, v := range slice {}  // index + value\nfor _, v := range slice {}  // value only\nfor i := range slice {}     // index only"},
		},
		"array_sort": {
			{Type: "remember", Title: "sort.Slice is the easy way",
				Content: "Instead of implementing sort.Interface, use:\n\nsort.Slice(people, func(i, j int) bool {\n    return people[i].Age < people[j].Age\n})"},
			{Type: "gotcha", Title: "sort modifies the original slice!",
				Content: "Unlike JS sort() which returns a new array, Go's sort modifies in place. Clone first if needed."},
		},
		"maps": {
			{Type: "gotcha", Title: "Check keys with comma-ok idiom",
				Content: "value, ok := myMap[key]\nif ok { // key exists }\n\nWithout the ok check, missing keys return the zero value silently!"},
			{Type: "remember", Title: "Maps must be initialized!",
				Content: "var m map[string]int  // nil map — will PANIC on write!\nm := make(map[string]int)  // initialized — safe to use\nm := map[string]int{}      // also fine"},
		},
		"objects": {
			{Type: "gotcha", Title: "Pointer vs Value receivers",
				Content: "func (u User) Name()  → gets a COPY (can't modify)\nfunc (u *User) SetName() → gets a POINTER (can modify)\n\nUse pointer receivers when you need to modify the struct."},
			{Type: "remember", Title: "Exported = Capitalized",
				Content: "In Go, uppercase = public, lowercase = private:\n\ntype User struct {\n    Name string  // exported (public)\n    age  int     // unexported (private)\n}"},
		},
		"destructuring": {
			{Type: "protip", Title: "Multiple returns = Go's destructuring",
				Content: "func getUser() (string, int, error) {\n    return \"Alice\", 30, nil\n}\n\nname, age, err := getUser()"},
		},
		"spread": {
			{Type: "gotcha", Title: "... only works with slices",
				Content: "You can't spread maps or structs like in JS. The ... operator only unpacks slices into variadic parameters."},
		},
		"rest": {
			{Type: "remember", Title: "Variadic must be the last param",
				Content: "func log(level string, msgs ...string) {} // OK\nfunc log(msgs ...string, level string) {} // COMPILE ERROR"},
		},
		"swapping": {
			{Type: "protip", Title: "Works with any number of variables",
				Content: "a, b, c = c, a, b  // rotate three variables!"},
		},
		"uint8_arrays": {
			{Type: "remember", Title: "byte = uint8, rune = int32",
				Content: "byte handles ASCII/binary data.\nrune handles Unicode characters.\n\nstring <-> []byte: []byte(\"hello\")\nstring <-> []rune: []rune(\"hello\")"},
		},
		"big_numbers": {
			{Type: "gotcha", Title: "big.Int methods modify the receiver",
				Content: "result := new(big.Int)\nresult.Add(a, b)  // result = a + b\n\nMost big.Int methods return the receiver so you can chain."},
		},
		"buffers": {
			{Type: "remember", Title: "Use encoding/binary for endianness",
				Content: "binary.BigEndian.PutUint16(buf, val)   // write\nval := binary.BigEndian.Uint16(buf)    // read\n\nAlways specify byte order explicitly."},
		},
	})

	registerAnnotations(map[string][]Annotation{
		"arrays": {
			{LineNode: 1, LineGo: 6, Text: "[]int{} creates a slice literal — like JS array but typed."},
			{LineNode: 4, LineGo: 8, Text: "make() + copy() to clone. Simple assignment shares the underlying array!"},
			{LineNode: 7, LineGo: 11, Text: "Slice syntax is identical: array[start:end]."},
			{LineNode: 10, LineGo: 13, Text: "append() returns a new slice. You MUST reassign: s = append(s, items...)."},
		},
		"maps": {
			{LineNode: 1, LineGo: 6, Text: "make(map[keyType]valueType) initializes a map. Both key and value types are specified."},
			{LineNode: 5, LineGo: 10, Text: "Comma-ok idiom: value, ok := m[key]. The 'ok' tells you if the key exists."},
			{LineNode: 8, LineGo: 13, Text: "delete() is a built-in function for removing map keys."},
		},
		"objects": {
			{LineNode: 1, LineGo: 5, Text: "type Foo struct {} defines a named struct — Go's equivalent of a class."},
			{LineNode: 3, LineGo: 10, Text: "NewFoo() is the constructor convention in Go — a plain function that returns *Foo."},
			{LineNode: 8, LineGo: 17, Text: "Methods use receiver syntax: func (f *Foo) Method() — the struct comes before the method name."},
		},
	})

	registerChallenges(map[string]Challenge{
		"array_iteration": {
			Type:   "build",
			Prompt: "Print each word in UPPERCASE.\n\nRequirements:\n- Use `for _, w := range words {` to iterate the slice\n- Use `strings.ToUpper(w)` to convert each word\n- Use `fmt.Println()` to print each on its own line\n- Output: `HELLO`, `WORLD`, `GO` (3 lines)",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n)\n\n// Iterate a slice and print each word in uppercase.\n// Use 'for _, w := range words' and strings.ToUpper(w).\n//\n// Expected output:\n//   HELLO\n//   WORLD\n//   GO\n\nfunc main() {\n\twords := []string{\"hello\", \"world\", \"go\"}\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"strings\"\n)\n\nfunc main() {\n\twords := []string{\"hello\", \"world\", \"go\"}\n\tfor _, w := range words {\n\t\tfmt.Println(strings.ToUpper(w))\n\t}\n}",
			ExpectedOut: "HELLO\nWORLD\nGO\n",
			Hints:       []string{"Use for _, w := range words", "strings.ToUpper(s) converts to uppercase"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"array_sort": {
			Type:        "build",
			Prompt:      "Sort a slice of integers in ascending order.\n\nRequirements:\n- Use `sort.Ints(nums)` to sort the slice in place\n- Use `fmt.Println(nums)` to print — Go prints slices as `[1 2 3 5 8 9]`\n- Output must be exactly one line: `[1 2 3 5 8 9]`",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"sort\"\n)\n\n// Sort a slice of integers in ascending order and print it.\n//\n// Expected output: [1 2 3 5 8 9]\n\nfunc main() {\n\tnums := []int{5, 3, 8, 1, 9, 2}\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"sort\"\n)\n\nfunc main() {\n\tnums := []int{5, 3, 8, 1, 9, 2}\n\tsort.Ints(nums)\n\tfmt.Println(nums)\n}",
			ExpectedOut: "[1 2 3 5 8 9]\n",
			Hints:       []string{"Use sort.Ints() to sort integers", "sort.Ints modifies the slice in place"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"maps": {
			Type:        "build",
			Prompt:      "Check if a map key exists, delete it, check again.\n\nRequirements:\n- Create map: `m := map[string]string{\"name\": \"Alice\", \"city\": \"NYC\"}`\n- Use `_, ok := m[\"name\"]` and `fmt.Println(ok)` to check existence\n- Use `delete(m, \"name\")` to remove the key\n- Check again and print\n- Output: `true` then `false` (2 lines)",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Use the comma-ok idiom to check if a key exists,\n// delete it, then check again.\n//\n// Expected output:\n//   true\n//   false\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tm := map[string]string{\n\t\t\"name\": \"Alice\",\n\t\t\"city\": \"NYC\",\n\t}\n\t_, ok := m[\"name\"]\n\tfmt.Println(ok)\n\tdelete(m, \"name\")\n\t_, ok = m[\"name\"]\n\tfmt.Println(ok)\n}",
			ExpectedOut: "true\nfalse\n",
			Hints:       []string{"Use _, ok := m[key] to check existence", "Use delete(m, key) to remove a key"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"objects": {
			Type:        "build",
			Prompt:      "Create a struct with a method and call it.\n\nRequirements:\n- Define `type Animal struct { Name string; Sound string }`\n- Add method `func (a Animal) Speak() string` that returns `a.Name + \" says \" + a.Sound`\n- Create `cat := Animal{Name: \"Cat\", Sound: \"Meow\"}`\n- Print `cat.Speak()` — output: `Cat says Meow`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Define an Animal struct with Name and Sound fields,\n// then add a Speak() method that returns \"Name says Sound\".\n//\n// Expected output: Cat says Meow\n\n// Define Animal struct and Speak method here\n\nfunc main() {\n\t// Create a Cat and print its Speak() result\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\ntype Animal struct {\n\tName  string\n\tSound string\n}\n\nfunc (a Animal) Speak() string {\n\treturn a.Name + \" says \" + a.Sound\n}\n\nfunc main() {\n\tcat := Animal{Name: \"Cat\", Sound: \"Meow\"}\n\tfmt.Println(cat.Speak())\n}",
			ExpectedOut: "Cat says Meow\n",
			Hints:       []string{"type Animal struct { Name string; Sound string }", "func (a Animal) Speak() string { ... }"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"destructuring": {
			Type:        "rewrite",
			Prompt:      "Convert JS destructuring to Go structs.\n\nJavaScript:\n```js\nconst obj = { x: 10, y: 20 }\nconst { x, y } = obj\nconsole.log(x + y)\n```\n\nRequirements:\n- Define `type Point struct { X int; Y int }`\n- Create `p := Point{X: 10, Y: 20}`\n- Extract with `x, y := p.X, p.Y`\n- Print `x + y` — output: `30`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Go has no destructuring syntax. Instead, use multiple assignment\n// to extract struct fields: x, y := p.X, p.Y\n//\n// Expected output: 30\n\nfunc main() {\n\t// Define a Point struct, create one, extract fields, print their sum\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\ntype Point struct {\n\tX int\n\tY int\n}\n\nfunc main() {\n\tp := Point{X: 10, Y: 20}\n\tx, y := p.X, p.Y\n\tfmt.Println(x + y)\n}",
			ExpectedOut: "30\n",
			Hints:       []string{"Create a struct with X and Y fields", "Use multiple assignment: x, y := p.X, p.Y"},
			BonusXP:     5,
			BonusCoins:  3,
		},
		"rest": {
			Type:        "build",
			Prompt:      "Write a variadic sum function.\n\nRequirements:\n- Define `func sum(nums ...int) int` — `...int` accepts any number of ints\n- Loop through `nums` and add them up, return the total\n- `main` already calls `sum(1,2,3,4,5)` and prints\n- Output must be exactly one line: `15`",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Write a variadic function that accepts any number of ints\n// and returns their total. Inside, 'nums' is a []int slice.\n//\n// Expected output: 15\n\n// Write sum function here\n\nfunc main() {\n\tfmt.Println(sum(1, 2, 3, 4, 5))\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc sum(nums ...int) int {\n\ttotal := 0\n\tfor _, n := range nums {\n\t\ttotal += n\n\t}\n\treturn total\n}\n\nfunc main() {\n\tfmt.Println(sum(1, 2, 3, 4, 5))\n}",
			ExpectedOut: "15\n",
			Hints:       []string{"Use ...int for variadic parameter", "nums is a []int inside the function"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"swapping": {
			Type:        "rewrite",
			Prompt:      "Convert JS variable swap to Go.\n\nJavaScript: `[b, a] = [a, b]`\nGo: `a, b = b, a`\n\nRequirements:\n- Declare `a := \"foo\"` and `b := \"bar\"`\n- Print with `fmt.Println(a, b)` → `foo bar`\n- Swap with `a, b = b, a`\n- Print again → `bar foo`\n- Output: 2 lines",
			StarterCode: "package main\n\nimport \"fmt\"\n\n// Go supports tuple assignment for swapping variables.\n// Declare two strings, print them, swap them, print again.\n//\n// Expected output:\n//   foo bar\n//   bar foo\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport \"fmt\"\n\nfunc main() {\n\ta := \"foo\"\n\tb := \"bar\"\n\tfmt.Println(a, b)\n\tb, a = a, b\n\tfmt.Println(a, b)\n}",
			ExpectedOut: "foo bar\nbar foo\n",
			Hints:       []string{"Go supports tuple assignment: a, b = b, a"},
			BonusXP:     5,
			BonusCoins:  3,
		},
	})

	registerTests(map[string][]TestCase{
		"arrays": {
			{Name: "Slice operations work correctly", ExpectedOut: "[1 2 3 4 5]\n[2 4 6 8 10]\n"},
			{Name: "Create []int{10, 20, 30}, double each with a loop, print both slices", ExpectedOut: "[10 20 30]\n[20 40 60]\n"},
		},
		"array_iteration": {
			{Name: "Prints words in uppercase", ExpectedOut: "HELLO\nWORLD\nGO\n"},
			{Name: "Print each fruit in []string{\"apple\", \"banana\"} in uppercase using range and strings.ToUpper", ExpectedOut: "APPLE\nBANANA\n"},
		},
		"array_sort": {
			{Name: "Sorts ascending", ExpectedOut: "[1 2 3 5 8 9]\n"},
			{Name: "Sort []int{9, 1, 5, 3} ascending with sort.Ints and print", ExpectedOut: "[1 3 5 9]\n"},
		},
		"maps": {
			{Name: "Key exists then deleted", ExpectedOut: "true\nfalse\n"},
			{Name: "Create map with \"lang\":\"Go\", check key exists, delete, check again", ExpectedOut: "true\nfalse\n"},
		},
		"objects": {
			{Name: "Animal speaks correctly", ExpectedOut: "Cat says Meow\n"},
			{Name: "Create Dog Animal with Sound \"Woof\" and print Speak()", ExpectedOut: "Dog says Woof\n",
				WrapperCode: "func main() {\n\tdog := Animal{Name: \"Dog\", Sound: \"Woof\"}\n\tfmt.Println(dog.Speak())\n}"},
			{Name: "Create Bird Animal with Sound \"Tweet\" and print Speak()", ExpectedOut: "Bird says Tweet\n",
				WrapperCode: "func main() {\n\tbird := Animal{Name: \"Bird\", Sound: \"Tweet\"}\n\tfmt.Println(bird.Speak())\n}"},
		},
		"destructuring": {
			{Name: "Sum of values", ExpectedOut: "30\n"},
			{Name: "Create Point{X: 5, Y: 15}, extract x, y and print x + y", ExpectedOut: "20\n"},
		},
		"rest": {
			{Name: "Sum of 1-5", ExpectedOut: "15\n"},
			{Name: "sum(10) returns 10", ExpectedOut: "10\n",
				WrapperCode: "func main() { fmt.Println(sum(10)) }"},
			{Name: "sum(2, 4, 6, 8) returns 20", ExpectedOut: "20\n",
				WrapperCode: "func main() { fmt.Println(sum(2, 4, 6, 8)) }"},
			{Name: "sum() with no args returns 0", ExpectedOut: "0\n",
				WrapperCode: "func main() { fmt.Println(sum()) }"},
		},
		"swapping": {
			{Name: "Variables swapped", ExpectedOut: "foo bar\nbar foo\n"},
			{Name: "Declare x := \"hello\", y := \"world\", print, swap with x, y = y, x, print again", ExpectedOut: "hello world\nworld hello\n"},
		},
	})
}
