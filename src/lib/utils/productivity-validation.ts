/**
 * Client-side validation utilities for productivity features
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Note validation utilities
 */
export class NoteValidator {
  static readonly MAX_TITLE_LENGTH = 200;
  static readonly MAX_CONTENT_LENGTH = 5000;
  static readonly VALID_COLORS = ['info', 'error', 'warning', 'success', 'primary'];

  /**
   * Validates note title
   */
  static validateTitle(title: string): FieldValidationResult {
    if (!title || typeof title !== 'string') {
      return { isValid: false, error: 'Title is required' };
    }

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Title cannot be empty' };
    }

    if (trimmed.length > this.MAX_TITLE_LENGTH) {
      return {
        isValid: false,
        error: `Title cannot exceed ${this.MAX_TITLE_LENGTH} characters`
      };
    }

    if (trimmed.length > this.MAX_TITLE_LENGTH * 0.8) {
      return {
        isValid: true,
        warning: `Title is getting long (${trimmed.length}/${this.MAX_TITLE_LENGTH} characters)`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates note content
   */
  static validateContent(content: string): FieldValidationResult {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Content is required' };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Content cannot be empty' };
    }

    if (trimmed.length > this.MAX_CONTENT_LENGTH) {
      return {
        isValid: false,
        error: `Content cannot exceed ${this.MAX_CONTENT_LENGTH} characters`
      };
    }

    if (trimmed.length > this.MAX_CONTENT_LENGTH * 0.8) {
      return {
        isValid: true,
        warning: `Content is getting long (${trimmed.length}/${this.MAX_CONTENT_LENGTH} characters)`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates note color
   */
  static validateColor(color: string): FieldValidationResult {
    if (!color || typeof color !== 'string') {
      return { isValid: false, error: 'Color is required' };
    }

    if (!this.VALID_COLORS.includes(color)) {
      return {
        isValid: false,
        error: `Color must be one of: ${this.VALID_COLORS.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates complete note data
   */
  static validateNote(noteData: { title?: string; content?: string; color?: string }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const titleResult = this.validateTitle(noteData.title || '');
    if (!titleResult.isValid) {
      errors.push(titleResult.error!);
    } else if (titleResult.warning) {
      warnings.push(titleResult.warning);
    }

    const contentResult = this.validateContent(noteData.content || '');
    if (!contentResult.isValid) {
      errors.push(contentResult.error!);
    } else if (contentResult.warning) {
      warnings.push(contentResult.warning);
    }

    if (noteData.color) {
      const colorResult = this.validateColor(noteData.color);
      if (!colorResult.isValid) {
        errors.push(colorResult.error!);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Calendar event validation utilities
 */
export class CalendarEventValidator {
  static readonly MAX_TITLE_LENGTH = 200;
  static readonly MAX_DESCRIPTION_LENGTH = 1000;
  static readonly MAX_LOCATION_LENGTH = 200;

  /**
   * Validates event title
   */
  static validateTitle(title: string): FieldValidationResult {
    if (!title || typeof title !== 'string') {
      return { isValid: false, error: 'Event title is required' };
    }

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Event title cannot be empty' };
    }

    if (trimmed.length > this.MAX_TITLE_LENGTH) {
      return {
        isValid: false,
        error: `Event title cannot exceed ${this.MAX_TITLE_LENGTH} characters`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates event description
   */
  static validateDescription(description?: string): FieldValidationResult {
    if (description && typeof description === 'string') {
      if (description.length > this.MAX_DESCRIPTION_LENGTH) {
        return {
          isValid: false,
          error: `Description cannot exceed ${this.MAX_DESCRIPTION_LENGTH} characters`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates event location
   */
  static validateLocation(location?: string): FieldValidationResult {
    if (location && typeof location === 'string') {
      if (location.length > this.MAX_LOCATION_LENGTH) {
        return {
          isValid: false,
          error: `Location cannot exceed ${this.MAX_LOCATION_LENGTH} characters`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates event dates
   */
  static validateDates(startDate: Date | string, endDate: Date | string): FieldValidationResult {
    if (!startDate || !endDate) {
      return { isValid: false, error: 'Start date and end date are required' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      return { isValid: false, error: 'Start date is invalid' };
    }

    if (isNaN(end.getTime())) {
      return { isValid: false, error: 'End date is invalid' };
    }

    if (start.getTime() > end.getTime()) {
      return { isValid: false, error: 'Start date must be before end date' };
    }

    // Warning for events longer than 24 hours
    const duration = end.getTime() - start.getTime();
    const hours = duration / (1000 * 60 * 60);
    if (hours > 24) {
      return {
        isValid: true,
        warning: `Event duration is ${Math.round(hours)} hours. Consider splitting into multiple events.`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates complete calendar event data
   */
  static validateEvent(eventData: {
    title?: string;
    description?: string;
    location?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    isAllDay?: boolean;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const titleResult = this.validateTitle(eventData.title || '');
    if (!titleResult.isValid) {
      errors.push(titleResult.error!);
    }

    const descriptionResult = this.validateDescription(eventData.description);
    if (!descriptionResult.isValid) {
      errors.push(descriptionResult.error!);
    }

    const locationResult = this.validateLocation(eventData.location);
    if (!locationResult.isValid) {
      errors.push(locationResult.error!);
    }

    if (eventData.startDate && eventData.endDate) {
      const datesResult = this.validateDates(eventData.startDate, eventData.endDate);
      if (!datesResult.isValid) {
        errors.push(datesResult.error!);
      } else if (datesResult.warning) {
        warnings.push(datesResult.warning);
      }
    } else {
      errors.push('Start date and end date are required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Kanban validation utilities
 */
export class KanbanValidator {
  static readonly MAX_BOARD_NAME_LENGTH = 100;
  static readonly MAX_BOARD_DESCRIPTION_LENGTH = 500;
  static readonly MAX_TASK_TITLE_LENGTH = 200;
  static readonly MAX_TASK_DESCRIPTION_LENGTH = 1000;
  static readonly MAX_COLUMN_NAME_LENGTH = 50;

  /**
   * Validates board name
   */
  static validateBoardName(name: string): FieldValidationResult {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Board name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Board name cannot be empty' };
    }

    if (trimmed.length > this.MAX_BOARD_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Board name cannot exceed ${this.MAX_BOARD_NAME_LENGTH} characters`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates task title
   */
  static validateTaskTitle(title: string): FieldValidationResult {
    if (!title || typeof title !== 'string') {
      return { isValid: false, error: 'Task title is required' };
    }

    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Task title cannot be empty' };
    }

    if (trimmed.length > this.MAX_TASK_TITLE_LENGTH) {
      return {
        isValid: false,
        error: `Task title cannot exceed ${this.MAX_TASK_TITLE_LENGTH} characters`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates task description
   */
  static validateTaskDescription(description?: string): FieldValidationResult {
    if (description && typeof description === 'string') {
      if (description.length > this.MAX_TASK_DESCRIPTION_LENGTH) {
        return {
          isValid: false,
          error: `Task description cannot exceed ${this.MAX_TASK_DESCRIPTION_LENGTH} characters`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates task image URL
   */
  static validateTaskImage(imageUrl?: string): FieldValidationResult {
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      // Allow relative URLs (starting with /) or absolute URLs
      if (!/^(\/|https?:\/\/)/.test(imageUrl.trim())) {
        return {
          isValid: false,
          error: 'Task image must be a valid URL or path'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates column name
   */
  static validateColumnName(name: string): FieldValidationResult {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Column name is required' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: 'Column name cannot be empty' };
    }

    if (trimmed.length > this.MAX_COLUMN_NAME_LENGTH) {
      return {
        isValid: false,
        error: `Column name cannot exceed ${this.MAX_COLUMN_NAME_LENGTH} characters`
      };
    }

    return { isValid: true };
  }

  /**
   * Validates complete task data
   */
  static validateTask(taskData: {
    title?: string;
    description?: string;
    taskImage?: string;
    date?: string;
    taskProperty?: string;
  }): ValidationResult {
    const errors: string[] = [];

    const titleResult = this.validateTaskTitle(taskData.title || '');
    if (!titleResult.isValid) {
      errors.push(titleResult.error!);
    }

    const descriptionResult = this.validateTaskDescription(taskData.description);
    if (!descriptionResult.isValid) {
      errors.push(descriptionResult.error!);
    }

    const imageResult = this.validateTaskImage(taskData.taskImage);
    if (!imageResult.isValid) {
      errors.push(imageResult.error!);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Real-time validation hook for React components
 */
export function useRealTimeValidation<T>(
  data: T,
  validator: (data: T) => ValidationResult,
  debounceMs: number = 300
) {
  const [validationResult, setValidationResult] = React.useState<ValidationResult>({ isValid: true, errors: [] });
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    setIsValidating(true);
    const timeoutId = setTimeout(() => {
      const result = validator(data);
      setValidationResult(result);
      setIsValidating(false);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [data, validator, debounceMs]);

  return { validationResult, isValidating };
}

// Import React for the hook
import React from 'react';