package content

func init() {
	registerExplanations(map[string]string{
		"http_server": "## HTTP Server: Built-in!\n\nJS: `require('http')` (then usually Express)\nGo: `net/http` is production-ready out of the box!\n\n```go\nfunc handler(w http.ResponseWriter, r *http.Request) {\n    w.WriteHeader(200)\n    w.Write([]byte(\"hello world\"))\n}\n\nfunc main() {\n    http.HandleFunc(\"/\", handler)\n    http.ListenAndServe(\":8080\", nil)\n}\n```\n\n**ResponseWriter** is where you write the response (like `res` in Express).\n**Request** contains all request data (like `req` in Express).\n\nNo Express needed — Go's stdlib handles routing, middleware, TLS, and more.",

		"json": "## JSON: encoding/json\n\nJS: `JSON.parse()` / `JSON.stringify()`\nGo: `json.Unmarshal()` / `json.Marshal()`\n\n```go\n// Parse JSON into struct\ntype User struct {\n    Name string `json:\"name\"`\n    Age  int    `json:\"age\"`\n}\n\nvar user User\njson.Unmarshal([]byte(jsonStr), &user)\n\n// Struct to JSON\ndata, _ := json.Marshal(user)\n```\n\n**Struct tags** (`json:\"name\"`) control the JSON field names. Without them, JSON keys match the Go field names (capitalized).",

		"url_parse": "## URL Parsing: net/url\n\nJS: `new URL(str)` or `url.parse(str)`\nGo: `url.Parse(str)`\n\n```go\nu, _ := url.Parse(\"http://user:pass@host:8080/path?q=1\")\n\nu.Scheme    // \"http\"\nu.User      // \"user:pass\"\nu.Hostname() // \"host\"\nu.Port()     // \"8080\"\nu.Path       // \"/path\"\nu.Query()    // map[q:[1]]\n```\n\nAll in the standard library — no third-party URL parser needed.",

		"tcp_server": "## TCP Server: net.Listen\n\nJS: `net.createServer(handler)`\nGo: `net.Listen(\"tcp\", \":3000\")`\n\n```go\nlistener, _ := net.Listen(\"tcp\", \":3000\")\ndefer listener.Close()\n\nfor {\n    conn, _ := listener.Accept()\n    go handleConnection(conn)  // goroutine per connection!\n}\n```\n\nEach connection runs in its own goroutine — no callback hell, no event loop limitations.",

		"udp_server": "## UDP Server: net.ListenUDP\n\nJS: `dgram.createSocket('udp4')`\nGo: `net.ListenUDP(\"udp\", addr)`\n\n```go\nconn, _ := net.ListenUDP(\"udp\", &net.UDPAddr{Port: 3000})\ndefer conn.Close()\n\nbuf := make([]byte, 1024)\nfor {\n    n, addr, _ := conn.ReadFromUDP(buf)\n    fmt.Printf(\"from %s: %s\\n\", addr, buf[:n])\n}\n```",

		"dns": "## DNS Lookup: net.Lookup*\n\nJS: `dns.resolveNs()`, `dns.resolve4()`\nGo: `net.LookupNS()`, `net.LookupIP()`\n\n```go\nns, _ := net.LookupNS(\"google.com\")\nips, _ := net.LookupIP(\"google.com\")\nmx, _ := net.LookupMX(\"google.com\")\ntxt, _ := net.LookupTXT(\"google.com\")\n```\n\nAll synchronous (no callbacks). For custom DNS servers, use `net.Resolver`.",
	})

	registerTips(map[string][]TeacherTip{
		"http_server": {
			{Type: "protip", Title: "net/http is production-ready!",
				Content: "Unlike Node's http (where you'd use Express), Go's stdlib is powerful enough for production.\n\nGo 1.22+ added pattern matching:\nhttp.HandleFunc(\"GET /api/users/{id}\", handler)"},
			{Type: "remember", Title: "Handler signature",
				Content: "Every HTTP handler has this signature:\n\nfunc(w http.ResponseWriter, r *http.Request)\n\nw = write response\nr = read request"},
		},
		"json": {
			{Type: "gotcha", Title: "Struct tags control JSON names",
				Content: "type User struct {\n    Name string `json:\"name\"`\n}\n\nWithout tags, JSON keys are Capitalized (matching the Go field name)."},
			{Type: "remember", Title: "Fields must be Capitalized for JSON",
				Content: "Only exported (uppercase) fields appear in JSON.\n\ntype User struct {\n    Name string  // IN JSON\n    age  int     // NOT in JSON (lowercase)\n}"},
			{Type: "protip", Title: "Omit empty fields",
				Content: "Use `json:\",omitempty\"` to skip zero-value fields:\n\ntype User struct {\n    Name  string `json:\"name\"`\n    Email string `json:\"email,omitempty\"`\n}"},
		},
		"url_parse": {
			{Type: "protip", Title: "Build URLs safely",
				Content: "u := &url.URL{\n    Scheme: \"https\",\n    Host:   \"api.example.com\",\n    Path:   \"/users\",\n}\nq := u.Query()\nq.Set(\"page\", \"1\")\nu.RawQuery = q.Encode()"},
		},
		"tcp_server": {
			{Type: "remember", Title: "One goroutine per connection",
				Content: "for {\n    conn, _ := listener.Accept()\n    go handle(conn)  // concurrent!\n}\n\nEach connection gets its own goroutine. No callback soup."},
		},
	})

	registerChallenges(map[string]Challenge{
		"json": {
			Type:        "build",
			Prompt:      "Marshal a struct to JSON and print it.\n\nRequirements:\n- Define `type Book struct` with `Title` and `Author` string fields\n- Add json tags: `` `json:\"title\"` `` and `` `json:\"author\"` ``\n- Create a Book and use `json.Marshal` to convert to JSON bytes\n- Print with `fmt.Println(string(data))`\n- Output: `{\"title\":\"Go in Action\",\"author\":\"William Kennedy\"}`",
			StarterCode: "package main\n\nimport (\n\t\"encoding/json\"\n\t\"fmt\"\n)\n\n// Define a Book struct with json tags, create one, and marshal it.\n// Struct tags like `json:\"title\"` control the JSON key names.\n//\n// Expected output: {\"title\":\"Go in Action\",\"author\":\"William Kennedy\"}\n\n// Define Book struct with json tags here\n\nfunc main() {\n\t// Create a book and marshal to JSON\n}",
			Solution:    "package main\n\nimport (\n\t\"encoding/json\"\n\t\"fmt\"\n)\n\ntype Book struct {\n\tTitle  string `json:\"title\"`\n\tAuthor string `json:\"author\"`\n}\n\nfunc main() {\n\tb := Book{Title: \"Go in Action\", Author: \"William Kennedy\"}\n\tdata, _ := json.Marshal(b)\n\tfmt.Println(string(data))\n}",
			ExpectedOut: "{\"title\":\"Go in Action\",\"author\":\"William Kennedy\"}\n",
			Hints:       []string{"Use struct tags: `json:\"fieldname\"`", "json.Marshal returns []byte — convert to string"},
			BonusXP:     10,
			BonusCoins:  5,
		},
		"url_parse": {
			Type:        "build",
			Prompt:      "Parse a URL and print its parts.\n\nRequirements:\n- Use `url.Parse(\"https://example.com:8080/api/users?page=2\")`\n- Print scheme, hostname, port, path — each on its own line\n- Output: `https`, `example.com`, `8080`, `/api/users` (4 lines)",
			StarterCode: "package main\n\nimport (\n\t\"fmt\"\n\t\"net/url\"\n)\n\n// Parse a URL and print its scheme, hostname, port, and path.\n//\n// Expected output:\n//   https\n//   example.com\n//   8080\n//   /api/users\n\nfunc main() {\n\t// Your code here\n}",
			Solution:    "package main\n\nimport (\n\t\"fmt\"\n\t\"net/url\"\n)\n\nfunc main() {\n\tu, _ := url.Parse(\"https://example.com:8080/api/users?page=2\")\n\tfmt.Println(u.Scheme)\n\tfmt.Println(u.Hostname())\n\tfmt.Println(u.Port())\n\tfmt.Println(u.Path)\n}",
			ExpectedOut: "https\nexample.com\n8080\n/api/users\n",
			Hints:       []string{"url.Parse returns *url.URL", "Use .Hostname() and .Port() methods"},
			BonusXP:     10,
			BonusCoins:  5,
		},
	})

	registerAnnotations(map[string][]Annotation{
		"http_server": {
			{LineNode: 3, LineGo: 7, Text: "Handler takes (ResponseWriter, *Request) — write to w, read from r."},
			{LineNode: 4, LineGo: 8, Text: "w.WriteHeader sets status code. w.Write sends the body."},
			{LineNode: 8, LineGo: 12, Text: "HandleFunc registers a handler for a path. Like app.get('/', handler) in Express."},
			{LineNode: 9, LineGo: 13, Text: "ListenAndServe starts the server. It blocks until the server stops."},
		},
		"json": {
			{LineNode: 1, LineGo: 8, Text: "Struct with json tags — tags control the JSON key names."},
			{LineNode: 3, LineGo: 14, Text: "json.Unmarshal parses JSON bytes into a struct. Pass a pointer (&t)."},
			{LineNode: 7, LineGo: 20, Text: "json.Marshal converts a struct to JSON bytes. Convert to string to print."},
		},
	})

	registerTests(map[string][]TestCase{
		"json": {
			{Name: "Marshals book to JSON", ExpectedOut: "{\"title\":\"Go in Action\",\"author\":\"William Kennedy\"}\n"},
		},
		"url_parse": {
			{Name: "Parses URL parts", ExpectedOut: "https\nexample.com\n8080\n/api/users\n"},
		},
	})
}
