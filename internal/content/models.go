package content

// SupportedLanguages lists all source languages users can learn Go from.
var SupportedLanguages = []LanguageInfo{
	{ID: "javascript", Name: "JavaScript", Label: "NODE.JS", Icon: "\u2B22", Extension: ".js", PrismClass: "language-javascript"},
	{ID: "python", Name: "Python", Label: "PYTHON", Icon: "\U0001F40D", Extension: ".py", PrismClass: "language-python"},
	{ID: "csharp", Name: "C#", Label: "C#", Icon: "#\uFE0F\u20E3", Extension: ".cs", PrismClass: "language-csharp"},
	{ID: "java", Name: "Java", Label: "JAVA", Icon: "\u2615", Extension: ".java", PrismClass: "language-java"},
	{ID: "php", Name: "PHP", Label: "PHP", Icon: "\U0001F418", Extension: ".php", PrismClass: "language-php"},
}

// LanguageInfo describes a supported source language.
type LanguageInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Label     string `json:"label"`
	Icon      string `json:"icon"`
	Extension string `json:"extension"`
	PrismClass string `json:"prismClass"`
}

// Phase represents a learning phase (e.g., "Foundations", "Data Structures")
type Phase struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	Slug        string   `json:"slug"`
	Level       string   `json:"level"`
	Description string   `json:"description"`
	Lessons     []Lesson `json:"lessons"`
	XPRequired  int      `json:"xpRequired"`
}

// Lesson represents a single learning topic with paired source/Go code
type Lesson struct {
	ID          int                 `json:"id"`
	Slug        string              `json:"slug"`
	Title       string              `json:"title"`
	PhaseID     int                 `json:"phaseId"`
	Order       int                 `json:"order"`
	NodeCode    string              `json:"nodeCode"`
	GoCode      string              `json:"goCode"`
	SourceCodes map[string]string   `json:"sourceCodes"`
	Explanation string              `json:"explanation"`
	TeacherTips []TeacherTip        `json:"teacherTips"`
	Annotations []Annotation        `json:"annotations"`
	Challenge   Challenge           `json:"challenge"`
	TestCases   []TestCase          `json:"testCases"`
	XPReward    int                 `json:"xpReward"`
	CoinReward  int                 `json:"coinReward"`
	Playable    bool                `json:"playable"`
	// Navigation
	PrevSlug string `json:"prevSlug"`
	NextSlug string `json:"nextSlug"`
	Number   string `json:"number"` // "1.3" = phase 1, lesson 3
}

// TeacherTip is a callout from the teacher pointing out gotchas and key concepts
type TeacherTip struct {
	Type    string `json:"type"`    // gotcha, remember, protip, warning
	Title   string `json:"title"`
	Content string `json:"content"`
}

// Annotation links a line in the source language to a line in Go with explanation text.
// LineNode is kept for backward compatibility (JS). LineSrc is the generic source line.
type Annotation struct {
	LineGo   int    `json:"lineGo"`
	LineNode int    `json:"lineNode"`
	LineSrc  int    `json:"lineSrc"`
	Text     string `json:"text"`
}

// Challenge defines an interactive coding exercise
type Challenge struct {
	Type        string   `json:"type"` // fill_blank, rewrite, fix_bug, build
	Prompt      string   `json:"prompt"`
	StarterCode string   `json:"starterCode"`
	Solution    string   `json:"solution"`
	ExpectedOut string   `json:"expectedOutput"`
	Hints       []string `json:"hints"`
	BonusXP     int      `json:"bonusXP"`
	BonusCoins  int      `json:"bonusCoins"`
}

// TestCase validates user code produces expected output
type TestCase struct {
	Name        string `json:"name"`
	Input       string `json:"input"`
	WrapperCode string `json:"wrapperCode"`
	ExpectedOut string `json:"expectedOutput"`
}

// Curriculum holds the complete learning content
type Curriculum struct {
	Phases []Phase `json:"phases"`
}

// FindLesson looks up a lesson by slug across all phases
func (c *Curriculum) FindLesson(slug string) *Lesson {
	for i := range c.Phases {
		for j := range c.Phases[i].Lessons {
			if c.Phases[i].Lessons[j].Slug == slug {
				return &c.Phases[i].Lessons[j]
			}
		}
	}
	return nil
}

// FindPhaseByLesson returns the phase containing the given lesson slug
func (c *Curriculum) FindPhaseByLesson(slug string) *Phase {
	for i := range c.Phases {
		for _, l := range c.Phases[i].Lessons {
			if l.Slug == slug {
				return &c.Phases[i]
			}
		}
	}
	return nil
}
