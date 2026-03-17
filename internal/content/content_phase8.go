package content

func init() {
	registerExplanations(map[string]string{
		"logging": "## Logging: log Package\n\nJS: `console.log()` with timestamps added manually\nGo: `log` package automatically adds timestamps!\n\n```go\nlog.Println(\"hello world\")\n// Output: 2024/01/15 10:30:00 hello world\n```\n\n`log.Fatal()` logs and exits. `log.Panic()` logs and panics.\n\nFor structured logging (JSON), Go 1.21+ has `log/slog`:\n```go\nslog.Info(\"user logged in\", \"user\", \"alice\", \"ip\", \"1.2.3.4\")\n```",

		"regex": "## Regular Expressions: regexp\n\nJS: `/pattern/flags`\nGo: `regexp.MustCompile(\"pattern\")`\n\n```go\nre := regexp.MustCompile(`foo(.*)`)\n\n// Replace\nresult := re.ReplaceAllString(input, \"qux$1\")\n\n// Test match\nmatched := re.MatchString(input)\n\n// Find all\nmatches := re.FindAllString(input, -1)\n```\n\n**Note:** Go uses RE2 syntax (no backreferences, no lookahead). This guarantees linear-time matching.",

		"crypto": "## Cryptography: crypto Package\n\nJS: `crypto.createHash('sha256')`\nGo: `crypto/sha256`\n\n```go\nhash := sha256.Sum256([]byte(\"hello\"))\nfmt.Println(hex.EncodeToString(hash[:]))\n```\n\nGo's crypto packages are well-audited and used in production systems worldwide. Available: SHA256, SHA512, AES, RSA, ECDSA, Ed25519, and more.",

		"gzip": "## Gzip Compression: compress/gzip\n\nJS: `zlib.gzip()` / `zlib.unzip()`\nGo: `gzip.NewWriter()` / `gzip.NewReader()`\n\n```go\n// Compress\nvar buf bytes.Buffer\nw := gzip.NewWriter(&buf)\nw.Write(data)\nw.Close()\n\n// Decompress\nr, _ := gzip.NewReader(&buf)\ndecompressed, _ := io.ReadAll(r)\n```\n\nGo's gzip uses the io.Reader/Writer pattern — composable with anything.",

		"datetime": "## Date & Time: time Package\n\nJS: `new Date()`, `Date.now()`\nGo: `time.Now()`, `time.Now().Unix()`\n\n```go\nnow := time.Now()\nunix := now.Unix()\n\n// Parse a date string\ndate, _ := time.Parse(\"2006-01-02\", \"2024-01-15\")\n\n// Format a date\nformatted := date.Format(\"01/02/2006\")\n\n// Add duration\nfuture := date.AddDate(0, 0, 14)  // add 14 days\n```\n\n**Quirk:** Go's reference time is `Mon Jan 2 15:04:05 MST 2006` — you use this specific date in format strings!",

		"db_sqlite3": "## SQLite Database: database/sql\n\nJS: `require('sqlite3')`\nGo: `database/sql` + driver import\n\n```go\nimport (\n    \"database/sql\"\n    _ \"github.com/mattn/go-sqlite3\"  // driver\n)\n\ndb, _ := sql.Open(\"sqlite3\", \"./app.db\")\ndefer db.Close()\n\n// Execute\ndb.Exec(\"CREATE TABLE users (name TEXT)\")\n\n// Query\nrows, _ := db.Query(\"SELECT name FROM users\")\nfor rows.Next() {\n    var name string\n    rows.Scan(&name)\n}\n```\n\nThe `database/sql` package works with any database — just swap the driver import.",

		"benchmark_test": "## Benchmarking: testing.B\n\nJS: use `benchmark` package\nGo: built into the testing framework!\n\n```go\nfunc BenchmarkMyFunc(b *testing.B) {\n    for n := 0; n < b.N; n++ {\n        myFunc()\n    }\n}\n```\n\nRun with: `go test -bench=.`\n\nGo automatically adjusts b.N to get stable measurements. No third-party package needed!",

		"example_test": "## Example-Based Testing\n\nGo has a unique testing feature — **Example functions** that serve as both documentation AND tests:\n\n```go\nfunc ExampleSum() {\n    result := sum(2, 3)\n    fmt.Println(result)\n    // Output: 5\n}\n```\n\nThe `// Output:` comment is checked by `go test`. If the output doesn't match, the test fails.\n\nTable-driven tests are the Go convention:\n```go\nfor _, tt := range tests {\n    t.Run(tt.name, func(t *testing.T) {\n        got := myFunc(tt.input)\n        if got != tt.want {\n            t.Errorf(\"got %v, want %v\", got, tt.want)\n        }\n    })\n}\n```",
	})

	registerTips(map[string][]TeacherTip{
		"logging": {
			{Type: "protip", Title: "Use slog for structured logging",
				Content: "Go 1.21+ has log/slog for structured logging:\n\nslog.Info(\"request\", \"method\", \"GET\", \"path\", \"/api\")\n\nOutputs JSON or text with key-value pairs."},
		},
		"regex": {
			{Type: "gotcha", Title: "No lookahead/lookbehind!",
				Content: "Go uses RE2 (not PCRE like JS/Python).\n\nNo: (?=...) (?!...) (?<=...) (?<!...)\nNo backreferences\n\nThis guarantees O(n) matching — no regex DoS!"},
			{Type: "remember", Title: "MustCompile panics on bad regex",
				Content: "regexp.MustCompile() panics if the pattern is invalid.\nUse regexp.Compile() if you want to handle the error:\n\nre, err := regexp.Compile(pattern)"},
		},
		"datetime": {
			{Type: "gotcha", Title: "The magic reference time!",
				Content: "Go uses a specific reference date for formatting:\n\nMon Jan 2 15:04:05 MST 2006\n\nOr numerically: 01/02 03:04:05PM '06 -0700\n\nThis is January 2, 2006 at 3:04:05 PM.\nRemember: 1 2 3 4 5 6 7"},
		},
		"db_sqlite3": {
			{Type: "remember", Title: "database/sql works with ANY database",
				Content: "Just swap the driver import:\n\n_ \"github.com/mattn/go-sqlite3\"    // SQLite\n_ \"github.com/lib/pq\"              // PostgreSQL\n_ \"github.com/go-sql-driver/mysql\" // MySQL\n\nSame API, different backend."},
			{Type: "gotcha", Title: "Always defer rows.Close()!",
				Content: "rows, _ := db.Query(...)\ndefer rows.Close()  // ALWAYS!\n\nForgetting this leaks database connections."},
		},
		"benchmark_test": {
			{Type: "protip", Title: "Run with go test -bench=.",
				Content: "go test -bench=.           // run all benchmarks\ngo test -bench=BenchmarkX  // run specific one\ngo test -bench=. -count=5  // run 5 times for stability\n\nOutput shows ns/op (nanoseconds per operation)."},
		},
		"example_test": {
			{Type: "remember", Title: "Table-driven tests are THE Go pattern",
				Content: "tests := []struct{\n    input int\n    want  int\n}{\n    {1, 2}, {2, 4}, {3, 6},\n}\nfor _, tt := range tests {\n    got := double(tt.input)\n    if got != tt.want { t.Error() }\n}"},
		},
	})

	registerChallenges(map[string]Challenge{
		"regex": {
			Type:        "build",
			Prompt:      "Find all numbers in a string using regexp.\n\nRequirements:\n- Use `regexp.MustCompile(` + \"`\" + `[0-9]+` + \"`\" + `)` to compile the pattern\n- Use `re.FindAllString(input, -1)` to find all matches\n- Print the result with `fmt.Println(matches)`\n- Output: `[123 456 789]`",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"regexp\"\n)\n\n// Use regexp to find all numbers in a string.\n// Compile a pattern, then use FindAllString.\n//\n// Expected output: [123 456 789]\n\nfunc main() {\n\tinput := \"abc 123 def 456 ghi 789\"\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"regexp\"\n)\n\nfunc main() {\n\tinput := \"abc 123 def 456 ghi 789\"\n\tre := regexp.MustCompile(`[0-9]+`)\n\tmatches := re.FindAllString(input, -1)\n\tfmt.Println(matches)\n}",
			ExpectedOut: "[123 456 789]\n",
			Hints:       []string{"regexp.MustCompile(`[0-9]+`)", "FindAllString(input, -1) finds all matches"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"crypto": {
			Type:        "build",
			Prompt:      "Compute the SHA256 hash of \"hello\" as hex.\n\nRequirements:\n- Use `sha256.Sum256([]byte(\"hello\"))` to hash\n- Use `hex.EncodeToString(hash[:])` to convert to hex string\n- Print with `fmt.Println`\n- Output: `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`",
			StarterCode: "package main\n\nimport (\n\t\"crypto/sha256\"\n\t\"encoding/hex\"\n\t\"fmt\"\n)\n\n// Hash the string \"hello\" with SHA256 and print the hex digest.\n// sha256.Sum256 returns [32]byte; use [:] to convert to a slice.\n//\n// Expected output: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"crypto/sha256\"\n\t\"encoding/hex\"\n\t\"fmt\"\n)\n\nfunc main() {\n\thash := sha256.Sum256([]byte(\"hello\"))\n\tfmt.Println(hex.EncodeToString(hash[:]))\n}",
			ExpectedOut: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\n",
			Hints:       []string{"sha256.Sum256 returns [32]byte — use hash[:] to get a slice", "hex.EncodeToString converts bytes to hex"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"datetime": {
			Type:        "build",
			Prompt:      "Parse a date string and reformat it.\n\nRequirements:\n- Use `time.Parse(\"2006-01-02\", \"2024-03-15\")` to parse the date\n- Use `date.Format(\"01/02/2006\")` to reformat\n- Print with `fmt.Println`\n- Output: `03/15/2024`",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"time\"\n)\n\n// Parse a date string and reformat it.\n// Go uses a reference date for layouts: 2006-01-02\n//\n// Expected output: 03/15/2024\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"time\"\n)\n\nfunc main() {\n\tdate, _ := time.Parse(\"2006-01-02\", \"2024-03-15\")\n\tfmt.Println(date.Format(\"01/02/2006\"))\n}",
			ExpectedOut: "03/15/2024\n",
			Hints:       []string{"Go's reference date: 2006-01-02 (Jan 2, 2006)", "Use the same reference pattern for both Parse and Format"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"logging": {
			Type:        "rewrite",
			Prompt:      "Convert JS console.log with timestamp to Go.\n\nJavaScript: `console.log(new Date().toISOString(), 'hello world')`\nGo: `log.Println(\"server started\")` — adds timestamp automatically\n\nNote: log output goes to stderr — stdout will be empty.",
			StarterCode: "package main\n\nimport \"log\"\n\n// Use log.Println to log a message with an automatic timestamp.\n// Note: log output goes to stderr, not stdout.\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport \"log\"\n\nfunc main() {\n\tlog.Println(\"hello world\")\n}",
			ExpectedOut: "",
			Hints:       []string{"log.Println automatically adds timestamp", "No need to manually create Date objects"},
			BonusXP:     5,
			BonusCoins:  3,
		},
	})

	registerTests(map[string][]TestCase{
		"regex": {
			{Name: "Finds all numbers", ExpectedOut: "[123 456 789]\n"},
		},
		"crypto": {
			{Name: "SHA256 hash of hello", ExpectedOut: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824\n"},
		},
		"datetime": {
			{Name: "Formats date correctly", ExpectedOut: "03/15/2024\n"},
		},
	})
}
