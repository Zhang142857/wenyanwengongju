/**
 * Mock Update Service for Testing
 * Simulates the update service API for integration tests
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { UpdateInfo } from '../types';

export interface MockServiceConfig {
  port?: number;
  latency?: number;
  failureRate?: number;
  version?: string;
  changelog?: string;
  forceUpdate?: boolean;
}

export class MockUpdateService {
  private server: http.Server | null = null;
  private config: Required<MockServiceConfig>;
  private packagePath: string | null = null;
  private packageHash: string | null = null;

  constructor(config: MockServiceConfig = {}) {
    this.config = {
      port: config.port || 3456,
      latency: config.latency || 0,
      failureRate: config.failureRate || 0,
      version: config.version || '2.0.0',
      changelog: config.changelog || '- Bug fixes\n- Performance improvements',
      forceUpdate: config.forceUpdate || false
    };
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);
      
      this.server.listen(this.config.port, () => {
        console.log(`Mock Update Service running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Set a mock update package
   */
  async setPackage(packagePath: string): Promise<void> {
    this.packagePath = packagePath;
    
    // Calculate hash
    const content = await fs.promises.readFile(packagePath);
    this.packageHash = crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a mock update package
   */
  async createMockPackage(tempDir: string): Promise<string> {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // Add some mock files
    zip.addFile('app.exe', Buffer.from('mock executable content'));
    zip.addFile('resources/app.asar', Buffer.from('mock asar content'));
    zip.addFile('version.txt', Buffer.from(this.config.version));
    
    const packagePath = path.join(tempDir, `update-${this.config.version}.zip`);
    zip.writeZip(packagePath);
    
    await this.setPackage(packagePath);
    return packagePath;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MockServiceConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get the service URL
   */
  getUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Handle incoming requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Simulate latency
    setTimeout(() => {
      // Simulate random failures
      if (Math.random() < this.config.failureRate) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${this.config.port}`);
      
      if (url.pathname === '/api/check') {
        this.handleCheckUpdate(req, res);
      } else if (url.pathname === '/api/download') {
        this.handleDownload(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    }, this.config.latency);
  }

  /**
   * Handle update check request
   */
  private handleCheckUpdate(req: http.IncomingMessage, res: http.ServerResponse): void {
    const packageSize = this.packagePath 
      ? fs.statSync(this.packagePath).size 
      : 1024 * 1024; // 1MB default

    const updateInfo: UpdateInfo = {
      version: this.config.version,
      downloadUrl: `${this.getUrl()}/api/download`,
      fileHash: this.packageHash || 'mock-hash',
      changelog: this.config.changelog,
      forceUpdate: this.config.forceUpdate,
      packageSize
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(updateInfo));
  }

  /**
   * Handle download request
   */
  private handleDownload(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (!this.packagePath || !fs.existsSync(this.packagePath)) {
      res.writeHead(404);
      res.end('Package not found');
      return;
    }

    const stat = fs.statSync(this.packagePath);
    
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Length': stat.size
    });

    const stream = fs.createReadStream(this.packagePath);
    stream.pipe(res);
  }
}

/**
 * Create and start a mock update service
 */
export async function createMockService(config?: MockServiceConfig): Promise<MockUpdateService> {
  const service = new MockUpdateService(config);
  await service.start();
  return service;
}
