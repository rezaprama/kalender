/*
 * Data derived from the Hong Kong Observatory "Gregorian-Lunar Calendar Conversion
 * Tables" 1901-2100 (https://www.hko.gov.hk), retrieved 2026-10-21.
 *
 * This file is NOT licensed under Apache-2.0 or CC BY 4.0. Intellectual property
 * rights in the Materials are owned by the Government of the Hong Kong Special
 * Administrative Region. The Materials are part of the website https://www.hko.gov.hk,
 * published by the Hong Kong Observatory. Use is limited to non-commercial purposes
 * on a free-of-charge basis under the HKO conditions reproduced in
 * third_party/hko/NOTICE.md, including its Disclaimer. Commercial use requires prior
 * written authorisation from the Hong Kong Observatory; otherwise replace this table.
 */

/** 1 bit per month after the first (1 = 30 days, 0 = 29), hex nibbles MSB first. FNV-1a: f468db94. */
export const MONTH_LENGTHS_HEX =
  '52ba95d49ba4db2ad5556a9ad4aea57526e93749754b6a9ad52da95b49ba4bd25d92da95b52b6a56d2ae92f49764b6a5752b6a56b4ada4dd25d92dc95d4ada55aaab5556c9764b725752b6956cab5555aa6d52da95d4aea55d2ad555aaab54b6a5752ba93749b6556aaad52da95d4ada4dd26e92ea96d52daa5b52b6937497a4bb25b52b6a56d2ada55d25e92ec96d4aea56b2ad655b49b64bb25b52ba95b4ab5556aaad92ec96e4aea56d2ad555aaab54baa5b52ba95d49ba55aaab5536a96d4aea4ed26e936a9ad535aa5b52ba95b49ba4bd25d52daa5ad2b6a56d26e92f49754b6a56d2ada55b49ba4bd25d92da95d4ad5556caae92ec9764b6a5752b6956aaad54daa5d52da95d4ada55aaab5556a9754b6a57527693729b5556aa6d52da95d49da2dd26d52daa6b52b6a5752768b745764baa4';
/** Indices (into the month list starting at 1900-12-22 = 0) of leap months. */
export const LEAP_MONTH_INDICES = [31, 67, 102, 131, 167, 201, 231, 266, 302, 337, 366, 402, 437, 466, 502, 537, 572, 602, 637, 672, 702, 737, 772, 808, 837, 872, 908, 937, 972, 1007, 1038, 1071, 1107, 1142, 1172, 1206, 1242, 1277, 1307, 1342, 1378, 1408, 1442, 1477, 1512, 1541, 1577, 1612, 1645, 1677, 1713, 1747, 1777, 1812, 1847, 1877, 1912, 1947, 1983, 2012, 2047, 2083, 2112, 2147, 2182, 2218, 2247, 2282, 2318, 2347, 2382, 2417, 2452];

/** Terms that apply to any record derived from the HKO table (they override CC BY 4.0). */
export const HKO_RIGHTS = 'Derived from Hong Kong Observatory data: non-commercial use only, rights held by the Government of the Hong Kong SAR. Not covered by Apache-2.0 or CC BY 4.0. See https://github.com/rezaprama/kalender/blob/main/third_party/hko/NOTICE.md';

export const HKO_ATTRIBUTION = {
  owner: 'Government of the Hong Kong Special Administrative Region',
  source: 'Hong Kong Observatory, https://www.hko.gov.hk',
  notice: 'https://github.com/rezaprama/kalender/blob/main/third_party/hko/NOTICE.md',
  disclaimer: 'Chinese calendar dates are derived from data made available on the websites of the Hong Kong Observatory (https://www.hko.gov.hk). This does not constitute any co-operation or affiliation with, or endorsement by, the Observatory, which accepts no liability for the use of this information.',
} as const;
