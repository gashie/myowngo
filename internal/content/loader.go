package content

import (
	"fmt"
	"os"
	"path/filepath"
)

// LoadCurriculum reads all source-language/.go file pairs from examplesDir
// and assembles them into the full Curriculum using CurriculumDef().
func LoadCurriculum(examplesDir string) (*Curriculum, error) {
	defs := CurriculumDef()
	curriculum := &Curriculum{}

	lessonID := 1
	for phaseIdx, phaseDef := range defs {
		phase := Phase{
			ID:          phaseIdx + 1,
			Name:        phaseDef.Name,
			Slug:        phaseDef.Slug,
			Level:       phaseDef.Level,
			Description: phaseDef.Description,
			XPRequired:  phaseDef.XPRequired,
		}

		for orderIdx, lessonDef := range phaseDef.LessonSlugs {
			var goCode []byte
			sourceCodes := map[string]string{}

			if !lessonDef.Project {
				// Read Go code (required)
				goPath := filepath.Join(examplesDir, lessonDef.Slug+".go")
				var err error
				goCode, err = os.ReadFile(goPath)
				if err != nil {
					return nil, fmt.Errorf("reading %s: %w", goPath, err)
				}

				// Read JS code (required — original source)
				jsPath := filepath.Join(examplesDir, lessonDef.Slug+".js")
				jsCode, err := os.ReadFile(jsPath)
				if err != nil {
					return nil, fmt.Errorf("reading %s: %w", jsPath, err)
				}
				sourceCodes["javascript"] = string(jsCode)

				// Read optional source language files (.py, .cs, .java, .php)
				optionalExts := map[string]string{
					"python": ".py",
					"csharp": ".cs",
					"java":   ".java",
					"php":    ".php",
				}
				for langID, ext := range optionalExts {
					langPath := filepath.Join(examplesDir, lessonDef.Slug+ext)
					data, err := os.ReadFile(langPath)
					if err == nil {
						sourceCodes[langID] = string(data)
					}
				}
			}
			// Project-based lessons get their code from GetExplanation/GetChallenge

			lesson := Lesson{
				ID:          lessonID,
				Slug:        lessonDef.Slug,
				Title:       lessonDef.Title,
				PhaseID:     phaseIdx + 1,
				Order:       orderIdx + 1,
				Number:      fmt.Sprintf("%d.%d", phaseIdx+1, orderIdx+1),
				NodeCode:    sourceCodes["javascript"],
				GoCode:      string(goCode),
				SourceCodes: sourceCodes,
				XPReward:    lessonDef.XP,
				CoinReward:  lessonDef.XP / 2,
				Playable:    lessonDef.Playable,
				Explanation: GetExplanation(lessonDef.Slug),
				TeacherTips: GetTeacherTips(lessonDef.Slug),
				Annotations: GetAnnotations(lessonDef.Slug),
				Challenge:   GetChallenge(lessonDef.Slug),
				TestCases:   GetTestCases(lessonDef.Slug),
			}

			phase.Lessons = append(phase.Lessons, lesson)
			lessonID++
		}

		curriculum.Phases = append(curriculum.Phases, phase)
	}

	// Wire up prev/next navigation across all lessons
	allLessons := []*Lesson{}
	for i := range curriculum.Phases {
		for j := range curriculum.Phases[i].Lessons {
			allLessons = append(allLessons, &curriculum.Phases[i].Lessons[j])
		}
	}
	for i, l := range allLessons {
		if i > 0 {
			l.PrevSlug = allLessons[i-1].Slug
		}
		if i < len(allLessons)-1 {
			l.NextSlug = allLessons[i+1].Slug
		}
	}

	return curriculum, nil
}
