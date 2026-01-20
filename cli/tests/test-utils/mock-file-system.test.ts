import { describe, it, expect, beforeEach } from 'vitest';
import { MockFileSystem } from '../../src/test-utils/mock-file-system';

describe('MockFileSystem', () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
  });

  describe('writeFile and readFile', () => {
    it('should write and read string content', async () => {
      // Arrange
      const filePath = '/test/file.txt';
      const content = 'Hello, World!';

      // Act
      await mockFs.writeFile(filePath, content);
      const result = await mockFs.readFile(filePath, 'utf-8');

      // Assert
      expect(result).toBe(content);
    });

    it('should write and read Buffer content', async () => {
      // Arrange
      const filePath = '/test/file.bin';
      const content = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

      // Act
      await mockFs.writeFile(filePath, content);
      const result = await mockFs.readFile(filePath);

      // Assert
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(content);
    });

    it('should create parent directories when writing file', async () => {
      // Arrange
      const filePath = '/deep/nested/dir/file.txt';

      // Act
      await mockFs.writeFile(filePath, 'test');

      // Assert
      expect(await mockFs.exists('/deep')).toBe(true);
      expect(await mockFs.exists('/deep/nested')).toBe(true);
      expect(await mockFs.exists('/deep/nested/dir')).toBe(true);
      expect(mockFs.hasDirectory('/deep/nested/dir')).toBe(true);
    });

    it('should throw ENOENT when reading non-existent file', async () => {
      // Arrange
      const filePath = '/does/not/exist.txt';

      // Act & Assert
      await expect(mockFs.readFile(filePath, 'utf-8')).rejects.toThrow('ENOENT');
    });

    it('should overwrite existing file', async () => {
      // Arrange
      const filePath = '/test/file.txt';
      await mockFs.writeFile(filePath, 'original');

      // Act
      await mockFs.writeFile(filePath, 'updated');
      const result = await mockFs.readFile(filePath, 'utf-8');

      // Assert
      expect(result).toBe('updated');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      // Arrange
      await mockFs.writeFile('/test/file.txt', 'content');

      // Act & Assert
      expect(await mockFs.exists('/test/file.txt')).toBe(true);
    });

    it('should return true for existing directory', async () => {
      // Arrange
      await mockFs.ensureDir('/test/dir');

      // Act & Assert
      expect(await mockFs.exists('/test/dir')).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      // Act & Assert
      expect(await mockFs.exists('/does/not/exist')).toBe(false);
    });

    it('should return true for root directory', async () => {
      // Act & Assert
      expect(await mockFs.exists('/')).toBe(true);
    });
  });

  describe('ensureDir', () => {
    it('should create directory', async () => {
      // Act
      await mockFs.ensureDir('/test/dir');

      // Assert
      expect(await mockFs.exists('/test/dir')).toBe(true);
      expect(mockFs.hasDirectory('/test/dir')).toBe(true);
    });

    it('should create nested directories', async () => {
      // Act
      await mockFs.ensureDir('/a/b/c/d');

      // Assert
      expect(await mockFs.exists('/a')).toBe(true);
      expect(await mockFs.exists('/a/b')).toBe(true);
      expect(await mockFs.exists('/a/b/c')).toBe(true);
      expect(await mockFs.exists('/a/b/c/d')).toBe(true);
    });

    it('should be idempotent', async () => {
      // Act
      await mockFs.ensureDir('/test/dir');
      await mockFs.ensureDir('/test/dir');

      // Assert
      expect(await mockFs.exists('/test/dir')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove file', async () => {
      // Arrange
      await mockFs.writeFile('/test/file.txt', 'content');

      // Act
      await mockFs.remove('/test/file.txt');

      // Assert
      expect(await mockFs.exists('/test/file.txt')).toBe(false);
    });

    it('should remove directory and all contents', async () => {
      // Arrange
      await mockFs.writeFile('/test/dir/file1.txt', 'content1');
      await mockFs.writeFile('/test/dir/file2.txt', 'content2');
      await mockFs.writeFile('/test/dir/subdir/file3.txt', 'content3');

      // Act
      await mockFs.remove('/test/dir');

      // Assert
      expect(await mockFs.exists('/test/dir')).toBe(false);
      expect(await mockFs.exists('/test/dir/file1.txt')).toBe(false);
      expect(await mockFs.exists('/test/dir/file2.txt')).toBe(false);
      expect(await mockFs.exists('/test/dir/subdir')).toBe(false);
      expect(await mockFs.exists('/test/dir/subdir/file3.txt')).toBe(false);
    });

    it('should do nothing when removing non-existent path', async () => {
      // Act & Assert (should not throw)
      await mockFs.remove('/does/not/exist');
    });
  });

  describe('readdir', () => {
    it('should list files in directory', async () => {
      // Arrange
      await mockFs.writeFile('/test/file1.txt', 'content1');
      await mockFs.writeFile('/test/file2.txt', 'content2');

      // Act
      const entries = await mockFs.readdir('/test');

      // Assert
      expect(entries).toEqual(['file1.txt', 'file2.txt']);
    });

    it('should list subdirectories', async () => {
      // Arrange
      await mockFs.ensureDir('/test/dir1');
      await mockFs.ensureDir('/test/dir2');

      // Act
      const entries = await mockFs.readdir('/test');

      // Assert
      expect(entries).toEqual(['dir1', 'dir2']);
    });

    it('should list both files and directories', async () => {
      // Arrange
      await mockFs.writeFile('/test/file.txt', 'content');
      await mockFs.ensureDir('/test/dir');

      // Act
      const entries = await mockFs.readdir('/test');

      // Assert
      expect(entries).toContain('file.txt');
      expect(entries).toContain('dir');
    });

    it('should return sorted entries', async () => {
      // Arrange
      await mockFs.writeFile('/test/zebra.txt', 'content');
      await mockFs.writeFile('/test/alpha.txt', 'content');
      await mockFs.writeFile('/test/beta.txt', 'content');

      // Act
      const entries = await mockFs.readdir('/test');

      // Assert
      expect(entries).toEqual(['alpha.txt', 'beta.txt', 'zebra.txt']);
    });

    it('should throw ENOENT for non-existent directory', async () => {
      // Act & Assert
      await expect(mockFs.readdir('/does/not/exist')).rejects.toThrow('ENOENT');
    });

    it('should not include nested files in immediate listing', async () => {
      // Arrange
      await mockFs.writeFile('/test/file.txt', 'content');
      await mockFs.writeFile('/test/subdir/nested.txt', 'content');

      // Act
      const entries = await mockFs.readdir('/test');

      // Assert
      expect(entries).toEqual(['file.txt', 'subdir']);
      expect(entries).not.toContain('nested.txt');
    });
  });

  describe('helper methods', () => {
    describe('reset', () => {
      it('should clear all files and directories', async () => {
        // Arrange
        await mockFs.writeFile('/test/file.txt', 'content');
        await mockFs.ensureDir('/test/dir');

        // Act
        mockFs.reset();

        // Assert
        expect(await mockFs.exists('/test/file.txt')).toBe(false);
        expect(await mockFs.exists('/test/dir')).toBe(false);
        expect(await mockFs.exists('/')).toBe(true); // Root should still exist
      });
    });

    describe('setFile', () => {
      it('should directly set file content', () => {
        // Act
        mockFs.setFile('/test/file.txt', 'content');

        // Assert
        expect(mockFs.hasFile('/test/file.txt')).toBe(true);
      });

      it('should create parent directories', () => {
        // Act
        mockFs.setFile('/deep/nested/file.txt', 'content');

        // Assert
        expect(mockFs.hasDirectory('/deep')).toBe(true);
        expect(mockFs.hasDirectory('/deep/nested')).toBe(true);
      });
    });

    describe('hasFile', () => {
      it('should return true for existing file', async () => {
        // Arrange
        await mockFs.writeFile('/test/file.txt', 'content');

        // Act & Assert
        expect(mockFs.hasFile('/test/file.txt')).toBe(true);
      });

      it('should return false for non-existent file', () => {
        // Act & Assert
        expect(mockFs.hasFile('/does/not/exist.txt')).toBe(false);
      });

      it('should return false for directory', async () => {
        // Arrange
        await mockFs.ensureDir('/test/dir');

        // Act & Assert
        expect(mockFs.hasFile('/test/dir')).toBe(false);
      });
    });

    describe('hasDirectory', () => {
      it('should return true for existing directory', async () => {
        // Arrange
        await mockFs.ensureDir('/test/dir');

        // Act & Assert
        expect(mockFs.hasDirectory('/test/dir')).toBe(true);
      });

      it('should return false for non-existent directory', () => {
        // Act & Assert
        expect(mockFs.hasDirectory('/does/not/exist')).toBe(false);
      });

      it('should return false for file', async () => {
        // Arrange
        await mockFs.writeFile('/test/file.txt', 'content');

        // Act & Assert
        expect(mockFs.hasDirectory('/test/file.txt')).toBe(false);
      });
    });

    describe('getAllFiles and getAllDirectories', () => {
      it('should return all files', async () => {
        // Arrange
        await mockFs.writeFile('/file1.txt', 'content');
        await mockFs.writeFile('/dir/file2.txt', 'content');

        // Act
        const files = mockFs.getAllFiles();

        // Assert
        expect(files).toContain('/file1.txt');
        expect(files).toContain('/dir/file2.txt');
      });

      it('should return all directories', async () => {
        // Arrange
        await mockFs.ensureDir('/dir1');
        await mockFs.ensureDir('/dir2/subdir');

        // Act
        const dirs = mockFs.getAllDirectories();

        // Assert
        expect(dirs).toContain('/');
        expect(dirs).toContain('/dir1');
        expect(dirs).toContain('/dir2');
        expect(dirs).toContain('/dir2/subdir');
      });
    });
  });

  describe('path normalization', () => {
    it('should normalize paths with backslashes', async () => {
      // Arrange
      const windowsPath = '\\test\\file.txt';
      const unixPath = '/test/file.txt';

      // Act
      await mockFs.writeFile(windowsPath, 'content');
      const result = await mockFs.readFile(unixPath, 'utf-8');

      // Assert
      expect(result).toBe('content');
    });

    it('should handle trailing slashes', async () => {
      // Arrange & Act
      await mockFs.ensureDir('/test/dir/');

      // Assert
      expect(await mockFs.exists('/test/dir')).toBe(true);
      expect(await mockFs.exists('/test/dir/')).toBe(true);
    });

    it('should ensure absolute paths', async () => {
      // Arrange
      const relativePath = 'test/file.txt';

      // Act
      await mockFs.writeFile(relativePath, 'content');

      // Assert
      expect(mockFs.hasFile('/test/file.txt')).toBe(true);
    });
  });
});
