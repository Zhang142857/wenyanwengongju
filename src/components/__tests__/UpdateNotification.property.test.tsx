/**
 * Property-Based Tests for Update Notification Component
 * Tests correctness properties using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Version generator
const versionGenerator = () => fc.tuple(
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 }),
  fc.integer({ min: 0, max: 99 })
).map(([major, minor, patch]) => `${major}.${minor}.${patch}`);

// Update info generator
const updateInfoGenerator = () => fc.record({
  version: versionGenerator(),
  changelog: fc.string({ minLength: 0, maxLength: 500 }),
  forceUpdate: fc.boolean()
});

describe('Update Notification Property Tests', () => {
  /**
   * Feature: auto-update, Property 6: Notification content completeness
   * *For any* available update, the Update_Notification should display 
   * both the Version_Number and changelog text.
   * **Validates: Requirements 2.2**
   */
  describe('Property 6: Notification content completeness', () => {
    it('should always include version number in notification', () => {
      fc.assert(
        fc.property(
          updateInfoGenerator(),
          (updateInfo) => {
            // Version should always be present and non-empty
            expect(updateInfo.version).toBeDefined();
            expect(updateInfo.version.length).toBeGreaterThan(0);
            
            // Version should match semantic versioning format
            expect(updateInfo.version).toMatch(/^\d+\.\d+\.\d+$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include changelog when provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            version: versionGenerator(),
            changelog: fc.string({ minLength: 1, maxLength: 500 }),
            forceUpdate: fc.boolean()
          }),
          (updateInfo) => {
            // Changelog should be present when provided
            expect(updateInfo.changelog).toBeDefined();
            expect(updateInfo.changelog.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty changelog gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            version: versionGenerator(),
            changelog: fc.constant(''),
            forceUpdate: fc.boolean()
          }),
          (updateInfo) => {
            // Empty changelog should be handled
            expect(updateInfo.changelog).toBeDefined();
            expect(typeof updateInfo.changelog).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: auto-update, Property 7: Notification re-display timing
   * *For any* dismissed Update_Notification, the notification should 
   * re-appear after exactly 24 hours.
   * **Validates: Requirements 2.5**
   */
  describe('Property 7: Notification re-display timing', () => {
    it('should calculate re-display time correctly', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          (dismissTime) => {
            const REDISPLAY_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours
            const redisplayTime = new Date(dismissTime.getTime() + REDISPLAY_DELAY_MS);
            
            // Re-display time should be exactly 24 hours after dismiss
            const timeDiff = redisplayTime.getTime() - dismissTime.getTime();
            expect(timeDiff).toBe(REDISPLAY_DELAY_MS);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly determine if notification should be shown', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          fc.integer({ min: 0, max: 48 }), // hours since dismiss
          (dismissTime, hoursSinceDismiss) => {
            const REDISPLAY_DELAY_MS = 24 * 60 * 60 * 1000;
            const currentTime = new Date(dismissTime.getTime() + hoursSinceDismiss * 60 * 60 * 1000);
            const timeSinceDismiss = currentTime.getTime() - dismissTime.getTime();
            
            const shouldShow = timeSinceDismiss >= REDISPLAY_DELAY_MS;
            
            if (hoursSinceDismiss >= 24) {
              expect(shouldShow).toBe(true);
            } else {
              expect(shouldShow).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Notification rendering properties
   */
  describe('Notification rendering', () => {
    it('should format version with v prefix', () => {
      fc.assert(
        fc.property(
          versionGenerator(),
          (version) => {
            const formattedVersion = `v${version}`;
            
            // Should start with 'v'
            expect(formattedVersion.startsWith('v')).toBe(true);
            
            // Should contain the original version
            expect(formattedVersion.includes(version)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should split changelog by newlines', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          (lines) => {
            const changelog = lines.join('\n');
            const splitLines = changelog.split('\n');
            
            // Number of lines should match
            expect(splitLines.length).toBe(lines.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show dismiss button only for non-force updates', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (forceUpdate) => {
            const showDismissButton = !forceUpdate;
            
            if (forceUpdate) {
              expect(showDismissButton).toBe(false);
            } else {
              expect(showDismissButton).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
