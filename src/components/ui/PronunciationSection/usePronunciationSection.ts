// usePronunciationSection: utility for non-linear Azure score mapping

/**
 * Maps an Azure pronunciation score (0-100) to a display score (1-10).
 * Uses a non-linear scale so that intelligible accents score 7-8/10,
 * not the harsh 5-6/10 Azure raw scores suggest.
 *
 * Mapping:
 *   Azure 0-40   -> Display 1-3
 *   Azure 40-60  -> Display 3-5
 *   Azure 60-80  -> Display 6-8
 *   Azure 80-100 -> Display 8-10
 */
export function mapAzureScoreToDisplay(azureScore: number): number {
  const clamped = Math.max(0, Math.min(100, azureScore));

  if (clamped <= 40) {
    const mapped = 1 + (clamped / 40) * 2;
    return Math.round(mapped * 10) / 10;
  }

  if (clamped <= 60) {
    const mapped = 3 + ((clamped - 40) / 20) * 2;
    return Math.round(mapped * 10) / 10;
  }

  if (clamped <= 80) {
    const mapped = 6 + ((clamped - 60) / 20) * 2;
    return Math.round(mapped * 10) / 10;
  }

  const mapped = 8 + ((clamped - 80) / 20) * 2;
  return Math.round(mapped * 10) / 10;
}
