import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FileSystemService } from '../../src/infrastructure/file-system.service';
import * as retry from '../../src/core/retry';

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  const testDir = path.join(__dirname, '__test-file-system-service__');

  beforeEach(() => {
    fileSystemService = new FileSystemService();
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('readFile', () => {
    it('should read file with default utf-8 encoding', async () => {
      // Arrange
      const testPath = path.join(testDir, 'test-file.txt');
      const testContent = 'test content with üñíçödé';
      fs.writeFileSync(testPath, testContent, 'utf-8');

      // Act
      const result = await fileSystemService.readFile(testPath);

      // Assert
      expect(result).toBe(testContent);
    });

    it('should read file with specified encoding', async () => {
      // Arrange
      const testPath = path.join(testDir, 'ascii-file.txt');
      const testContent = 'ascii content';
      fs.writeFileSync(testPath, testContent, 'ascii');

      // Act
      const result = await fileSystemService.readFile(testPath, 'ascii');

      // Assert
      expect(result).toBe(testContent);
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'retry-test.txt');
      fs.writeFileSync(testPath, 'content');
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.readFile(testPath);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('writeFile', () => {
    it('should write file with string data', async () => {
      // Arrange
      const testPath = path.join(testDir, 'write-string.txt');
      const testData = 'test data with special chars: üñíçödé';

      // Act
      await fileSystemService.writeFile(testPath, testData);

      // Assert
      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toBe(testData);
    });

    it('should write file with buffer data', async () => {
      // Arrange
      const testPath = path.join(testDir, 'write-buffer.bin');
      const testData = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

      // Act
      await fileSystemService.writeFile(testPath, testData);

      // Assert
      const content = fs.readFileSync(testPath);
      expect(content).toEqual(testData);
    });

    it('should write file with options', async () => {
      // Arrange
      const testPath = path.join(testDir, 'write-with-options.txt');
      const testData = 'test data';
      const options = { encoding: 'utf-8' as BufferEncoding, mode: 0o644 };

      // Act
      await fileSystemService.writeFile(testPath, testData, options);

      // Assert
      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toBe(testData);
      const stats = fs.statSync(testPath);
      expect(stats.mode & 0o777).toBe(0o644);
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'write-retry.txt');
      const testData = 'content';
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.writeFile(testPath, testData);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      const testPath = path.join(testDir, 'existing-file.txt');
      fs.writeFileSync(testPath, 'content');

      // Act
      const result = await fileSystemService.exists(testPath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when directory exists', async () => {
      // Arrange
      const testPath = path.join(testDir, 'existing-dir');
      fs.ensureDirSync(testPath);

      // Act
      const result = await fileSystemService.exists(testPath);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when path does not exist', async () => {
      // Arrange
      const testPath = path.join(testDir, 'nonexistent.txt');

      // Act
      const result = await fileSystemService.exists(testPath);

      // Assert
      expect(result).toBe(false);
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'retry-exists.txt');
      fs.writeFileSync(testPath, 'content');
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.exists(testPath);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      // Arrange
      const testPath = path.join(testDir, 'new-dir');

      // Act
      await fileSystemService.ensureDir(testPath);

      // Assert
      expect(fs.existsSync(testPath)).toBe(true);
      expect(fs.statSync(testPath).isDirectory()).toBe(true);
    });

    it('should create nested directories', async () => {
      // Arrange
      const testPath = path.join(testDir, 'level1', 'level2', 'level3');

      // Act
      await fileSystemService.ensureDir(testPath);

      // Assert
      expect(fs.existsSync(testPath)).toBe(true);
      expect(fs.statSync(testPath).isDirectory()).toBe(true);
    });

    it('should not fail if directory already exists', async () => {
      // Arrange
      const testPath = path.join(testDir, 'existing-dir');
      fs.ensureDirSync(testPath);

      // Act & Assert - should not throw
      await expect(fileSystemService.ensureDir(testPath)).resolves.toBeUndefined();
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'retry-dir');
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.ensureDir(testPath);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should remove file', async () => {
      // Arrange
      const testPath = path.join(testDir, 'file-to-remove.txt');
      fs.writeFileSync(testPath, 'content');
      expect(fs.existsSync(testPath)).toBe(true);

      // Act
      await fileSystemService.remove(testPath);

      // Assert
      expect(fs.existsSync(testPath)).toBe(false);
    });

    it('should remove directory recursively', async () => {
      // Arrange
      const testPath = path.join(testDir, 'dir-to-remove');
      const nestedFile = path.join(testPath, 'nested', 'file.txt');
      fs.ensureDirSync(path.dirname(nestedFile));
      fs.writeFileSync(nestedFile, 'content');
      expect(fs.existsSync(testPath)).toBe(true);

      // Act
      await fileSystemService.remove(testPath);

      // Assert
      expect(fs.existsSync(testPath)).toBe(false);
    });

    it('should not fail when removing non-existent path', async () => {
      // Arrange
      const testPath = path.join(testDir, 'nonexistent-file.txt');

      // Act & Assert - should not throw
      await expect(fileSystemService.remove(testPath)).resolves.toBeUndefined();
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'retry-remove.txt');
      fs.writeFileSync(testPath, 'content');
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.remove(testPath);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });

  describe('readdir', () => {
    it('should read directory contents', async () => {
      // Arrange
      const testPath = path.join(testDir, 'read-dir');
      fs.ensureDirSync(testPath);
      fs.writeFileSync(path.join(testPath, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(testPath, 'file2.txt'), 'content2');
      fs.ensureDirSync(path.join(testPath, 'subdir'));

      // Act
      const result = await fileSystemService.readdir(testPath);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
      expect(result).toContain('subdir');
    });

    it('should return empty array for empty directory', async () => {
      // Arrange
      const testPath = path.join(testDir, 'empty-dir');
      fs.ensureDirSync(testPath);

      // Act
      const result = await fileSystemService.readdir(testPath);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return files in consistent order', async () => {
      // Arrange
      const testPath = path.join(testDir, 'ordered-dir');
      fs.ensureDirSync(testPath);
      fs.writeFileSync(path.join(testPath, 'a.txt'), 'content');
      fs.writeFileSync(path.join(testPath, 'b.txt'), 'content');
      fs.writeFileSync(path.join(testPath, 'c.txt'), 'content');

      // Act
      const result1 = await fileSystemService.readdir(testPath);
      const result2 = await fileSystemService.readdir(testPath);

      // Assert - should return same order
      expect(result1).toEqual(result2);
    });

    it('should use withRetry for retryable errors', async () => {
      // Arrange
      const testPath = path.join(testDir, 'retry-readdir');
      fs.ensureDirSync(testPath);
      fs.writeFileSync(path.join(testPath, 'file.txt'), 'content');
      const withRetrySpy = vi.spyOn(retry, 'withRetry');

      // Act
      await fileSystemService.readdir(testPath);

      // Assert
      expect(withRetrySpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
        })
      );

      withRetrySpy.mockRestore();
    });
  });
});
