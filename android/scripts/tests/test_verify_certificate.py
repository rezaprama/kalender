import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("publisher_certificate", ROOT / "verify_certificate.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
REPORT = (ROOT / "tests/fixtures/apksigner-v3.txt").read_text()
# Pin the recorded fixture, independently of the real publisher key used by a fork.
EXPECTED = "fb7daf4717aafe6c605b8138ca95f21bc0eb49aab51e52607f91254cb16dd890"


class PublisherCertificateTest(unittest.TestCase):
    def test_real_v3_report_and_legacy_label(self):
        MODULE.verify(REPORT, EXPECTED)
        MODULE.verify(REPORT.replace("V3.0 Signer:", "Signer #1"), EXPECTED.upper())

    def test_wrong_publisher_is_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.verify(REPORT, "0" * 64)

    def test_additional_certificate_is_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.verify(REPORT + "\nSigner #2 certificate SHA-256 digest: " + "0" * 64, EXPECTED)

    def test_missing_digest_or_multiple_signers_is_rejected(self):
        for report in ("Number of signers: 1\n", REPORT.replace("Number of signers: 1", "Number of signers: 2")):
            with self.assertRaises(ValueError):
                MODULE.verify(report, EXPECTED)

    def test_partial_fingerprint_is_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.verify(REPORT, EXPECTED[:16])


if __name__ == "__main__":
    unittest.main()
