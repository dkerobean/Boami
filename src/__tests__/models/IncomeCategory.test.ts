import { connectDB, disconnectDB } from '@/lib/database/connection';
import IncomeCategory, { IIncomeCategoryDocument } from '@/lib/database/models/IncomeCategory';

describe('IncomeCategory Model', () => {
  const testUserId = 'test-user-123';
  const testUserId2 = 'test-user-456';

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up test data
    await IncomeCategory.deleteMany({
      userId: { $in: [testUserId, testUserId2] }
    });
  });

  describe('Model Creation', () => {
    it('should create a valid income category', async () => {
      const categoryData = {
        name: 'Test Category',
        description: 'Test description',
        userId: testUserId
      };

      const category = new IncomeCategory(categoryData);
      const savedCategory = await category.save();

      expect(savedCategory.name).toBe(categoryData.name);
      expect(savedCategory.description).toBe(categoryData.description);
      expect(savedCategory.userId).toBe(categoryData.userId);
      expect(savedCategory.isDefault).toBe(false);
      expect(savedCategory.createdAt).toBeDefined();
      expect(savedCategory.updatedAt).toBeDefined();
    });

    it('should require name and userId', async () => {
      const category = new IncomeCategory({});

      await expect(category.save()).rejects.toThrow();
    });

    it('should trim whitespace from name', async () => {
      const category = new IncomeCategory({
        name: '  Test Category  ',
        userId: testUserId
      });

      const savedCategory = await category.save();
      expect(savedCategory.name).toBe('Test Category');
    });

    it('should enforce maximum name length', async () => {
      const longName = 'a'.repeat(101);
      const category = new IncomeCategory({
        name: longName,
        userId: testUserId
      });

      await expect(category.save()).rejects.toThrow();
    });
  });

  describe('Uniqueness Constraints', () => {
    it('should enforce unique category names per user', async () => {
      const categoryData = {
        name: 'Duplicate Category',
        userId: testUserId
      };

      // Create first category
      const category1 = new IncomeCategory(categoryData);
      await category1.save();

      // Try to create duplicate
      const category2 = new IncomeCategory(categoryData);
      await expect(category2.save()).rejects.toThrow();
    });

    it('should allow same category name for different users', async () => {
      const categoryName = 'Same Category Name';

      const category1 = new IncomeCategory({
        name: categoryName,
        userId: testUserId
      });

      const category2 = new IncomeCategory({
        name: categoryName,
        userId: testUserId2
      });

      await category1.save();
      await category2.save();

      expect(category1.name).toBe(categoryName);
      expect(category2.name).toBe(categoryName);
      expect(category1.userId).not.toBe(category2.userId);
    });
  });

  describe('Instance Methods', () => {
    it('should check ownership correctly', async () => {
      const category = new IncomeCategory({
        name: 'Test Category',
        userId: testUserId
      });

      await category.save();

      expect(category.isOwnedBy(testUserId)).toBe(true);
      expect(category.isOwnedBy(testUserId2)).toBe(false);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test categories
      await IncomeCategory.create([
        { name: 'User Category 1', userId: testUserId, isDefault: false },
        { name: 'User Category 2', userId: testUserId, isDefault: false },
        { name: 'Other User Category', userId: testUserId2, isDefault: false }
      ]);
    });

    it('should find categories by user', async () => {
      const categories = await IncomeCategory.findByUser(testUserId);

      expect(categories).toHaveLength(2);
      expect(categories.every(cat => cat.userId === testUserId)).toBe(true);
    });

    it('should find user categories only', async () => {
      const categories = await IncomeCategory.findUserCategories(testUserId);

      expect(categories).toHaveLength(2);
      expect(categories.every(cat => cat.userId === testUserId && !cat.isDefault)).toBe(true);
    });

    it('should find category by name and user', async () => {
      const category = await IncomeCategory.findByNameAndUser('User Category 1', testUserId);

      expect(category).toBeTruthy();
      expect(category?.name).toBe('User Category 1');
      expect(category?.userId).toBe(testUserId);
    });

    it('should not find category for different user', async () => {
      const category = await IncomeCategory.findByNameAndUser('User Category 1', testUserId2);

      expect(category).toBeNull();
    });

    it('should create default categories for user', async () => {
      const categories = await IncomeCategory.createDefaultCategories(testUserId2);

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.every(cat => cat.userId === testUserId2)).toBe(true);

      // Verify categories were actually saved
      const savedCategories = await IncomeCategory.findUserCategories(testUserId2);
      expect(savedCategories.length).toBeGreaterThanOrEqual(4); // At least the 4 defaults
    });

    it('should handle duplicate default category creation gracefully', async () => {
      // Create defaults first time
      await IncomeCategory.createDefaultCategories(testUserId);

      // Try to create again - should not throw error
      const categories = await IncomeCategory.createDefaultCategories(testUserId);

      // Should return empty array or handle gracefully
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe('Case Insensitive Name Matching', () => {
    it('should find category with case insensitive search', async () => {
      await IncomeCategory.create({
        name: 'Test Category',
        userId: testUserId
      });

      const category = await IncomeCategory.findByNameAndUser('test category', testUserId);
      expect(category).toBeTruthy();
      expect(category?.name).toBe('Test Category');
    });
  });
});