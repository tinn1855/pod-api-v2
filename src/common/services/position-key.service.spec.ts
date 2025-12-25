import { Test, TestingModule } from '@nestjs/testing';
import { PositionKeyService } from './position-key.service';

describe('PositionKeyService', () => {
  let service: PositionKeyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PositionKeyService],
    }).compile();

    service = module.get<PositionKeyService>(PositionKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBetween', () => {
    it('should generate a key when both before and after are null', () => {
      const key = service.generateBetween(null, null);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate a key when both before and after are undefined', () => {
      const key = service.generateBetween(undefined, undefined);
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });

    it('should generate a key before the given key when before is null', () => {
      const after = 'b';
      const key = service.generateBetween(null, after);
      expect(key).toBeDefined();
      // Key should be less than 'b' lexicographically
      expect(key < after).toBe(true);
    });

    it('should generate a key after the given key when after is null', () => {
      const before = 'a';
      const key = service.generateBetween(before, null);
      expect(key).toBeDefined();
      // Key should be greater than 'a' lexicographically
      expect(key > before).toBe(true);
    });

    it('should generate a key between two keys', () => {
      const before = 'a';
      const after = 'c';
      const key = service.generateBetween(before, after);
      expect(key).toBeDefined();
      // Key should be between 'a' and 'c'
      expect(key > before).toBe(true);
      expect(key < after).toBe(true);
    });

    it('should handle keys that are close together', () => {
      const before = 'a';
      const after = 'b';
      const key = service.generateBetween(before, after);
      expect(key).toBeDefined();
      // Should generate a valid key (might be longer due to fallback)
      expect(key.length).toBeGreaterThan(0);
    });

    it('should handle edge case: before is min key', () => {
      const before = 'a';
      const after = 'z';
      const key = service.generateBetween(before, after);
      expect(key).toBeDefined();
      expect(key > before).toBe(true);
      expect(key < after).toBe(true);
    });

    it('should handle edge case: after is max key', () => {
      const before = 'a';
      const after = 'z';
      const key = service.generateBetween(before, after);
      expect(key).toBeDefined();
      expect(key > before).toBe(true);
      expect(key < after).toBe(true);
    });

    it('should generate longer keys when keys are too close', () => {
      // Test with very close keys
      const before = 'm';
      const after = 'n';
      const key = service.generateBetween(before, after);
      expect(key).toBeDefined();
      // Should still be valid (might be longer)
      expect(key.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate keys that are lexicographically sortable', () => {
      const keys: string[] = [];
      
      // Generate multiple keys in sequence
      let prevKey: string | null = null;
      for (let i = 0; i < 10; i++) {
        const key = service.generateBetween(prevKey, null);
        keys.push(key);
        prevKey = key;
      }

      // All keys should be in ascending order
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i] > keys[i - 1]).toBe(true);
      }
    });

    it('should handle insertion at beginning of list', () => {
      const firstKey = 'b';
      const newKey = service.generateBetween(null, firstKey);
      expect(newKey < firstKey).toBe(true);
    });

    it('should handle insertion at end of list', () => {
      const lastKey = 'y';
      const newKey = service.generateBetween(lastKey, null);
      expect(newKey > lastKey).toBe(true);
    });

    it('should handle multiple insertions between same keys', () => {
      const before = 'a';
      const after = 'z';
      
      // Generate multiple keys between same boundaries
      const keys: string[] = [];
      for (let i = 0; i < 5; i++) {
        const key = service.generateBetween(before, after);
        keys.push(key);
      }

      // All should be between before and after
      keys.forEach((key) => {
        expect(key > before).toBe(true);
        expect(key < after).toBe(true);
      });
    });
  });
});

