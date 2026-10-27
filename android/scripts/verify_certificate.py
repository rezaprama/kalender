"""Validate a successful apksigner report against the pinned publisher certificate."""

import pathlib
import re
import sys


def verify(report: str, expected: str) -> None:
    expected = expected.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{64}", expected):
        raise ValueError("Publisher fingerprint must be a full SHA-256 digest")
    if re.findall(r"(?m)^Number of signers:\s*(\d+)\s*$", report) != ["1"]:
        raise ValueError("Exactly one publisher signer is required")
    certificates = re.findall(
        r"(?m)^.*\bcertificate SHA-256 digest:\s*([0-9a-fA-F]{64})\s*$", report
    )
    if not certificates or {value.lower() for value in certificates} != {expected}:
        raise ValueError("APK publisher certificate does not match the pinned identity")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Expected apksigner report path and publisher SHA-256")
    verify(pathlib.Path(sys.argv[1]).read_text(), sys.argv[2])
