import { Injectable, BadRequestException } from '@nestjs/common';
import { FileType } from '@prisma/client';

/**
 * Service for validating file types based on extension and mime type
 * Supports: PSD, AI, JPG, PNG, SVG
 */
@Injectable()
export class FileValidationService {
  private readonly ALLOWED_EXTENSIONS = {
    PSD: ['.psd'],
    AI: ['.ai'],
    JPG: ['.jpg', '.jpeg'],
    PNG: ['.png'],
    SVG: ['.svg'],
  } as const;

  private readonly ALLOWED_MIME_TYPES = {
    PSD: ['image/vnd.adobe.photoshop', 'image/x-photoshop'],
    AI: ['application/postscript', 'application/illustrator'],
    JPG: ['image/jpeg'],
    PNG: ['image/png'],
    SVG: ['image/svg+xml'],
  } as const;

  /**
   * Validate file type based on extension and optionally mime type
   * @param extension - File extension (e.g., '.jpg', '.png')
   * @param mimeType - Optional MIME type (e.g., 'image/jpeg')
   * @returns FileType enum value if valid
   * @throws BadRequestException if file type is invalid
   */
  validateFileType(
    extension: string,
    mimeType?: string | null,
  ): FileType {
    // Normalize extension (ensure it starts with .)
    const normalizedExt = extension.startsWith('.')
      ? extension.toLowerCase()
      : '.' + extension.toLowerCase();

    // Find file type by extension
    const fileTypeByExt = this.getFileTypeByExtension(normalizedExt);

    if (!fileTypeByExt) {
      throw new BadRequestException(
        `Invalid file type. Allowed extensions: ${Object.values(this.ALLOWED_EXTENSIONS).flat().join(', ')}`,
      );
    }

    // If mime type is provided, validate it matches the extension
    if (mimeType) {
      const normalizedMime = mimeType.toLowerCase().trim();
      const isValidMime = this.isValidMimeType(normalizedMime, fileTypeByExt);

      if (!isValidMime) {
        throw new BadRequestException(
          `MIME type '${mimeType}' does not match file extension '${extension}'. Expected MIME types for ${fileTypeByExt}: ${this.ALLOWED_MIME_TYPES[fileTypeByExt].join(', ')}`,
        );
      }
    }

    return fileTypeByExt;
  }

  /**
   * Get file type from extension
   */
  private getFileTypeByExtension(extension: string): FileType | null {
    for (const [fileType, extensions] of Object.entries(
      this.ALLOWED_EXTENSIONS,
    )) {
      if ((extensions as readonly string[]).includes(extension)) {
        return fileType as FileType;
      }
    }
    return null;
  }

  /**
   * Check if mime type is valid for the given file type
   */
  private isValidMimeType(mimeType: string, fileType: FileType): boolean {
    const allowedMimes = this.ALLOWED_MIME_TYPES[fileType];
    return allowedMimes.some((allowed) => mimeType === allowed);
  }

  /**
   * Get allowed extensions as a flat array
   */
  getAllowedExtensions(): string[] {
    return Object.values(this.ALLOWED_EXTENSIONS).flat();
  }

  /**
   * Get allowed MIME types for a specific file type
   */
  getAllowedMimeTypes(fileType: FileType): string[] {
    return [...this.ALLOWED_MIME_TYPES[fileType]];
  }
}

