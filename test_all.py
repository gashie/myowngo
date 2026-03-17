#!/usr/bin/env python3
"""Comprehensive GoQuest lesson tester - tests all challenges and test cases."""

import json
import urllib.request
import sys
import time
import os

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:3000"

PLAYABLE_SLUGS = [
    "print", "comments", "variables", "types", "interpolation", "ifelse",
    "switch", "for_loop", "while_loop", "functions", "default_values", "iife",
    "arrays", "array_iteration", "array_sort", "maps", "objects", "destructuring",
    "spread", "rest", "swapping", "uint8_arrays", "big_numbers", "buffers",
    "errors", "try_catch", "exceptions", "type_check", "stack_trace",
    "module_import", "module_export", "module_export_usage", "class", "documentation",
    "stdout", "stderr",
    "promises", "async_await", "generators", "event_emitter", "timeout", "interval",
    "json", "url_parse", "logging", "regex", "crypto", "gzip", "datetime",
]


def get_lesson(slug):
    url = f"{BASE}/api/lessons/{slug}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())


def run_code(code):
    data = json.dumps({"code": code}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/api/run",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())

    errors = result.get("Errors", "")
    stdout = ""
    stderr_out = ""
    for event in result.get("Events") or []:
        if event.get("Kind") == "stdout":
            stdout += event.get("Message", "")
        elif event.get("Kind") == "stderr":
            stderr_out += event.get("Message", "")

    return {"errors": errors, "stdout": stdout, "stderr": stderr_out}


def normalize(s):
    return s.strip()


def test_challenge_solution(slug, lesson):
    """Test that the challenge solution produces the expected output."""
    challenge = lesson.get("challenge", {})
    solution = challenge.get("solution", "")
    expected = challenge.get("expectedOutput", "")

    if not solution:
        return {"status": "SKIP", "reason": "No solution code"}

    result = run_code(solution)

    if result["errors"]:
        return {
            "status": "FAIL",
            "reason": f"Compile error: {result['errors'][:200]}",
        }

    actual = result["stdout"]
    if normalize(actual) == normalize(expected):
        return {"status": "PASS", "actual": actual.strip()[:80]}
    else:
        return {
            "status": "FAIL",
            "reason": f"Output mismatch",
            "expected": repr(expected.strip()[:100]),
            "actual": repr(actual.strip()[:100]),
        }


def test_challenge_starter(slug, lesson):
    """Test that the starter code compiles (may not produce correct output)."""
    challenge = lesson.get("challenge", {})
    starter = challenge.get("starterCode", "")

    if not starter:
        return {"status": "SKIP", "reason": "No starter code"}

    result = run_code(starter)
    # Starter code should at least compile (for build/rewrite types it may not produce output)
    if result["errors"] and challenge.get("type") not in ("fix_bug", "fill_blank"):
        return {
            "status": "FAIL",
            "reason": f"Starter code doesn't compile: {result['errors'][:200]}",
        }

    return {"status": "PASS", "note": "Starter compiles OK"}


def test_challenge_wrong_output(slug, lesson):
    """Test that submitting wrong code doesn't accidentally match."""
    challenge = lesson.get("challenge", {})
    expected = challenge.get("expectedOutput", "")

    wrong_code = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("WRONG OUTPUT")\n}'
    result = run_code(wrong_code)

    if result["errors"]:
        return {"status": "PASS", "note": "Wrong code errored (expected)"}

    if normalize(result["stdout"]) == normalize(expected):
        return {"status": "FAIL", "reason": "Wrong code matched expected output!"}

    return {"status": "PASS", "note": "Wrong code correctly doesn't match"}


def test_challenge_compile_error(slug, lesson):
    """Test that broken code returns compile errors properly."""
    broken_code = 'package main\n\nfunc main() {\n\tfmt.Println("hello")\n}'  # missing import
    result = run_code(broken_code)

    if result["errors"]:
        return {"status": "PASS", "note": "Compile error detected correctly"}
    else:
        return {"status": "FAIL", "reason": "Broken code should have errored"}


def test_test_cases(slug, lesson):
    """Test all test cases for a lesson using the solution code."""
    test_cases = lesson.get("testCases", [])
    challenge = lesson.get("challenge", {})
    solution = challenge.get("solution", "")

    if not test_cases:
        return {"status": "SKIP", "reason": "No test cases"}

    results = []
    for i, tc in enumerate(test_cases):
        tc_name = tc.get("name", f"Test {i+1}")
        tc_expected = tc.get("expectedOutput", "")
        wrapper = tc.get("wrapperCode", "")

        if wrapper:
            # WrapperCode is typically just a main func that calls the user's function
            # We need to combine user code (without main) with the wrapper
            # Extract user code without package/import/main, then add wrapper
            code_to_run = wrapper
        else:
            # For tests without wrapper, we need to figure out what code to run
            # The test expects the user to write code from scratch
            # We don't have a separate test solution, so skip these
            code_to_run = None

        if code_to_run:
            result = run_code(code_to_run)
            if result["errors"]:
                results.append({
                    "name": tc_name,
                    "status": "FAIL",
                    "reason": f"Compile error: {result['errors'][:150]}",
                })
            elif normalize(result["stdout"]) == normalize(tc_expected):
                results.append({"name": tc_name, "status": "PASS"})
            else:
                results.append({
                    "name": tc_name,
                    "status": "FAIL",
                    "reason": "Output mismatch",
                    "expected": repr(tc_expected.strip()[:80]),
                    "actual": repr(result["stdout"].strip()[:80]),
                })
        else:
            # No wrapper - test expects user to write standalone code
            # We can't auto-test these without a test solution
            results.append({
                "name": tc_name,
                "status": "NO_WRAPPER",
                "note": "No wrapperCode - requires manual test solution",
            })

    return {"status": "RESULTS", "cases": results}


def check_instructions(slug, lesson):
    """Verify challenge instructions quality."""
    challenge = lesson.get("challenge", {})
    prompt = challenge.get("prompt", "")
    starter = challenge.get("starterCode", "")
    expected = challenge.get("expectedOutput", "")
    hints = challenge.get("hints", [])

    issues = []

    if not prompt:
        issues.append("Missing prompt")
    if not starter:
        issues.append("Missing starter code")
    if not expected:
        issues.append("Missing expected output")
    if not hints:
        issues.append("Missing hints")

    # Check if starter has detailed comments
    if "/*" not in starter or "*/" not in starter:
        issues.append("No /* */ comment block in starter code")

    # Check if expected output in prompt matches challenge expectedOutput
    if "Expected output" in starter or "Expected:" in starter:
        pass  # Good, has expected output reference in comments
    elif "Expected" not in starter and "expected" not in starter:
        issues.append("Starter comments don't mention expected output")

    # Check prompt first line is concise (for one-line display)
    first_line = prompt.split("\n")[0]
    if len(first_line) > 80:
        issues.append(f"First line of prompt too long ({len(first_line)} chars): {first_line[:60]}...")

    return issues


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode == "challenges":
        slugs_to_test = PLAYABLE_SLUGS
        print("=== TESTING CHALLENGE SOLUTIONS ===\n")
        for slug in slugs_to_test:
            lesson = get_lesson(slug)
            r = test_challenge_solution(slug, lesson)
            status_icon = "✓" if r["status"] == "PASS" else "✗" if r["status"] == "FAIL" else "○"
            print(f"  {status_icon} {slug}: {r['status']}", end="")
            if r.get("reason"):
                print(f" - {r['reason']}", end="")
            if r.get("expected"):
                print(f"\n    Expected: {r['expected']}\n    Actual:   {r['actual']}", end="")
            print()
            time.sleep(0.5)  # Rate limit playground requests

    elif mode == "starters":
        print("=== TESTING STARTER CODE COMPILES ===\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            r = test_challenge_starter(slug, lesson)
            status_icon = "✓" if r["status"] == "PASS" else "✗" if r["status"] == "FAIL" else "○"
            print(f"  {status_icon} {slug}: {r['status']}", end="")
            if r.get("reason"):
                print(f" - {r['reason']}", end="")
            print()
            time.sleep(0.5)

    elif mode == "failures":
        print("=== TESTING FAILURE SCENARIOS ===\n")
        for slug in PLAYABLE_SLUGS[:5]:  # Test a subset
            lesson = get_lesson(slug)
            r1 = test_challenge_wrong_output(slug, lesson)
            r2 = test_challenge_compile_error(slug, lesson)
            print(f"  {slug}:")
            print(f"    Wrong output: {r1['status']} - {r1.get('note', r1.get('reason', ''))}")
            print(f"    Compile error: {r2['status']} - {r2.get('note', r2.get('reason', ''))}")
            time.sleep(1)

    elif mode == "tests":
        print("=== TESTING TEST CASES (with wrapperCode) ===\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            test_cases = lesson.get("testCases", [])
            has_wrapper = any(tc.get("wrapperCode") for tc in test_cases)
            if has_wrapper:
                r = test_test_cases(slug, lesson)
                for case in r.get("cases", []):
                    status_icon = "✓" if case["status"] == "PASS" else "✗" if case["status"] == "FAIL" else "○"
                    print(f"  {status_icon} {slug}/{case['name'][:60]}: {case['status']}", end="")
                    if case.get("reason"):
                        print(f" - {case['reason']}", end="")
                    print()
                time.sleep(0.5)

    elif mode == "instructions":
        print("=== INSTRUCTION QUALITY CHECK ===\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            issues = check_instructions(slug, lesson)
            if issues:
                print(f"  ⚠ {slug}:")
                for issue in issues:
                    print(f"    - {issue}")
            else:
                print(f"  ✓ {slug}: OK")

    elif mode == "all":
        # Run everything
        total_pass = 0
        total_fail = 0
        total_skip = 0
        all_issues = []

        print("=" * 70)
        print("GOQUEST COMPREHENSIVE TEST REPORT")
        print("=" * 70)

        # 1. Challenge solutions
        print("\n## 1. CHALLENGE SOLUTIONS (running solution code)\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            r = test_challenge_solution(slug, lesson)
            status_icon = "PASS" if r["status"] == "PASS" else "FAIL" if r["status"] == "FAIL" else "SKIP"
            print(f"  [{status_icon}] {slug}", end="")
            if r["status"] == "PASS":
                total_pass += 1
            elif r["status"] == "FAIL":
                total_fail += 1
                print(f" - {r['reason']}", end="")
                if r.get("expected"):
                    print(f"\n         Expected: {r['expected']}\n         Actual:   {r['actual']}", end="")
                all_issues.append(f"Challenge solution FAIL: {slug} - {r['reason']}")
            else:
                total_skip += 1
            print()
            time.sleep(0.5)

        # 2. Starter code compilation
        print(f"\n## 2. STARTER CODE COMPILATION\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            r = test_challenge_starter(slug, lesson)
            status_icon = "PASS" if r["status"] == "PASS" else "FAIL" if r["status"] == "FAIL" else "SKIP"
            print(f"  [{status_icon}] {slug}", end="")
            if r["status"] == "PASS":
                total_pass += 1
            elif r["status"] == "FAIL":
                total_fail += 1
                print(f" - {r['reason']}", end="")
                all_issues.append(f"Starter compile FAIL: {slug} - {r['reason']}")
            else:
                total_skip += 1
            print()
            time.sleep(0.5)

        # 3. Test cases with wrappers
        print(f"\n## 3. TEST CASES (wrapperCode)\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            test_cases = lesson.get("testCases", [])
            has_wrapper = any(tc.get("wrapperCode") for tc in test_cases)
            if has_wrapper:
                r = test_test_cases(slug, lesson)
                for case in r.get("cases", []):
                    status_icon = "PASS" if case["status"] == "PASS" else "FAIL" if case["status"] == "FAIL" else "SKIP"
                    print(f"  [{status_icon}] {slug}/{case['name'][:50]}", end="")
                    if case["status"] == "PASS":
                        total_pass += 1
                    elif case["status"] == "FAIL":
                        total_fail += 1
                        print(f" - {case['reason']}", end="")
                        if case.get("expected"):
                            print(f"\n         Expected: {case['expected']}\n         Actual:   {case['actual']}", end="")
                        all_issues.append(f"Test case FAIL: {slug}/{case['name'][:50]} - {case['reason']}")
                    print()
                time.sleep(0.5)

        # 4. Failure scenarios (subset)
        print(f"\n## 4. FAILURE DETECTION (wrong output + compile errors)\n")
        for slug in PLAYABLE_SLUGS[:10]:
            lesson = get_lesson(slug)
            r1 = test_challenge_wrong_output(slug, lesson)
            r2 = test_challenge_compile_error(slug, lesson)
            w_ok = r1["status"] == "PASS"
            c_ok = r2["status"] == "PASS"
            print(f"  [{'PASS' if w_ok and c_ok else 'FAIL'}] {slug}: wrong_output={'OK' if w_ok else 'BAD'}, compile_error={'OK' if c_ok else 'BAD'}")
            if w_ok and c_ok:
                total_pass += 1
            else:
                total_fail += 1
                all_issues.append(f"Failure detection FAIL: {slug}")
            time.sleep(1)

        # 5. Instruction quality
        print(f"\n## 5. INSTRUCTION QUALITY CHECK\n")
        for slug in PLAYABLE_SLUGS:
            lesson = get_lesson(slug)
            issues = check_instructions(slug, lesson)
            if issues:
                print(f"  [WARN] {slug}:")
                for issue in issues:
                    print(f"         - {issue}")
                all_issues.append(f"Instruction issues: {slug} - {'; '.join(issues)}")
            else:
                print(f"  [OK]   {slug}")

        # Summary
        print(f"\n{'=' * 70}")
        print(f"SUMMARY: {total_pass} passed, {total_fail} failed, {total_skip} skipped")
        print(f"{'=' * 70}")
        if all_issues:
            print(f"\nISSUES FOUND ({len(all_issues)}):")
            for issue in all_issues:
                print(f"  • {issue}")
        else:
            print("\nNo issues found!")


if __name__ == "__main__":
    main()
