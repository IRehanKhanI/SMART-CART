def compare_planogram(expected: list[str], observed: list[str]) -> dict:
    missing = [label for label in expected if label not in observed]
    unexpected = [label for label in observed if label not in expected]
    misplaced = [label for index, label in enumerate(observed[:len(expected)]) if label in expected and expected[index] != label]
    return {"compliant": not missing and not unexpected and not misplaced, "missing": missing, "unexpected": unexpected, "misplaced": misplaced}