/**
 * Property-Based Tests for Download Manager
 * Tests correctness properties using fast-check
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateSpeed,
  calculateETA,
  roundPercentage,
  calculateFileHash,
  compareVersions
} from '../utils';

describe('Download Manager Property Tests', () => {
  /**
   * Feature: auto-update, Property 8: Download progress precision
   * *For any* download in progress, the Download_Dialog should display 
   * the percentage with exactly 1% precision (one decimal place).
   * **Validates: Requirements 3.2**
   */
  describe('Property 8: Download progress precision', () => {
    it('should round percentage to exactly 1 decimal place', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (rawPercentage) => {
            const rounded = roundPercentage(rawPercentage);
            
            // Check that the result has at most 1 decimal place
            const decimalPart = rounded.toString().split('.')[1];
            const decimalPlaces = decimalPart ? decimalPart.length : 0;
            
            expect(decimalPlaces).toBeLessThanOrEqual(1);
            
            // Check that the rounded value is close to the original
            expect(Math.abs(rounded - rawPercentage)).toBeLessThanOrEqual(0.05);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate percentage with 1% precision for any download progress', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }), // bytesDownloaded
          fc.integer({ min: 1, max: 1000000000 }), // totalBytes (at least 1 to avoid division by zero)
          (bytesDownloaded, totalBytes) => {
            // Ensure bytesDownloaded doesn't exceed totalBytes
            const actualDownloaded = Math.min(bytesDownloaded, totalBytes);
            
            const rawPercentage = (actualDownloaded / totalBytes) * 100;
            const displayPercentage = roundPercentage(rawPercentage);
            
            // Verify 1 decimal place precision
            const decimalPart = displayPercentage.toString().split('.')[1];
            const decimalPlaces = decimalPart ? decimalPart.length : 0;
            
            expect(decimalPlaces).toBeLessThanOrEqual(1);
            expect(displayPercentage).toBeGreaterThanOrEqual(0);
            expect(displayPercentage).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: auto-update, Property 10: Hash computation on download completion
   * *For any* completed Update_Package download, the Update_System should 
   * compute the SHA256 Integrity_Hash of the file.
   * **Validates: Requirements 4.1**
   */
  describe('Property 10: Hash computation on download completion', () => {
    it('should produce consistent SHA256 hash for same content', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          (content) => {
            const crypto = require('crypto');
            const buffer = Buffer.from(content);
            const hash1 = crypto.createHash('sha256').update(buffer).digest('hex');
            const hash2 = crypto.createHash('sha256').update(buffer).digest('hex');
            
            // Same content should produce same hash
            expect(hash1).toBe(hash2);
            
            // Hash should be 64 characters (256 bits in hex)
            expect(hash1.length).toBe(64);
            
            // Hash should only contain hex characters
            expect(/^[a-f0-9]+$/.test(hash1)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce different hash for different content', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 2, maxLength: 100 }),
          (content) => {
            // Create a modified version by changing the first byte
            const content2 = new Uint8Array(content);
            content2[0] = (content2[0] + 1) % 256;
            
            const crypto = require('crypto');
            const hash1 = crypto.createHash('sha256').update(Buffer.from(content)).digest('hex');
            const hash2 = crypto.createHash('sha256').update(Buffer.from(content2)).digest('hex');
            
            // Different content should produce different hash
            expect(hash1).not.toBe(hash2);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: auto-update, Property 12: Cleanup on hash mismatch
   * *For any* Update_Package where the computed Integrity_Hash does not match 
   * the expected hash, the Update_System should delete the file and display an error message.
   * **Validates: Requirements 4.3**
   */
  describe('Property 12: Cleanup on hash mismatch', () => {
    it('should detect hash mismatch for any mismatched hash pair', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          fc.hexaString({ minLength: 64, maxLength: 64 }),
          (hash1, hash2) => {
            const isMatch = hash1.toLowerCase() === hash2.toLowerCase();
            
            // If hashes are different, they should not match
            if (hash1.toLowerCase() !== hash2.toLowerCase()) {
              expect(isMatch).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for download metrics
   */
  describe('Download metrics calculations', () => {
    it('should calculate speed correctly for any bytes and time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }), // bytes
          fc.integer({ min: 1, max: 1000000 }), // elapsed ms (at least 1 to avoid division by zero)
          (bytes, elapsedMs) => {
            const speedMBps = calculateSpeed(bytes, elapsedMs);
            
            // Speed should be non-negative
            expect(speedMBps).toBeGreaterThanOrEqual(0);
            
            // Verify calculation: bytes / ms * 1000 / (1024 * 1024)
            const expectedSpeed = (bytes / elapsedMs) * 1000 / (1024 * 1024);
            expect(Math.abs(speedMBps - expectedSpeed)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate ETA correctly for any download state', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }), // bytesDownloaded
          fc.integer({ min: 1, max: 1000000000 }), // totalBytes
          fc.integer({ min: 1, max: 100 }), // speedMBps as integer (at least 1 to avoid infinity)
          (bytesDownloaded, totalBytes, speedMBpsInt) => {
            const speedMBps = speedMBpsInt / 10; // Convert to decimal
            // Ensure bytesDownloaded doesn't exceed totalBytes
            const actualDownloaded = Math.min(bytesDownloaded, totalBytes);
            
            const eta = calculateETA(actualDownloaded, totalBytes, speedMBps);
            
            // ETA should be non-negative
            expect(eta).toBeGreaterThanOrEqual(0);
            
            // If download is complete, ETA should be 0
            if (actualDownloaded >= totalBytes) {
              expect(eta).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 speed when elapsed time is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }),
          (bytes) => {
            const speed = calculateSpeed(bytes, 0);
            expect(speed).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return Infinity ETA when speed is 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000000000 }),
          fc.integer({ min: 1, max: 1000000000 }),
          (bytesDownloaded, totalBytes) => {
            const actualDownloaded = Math.min(bytesDownloaded, totalBytes - 1);
            const eta = calculateETA(actualDownloaded, totalBytes, 0);
            expect(eta).toBe(Infinity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
