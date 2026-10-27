import { test } from '@playwright/test';

// Features the suite already covers but that have not landed yet. Each value is
// the reason shown on the fixme'd test; set it to null once the feature lands.
// QA_RUN_PENDING=1 runs every pending test anyway, to see which pass today.

export type PendingFeature =
  | 'mobileMenu'
  | 'worldHud'
  | 'exhibitPanel'
  | 'worldContextLoss'
  | 'engineeringGallery'
  | 'engineeringCaseStudy'
  | 'creativeGallery'
  | 'creativeCaseStudy'
  | 'notFoundPage';

export const PENDING: Record<PendingFeature, string | null> = {
  // All landed as of Phase 1 (verified with QA_RUN_PENDING=1). Put a reason
  // back here to fixme a test while its feature is reworked.
  mobileMenu: null,
  worldHud: null,
  exhibitPanel: null,
  worldContextLoss: null,
  engineeringGallery: null,
  engineeringCaseStudy: null,
  creativeGallery: null,
  creativeCaseStudy: null,
  notFoundPage: null,
};

/** Marks the current test fixme while any of the given features is pending. Call it first in the test body. */
export function pending(...features: PendingFeature[]): void {
  const reasons = features.map((feature) => PENDING[feature]).filter((reason): reason is string => Boolean(reason));
  test.fixme(reasons.length > 0 && !process.env.QA_RUN_PENDING, reasons.join(' | '));
}
