import { Test, TestingModule } from '@nestjs/testing';
import { FileValidationService } from './file-validation.service';
import { FileType } from '@prisma/client';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidationService],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFileType', () => {
    describe('PSD files', () => {
      it('should validate .psd extension', () => {
        const result = service.validateFileType('.psd');
        expect(result).toBe(FileType.PSD);
      });

      it('should validate .psd with correct mime type', () => {
        const result = service.validateFileType(
          '.psd',
          'image/vnd.adobe.photoshop',
        );
        expect(result).toBe(FileType.PSD);
      });

      it('should validate .psd with alternative mime type', () => {
        const result = service.validateFileType('.psd', 'image/x-photoshop');
        expect(result).toBe(FileType.PSD);
      });

      it('should throw error if mime type does not match extension', () => {
        expect(() => {
          service.validateFileType('.psd', 'image/jpeg');
        }).toThrow('MIME type');
      });
    });

    describe('AI files', () => {
      it('should validate .ai extension', () => {
        const result = service.validateFileType('.ai');
        expect(result).toBe(FileType.AI);
      });

      it('should validate .ai with correct mime type', () => {
        const result = service.validateFileType(
          '.ai',
          'application/postscript',
        );
        expect(result).toBe(FileType.AI);
      });

      it('should validate .ai with alternative mime type', () => {
        const result = service.validateFileType('.ai', 'application/illustrator');
        expect(result).toBe(FileType.AI);
      });

      it('should throw error if mime type does not match extension', () => {
        expect(() => {
          service.validateFileType('.ai', 'image/png');
        }).toThrow('MIME type');
      });
    });

    describe('JPG files', () => {
      it('should validate .jpg extension', () => {
        const result = service.validateFileType('.jpg');
        expect(result).toBe(FileType.JPG);
      });

      it('should validate .jpeg extension', () => {
        const result = service.validateFileType('.jpeg');
        expect(result).toBe(FileType.JPG);
      });

      it('should validate .jpg with correct mime type', () => {
        const result = service.validateFileType('.jpg', 'image/jpeg');
        expect(result).toBe(FileType.JPG);
      });

      it('should validate .jpeg with correct mime type', () => {
        const result = service.validateFileType('.jpeg', 'image/jpeg');
        expect(result).toBe(FileType.JPG);
      });

      it('should throw error if mime type does not match extension', () => {
        expect(() => {
          service.validateFileType('.jpg', 'image/png');
        }).toThrow('MIME type');
      });
    });

    describe('PNG files', () => {
      it('should validate .png extension', () => {
        const result = service.validateFileType('.png');
        expect(result).toBe(FileType.PNG);
      });

      it('should validate .png with correct mime type', () => {
        const result = service.validateFileType('.png', 'image/png');
        expect(result).toBe(FileType.PNG);
      });

      it('should throw error if mime type does not match extension', () => {
        expect(() => {
          service.validateFileType('.png', 'image/jpeg');
        }).toThrow('MIME type');
      });
    });

    describe('SVG files', () => {
      it('should validate .svg extension', () => {
        const result = service.validateFileType('.svg');
        expect(result).toBe(FileType.SVG);
      });

      it('should validate .svg with correct mime type', () => {
        const result = service.validateFileType('.svg', 'image/svg+xml');
        expect(result).toBe(FileType.SVG);
      });

      it('should throw error if mime type does not match extension', () => {
        expect(() => {
          service.validateFileType('.svg', 'image/png');
        }).toThrow('MIME type');
      });
    });

    describe('Extension normalization', () => {
      it('should handle extension without leading dot', () => {
        const result = service.validateFileType('png');
        expect(result).toBe(FileType.PNG);
      });

      it('should handle uppercase extension', () => {
        const result = service.validateFileType('.PNG');
        expect(result).toBe(FileType.PNG);
      });

      it('should handle mixed case extension', () => {
        const result = service.validateFileType('.JpG');
        expect(result).toBe(FileType.JPG);
      });
    });

    describe('MIME type normalization', () => {
      it('should handle mime type with extra whitespace', () => {
        const result = service.validateFileType('.png', '  image/png  ');
        expect(result).toBe(FileType.PNG);
      });

      it('should handle uppercase mime type', () => {
        const result = service.validateFileType('.png', 'IMAGE/PNG');
        expect(result).toBe(FileType.PNG);
      });
    });

    describe('Invalid file types', () => {
      it('should throw error for unsupported extension', () => {
        expect(() => {
          service.validateFileType('.pdf');
        }).toThrow('Invalid file type');
      });

      it('should throw error for .txt extension', () => {
        expect(() => {
          service.validateFileType('.txt');
        }).toThrow('Invalid file type');
      });

      it('should throw error for .doc extension', () => {
        expect(() => {
          service.validateFileType('.doc');
        }).toThrow('Invalid file type');
      });
    });

    describe('Null/undefined mime type', () => {
      it('should validate extension when mime type is null', () => {
        const result = service.validateFileType('.png', null);
        expect(result).toBe(FileType.PNG);
      });

      it('should validate extension when mime type is undefined', () => {
        const result = service.validateFileType('.png', undefined);
        expect(result).toBe(FileType.PNG);
      });
    });
  });

  describe('getAllowedExtensions', () => {
    it('should return all allowed extensions', () => {
      const extensions = service.getAllowedExtensions();
      expect(extensions).toContain('.psd');
      expect(extensions).toContain('.ai');
      expect(extensions).toContain('.jpg');
      expect(extensions).toContain('.jpeg');
      expect(extensions).toContain('.png');
      expect(extensions).toContain('.svg');
    });

    it('should return an array', () => {
      const extensions = service.getAllowedExtensions();
      expect(Array.isArray(extensions)).toBe(true);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should return allowed mime types for PSD', () => {
      const mimeTypes = service.getAllowedMimeTypes(FileType.PSD);
      expect(mimeTypes).toContain('image/vnd.adobe.photoshop');
      expect(mimeTypes).toContain('image/x-photoshop');
    });

    it('should return allowed mime types for JPG', () => {
      const mimeTypes = service.getAllowedMimeTypes(FileType.JPG);
      expect(mimeTypes).toContain('image/jpeg');
    });

    it('should return allowed mime types for PNG', () => {
      const mimeTypes = service.getAllowedMimeTypes(FileType.PNG);
      expect(mimeTypes).toContain('image/png');
    });

    it('should return allowed mime types for SVG', () => {
      const mimeTypes = service.getAllowedMimeTypes(FileType.SVG);
      expect(mimeTypes).toContain('image/svg+xml');
    });

    it('should return allowed mime types for AI', () => {
      const mimeTypes = service.getAllowedMimeTypes(FileType.AI);
      expect(mimeTypes).toContain('application/postscript');
      expect(mimeTypes).toContain('application/illustrator');
    });
  });
});

