import {
  NoteValidator,
  CalendarEventValidator,
  KanbanValidator,
  ValidationResult,
  FieldValidationResult
} from '@/lib/utils/productivity-validation';

describe('NoteValidator', () => {
  describe('validateTitle', () => {
    it('should pass for valid title', () => {
      const result = NoteValidator.validateTitle('Valid Title');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty title', () => {
      const result = NoteValidator.validateTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });

    it('should fail for whitespace-only title', () => {
      const result = NoteValidator.validateTitle('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title cannot be empty');
    });

    it('should fail for title exceeding max length', () => {
      const longTitle = 'a'.repeat(NoteValidator.MAX_TITLE_LENGTH + 1);
      const result = NoteValidator.validateTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should warn for title approaching max length', () => {
      const longTitle = 'a'.repeat(Math.floor(NoteValidator.MAX_TITLE_LENGTH * 0.9));
      const result = NoteValidator.validateTitle(longTitle);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('getting long');
    });

    it('should fail for non-string title', () => {
      const result = NoteValidator.validateTitle(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Title is required');
    });
  });

  describe('validateContent', () => {
    it('should pass for valid content', () => {
      const result = NoteValidator.validateContent('Valid content');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty content', () => {
      const result = NoteValidator.validateContent('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Content is required');
    });

    it('should fail for content exceeding max length', () => {
      const longContent = 'a'.repeat(NoteValidator.MAX_CONTENT_LENGTH + 1);
      const result = NoteValidator.validateContent(longContent);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });

    it('should warn for content approaching max length', () => {
      const longContent = 'a'.repeat(Math.floor(NoteValidator.MAX_CONTENT_LENGTH * 0.9));
      const result = NoteValidator.validateContent(longContent);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('getting long');
    });
  });

  describe('validateColor', () => {
    it('should pass for valid color', () => {
      const result = NoteValidator.validateColor('info');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for invalid color', () => {
      const result = NoteValidator.validateColor('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('should fail for empty color', () => {
      const result = NoteValidator.validateColor('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Color is required');
    });
  });

  describe('validateNote', () => {
    it('should pass for valid note data', () => {
      const noteData = {
        title: 'Valid Title',
        content: 'Valid content',
        color: 'info'
      };
      const result = NoteValidator.validateNote(noteData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const noteData = {
        title: '',
        content: '',
        color: 'invalid'
      };
      const result = NoteValidator.validateNote(noteData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should collect warnings', () => {
      const noteData = {
        title: 'a'.repeat(Math.floor(NoteValidator.MAX_TITLE_LENGTH * 0.9)),
        content: 'a'.repeat(Math.floor(NoteValidator.MAX_CONTENT_LENGTH * 0.9)),
        color: 'info'
      };
      const result = NoteValidator.validateNote(noteData);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
    });
  });
});

describe('CalendarEventValidator', () => {
  describe('validateTitle', () => {
    it('should pass for valid title', () => {
      const result = CalendarEventValidator.validateTitle('Valid Event Title');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty title', () => {
      const result = CalendarEventValidator.validateTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Event title is required');
    });

    it('should fail for title exceeding max length', () => {
      const longTitle = 'a'.repeat(CalendarEventValidator.MAX_TITLE_LENGTH + 1);
      const result = CalendarEventValidator.validateTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validateDescription', () => {
    it('should pass for valid description', () => {
      const result = CalendarEventValidator.validateDescription('Valid description');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for undefined description', () => {
      const result = CalendarEventValidator.validateDescription(undefined);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for description exceeding max length', () => {
      const longDescription = 'a'.repeat(CalendarEventValidator.MAX_DESCRIPTION_LENGTH + 1);
      const result = CalendarEventValidator.validateDescription(longDescription);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validateDates', () => {
    it('should pass for valid date range', () => {
      const startDate = new Date('2024-01-01T10:00:00');
      const endDate = new Date('2024-01-01T11:00:00');
      const result = CalendarEventValidator.validateDates(startDate, endDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when start date is after end date', () => {
      const startDate = new Date('2024-01-01T11:00:00');
      const endDate = new Date('2024-01-01T10:00:00');
      const result = CalendarEventValidator.validateDates(startDate, endDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date must be before end date');
    });

    it('should fail for invalid start date', () => {
      const result = CalendarEventValidator.validateDates('invalid-date', new Date());
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date is invalid');
    });

    it('should fail for invalid end date', () => {
      const result = CalendarEventValidator.validateDates(new Date(), 'invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('End date is invalid');
    });

    it('should warn for events longer than 24 hours', () => {
      const startDate = new Date('2024-01-01T10:00:00');
      const endDate = new Date('2024-01-03T10:00:00'); // 48 hours later
      const result = CalendarEventValidator.validateDates(startDate, endDate);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('Event duration is');
    });

    it('should fail for missing dates', () => {
      const result = CalendarEventValidator.validateDates(null as any, null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date and end date are required');
    });
  });

  describe('validateEvent', () => {
    it('should pass for valid event data', () => {
      const eventData = {
        title: 'Valid Event',
        description: 'Valid description',
        location: 'Valid location',
        startDate: new Date('2024-01-01T10:00:00'),
        endDate: new Date('2024-01-01T11:00:00'),
        isAllDay: false
      };
      const result = CalendarEventValidator.validateEvent(eventData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const eventData = {
        title: '',
        description: 'a'.repeat(CalendarEventValidator.MAX_DESCRIPTION_LENGTH + 1),
        startDate: 'invalid-date',
        endDate: new Date()
      };
      const result = CalendarEventValidator.validateEvent(eventData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('KanbanValidator', () => {
  describe('validateBoardName', () => {
    it('should pass for valid board name', () => {
      const result = KanbanValidator.validateBoardName('Valid Board Name');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty board name', () => {
      const result = KanbanValidator.validateBoardName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Board name is required');
    });

    it('should fail for board name exceeding max length', () => {
      const longName = 'a'.repeat(KanbanValidator.MAX_BOARD_NAME_LENGTH + 1);
      const result = KanbanValidator.validateBoardName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validateTaskTitle', () => {
    it('should pass for valid task title', () => {
      const result = KanbanValidator.validateTaskTitle('Valid Task Title');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty task title', () => {
      const result = KanbanValidator.validateTaskTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Task title is required');
    });

    it('should fail for task title exceeding max length', () => {
      const longTitle = 'a'.repeat(KanbanValidator.MAX_TASK_TITLE_LENGTH + 1);
      const result = KanbanValidator.validateTaskTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validateTaskImage', () => {
    it('should pass for valid HTTP URL', () => {
      const result = KanbanValidator.validateTaskImage('https://example.com/image.jpg');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for valid relative URL', () => {
      const result = KanbanValidator.validateTaskImage('/images/task.jpg');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for empty image URL', () => {
      const result = KanbanValidator.validateTaskImage('');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass for undefined image URL', () => {
      const result = KanbanValidator.validateTaskImage(undefined);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for invalid URL format', () => {
      const result = KanbanValidator.validateTaskImage('invalid-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Task image must be a valid URL or path');
    });
  });

  describe('validateColumnName', () => {
    it('should pass for valid column name', () => {
      const result = KanbanValidator.validateColumnName('Valid Column');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail for empty column name', () => {
      const result = KanbanValidator.validateColumnName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Column name is required');
    });

    it('should fail for column name exceeding max length', () => {
      const longName = 'a'.repeat(KanbanValidator.MAX_COLUMN_NAME_LENGTH + 1);
      const result = KanbanValidator.validateColumnName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validateTask', () => {
    it('should pass for valid task data', () => {
      const taskData = {
        title: 'Valid Task',
        description: 'Valid description',
        taskImage: 'https://example.com/image.jpg',
        date: '2024-01-01',
        taskProperty: 'Design'
      };
      const result = KanbanValidator.validateTask(taskData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect multiple errors', () => {
      const taskData = {
        title: '',
        description: 'a'.repeat(KanbanValidator.MAX_TASK_DESCRIPTION_LENGTH + 1),
        taskImage: 'invalid-url'
      };
      const result = KanbanValidator.validateTask(taskData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass with minimal valid data', () => {
      const taskData = {
        title: 'Valid Task'
      };
      const result = KanbanValidator.validateTask(taskData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});