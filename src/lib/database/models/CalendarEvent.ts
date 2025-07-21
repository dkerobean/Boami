import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Calendar Event interface for productivity system
 * Manages user calendar events with date validation and location support
 */
export interface ICalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  color?: string;
  location?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Calendar Event document interface extending Mongoose Document
 */
export interface ICalendarEventDocument extends ICalendarEvent, Document {
  isOwnedBy(userId: string): boolean;
  getDuration(): number;
  isUpcoming(): boolean;
  isPast(): boolean;
  isToday(): boolean;
  overlaps(otherEvent: ICalendarEventDocument): boolean;
}

/**
 * Calendar Event model interface with static methods
 */
export interface ICalendarEventModel extends Model<ICalendarEventDocument> {
  findByUser(userId: string): Promise<ICalendarEventDocument[]>;
  findByDateRange(startDate: Date, endDate: Date, userId: string): Promise<ICalendarEventDocument[]>;
  findUpcoming(userId: string, limit?: number): Promise<ICalendarEventDocument[]>;
  findToday(userId: string): Promise<ICalendarEventDocument[]>;
  findByMonth(year: number, month: number, userId: string): Promise<ICalendarEventDocument[]>;
  searchEvents(query: string, userId: string): Promise<ICalendarEventDocument[]>;
  getTotalByUser(userId: string): Promise<number>;
}

/**
 * Calendar Event schema definition with validation and middleware
 */
const calendarEventSchema = new Schema<ICalendarEventDocument, ICalendarEventModel>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [1, 'Title must be at least 1 character']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: null
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(value: Date) {
        return value instanceof Date && !isNaN(value.getTime());
      },
      message: 'Start date must be a valid date'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: ICalendarEventDocument, value: Date) {
        if (!(value instanceof Date) || isNaN(value.getTime())) {
          return false;
        }
        // End date must be after or equal to start date
        return value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  isAllDay: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#1976d2',
    validate: {
      validator: function(value: string) {
        // Validate hex color format
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
      },
      message: 'Color must be a valid hex color (e.g., #1976d2)'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
    default: null
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  }
});

// Indexes for better query performance
calendarEventSchema.index({ userId: 1, startDate: 1 });
calendarEventSchema.index({ userId: 1, endDate: 1 });
calendarEventSchema.index({ userId: 1, startDate: 1, endDate: 1 });
calendarEventSchema.index({ userId: 1, createdAt: -1 });

// Text index for search functionality
calendarEventSchema.index({
  title: 'text',
  description: 'text',
  location: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    location: 3
  }
});

/**
 * Pre-save middleware for data validation and formatting
 */
calendarEventSchema.pre('save', function(next) {
  // Trim whitespace from string fields
  if (this.title) {
    this.title = this.title.trim();
  }
  if (this.description) {
    this.description = this.description.trim();
  }
  if (this.location) {
    this.location = this.location.trim();
  }

  // For all-day events, normalize times to start/end of day
  if (this.isAllDay) {
    const startDate = new Date(this.startDate);
    startDate.setHours(0, 0, 0, 0);
    this.startDate = startDate;

    const endDate = new Date(this.endDate);
    endDate.setHours(23, 59, 59, 999);
    this.endDate = endDate;
  }

  next();
});

/**
 * Instance method to check ownership
 */
calendarEventSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId === userId;
};

/**
 * Instance method to get event duration in minutes
 */
calendarEventSchema.methods.getDuration = function(): number {
  return Math.floor((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60));
};

/**
 * Instance method to check if event is upcoming
 */
calendarEventSchema.methods.isUpcoming = function(): boolean {
  return this.startDate > new Date();
};

/**
 * Instance method to check if event is in the past
 */
calendarEventSchema.methods.isPast = function(): boolean {
  return this.endDate < new Date();
};

/**
 * Instance method to check if event is today
 */
calendarEventSchema.methods.isToday = function(): boolean {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  return (this.startDate >= startOfDay && this.startDate <= endOfDay) ||
         (this.endDate >= startOfDay && this.endDate <= endOfDay) ||
         (this.startDate <= startOfDay && this.endDate >= endOfDay);
};

/**
 * Instance method to check if this event overlaps with another event
 */
calendarEventSchema.methods.overlaps = function(otherEvent: ICalendarEventDocument): boolean {
  return this.startDate < otherEvent.endDate && this.endDate > otherEvent.startDate;
};

/**
 * Static method to find events by user
 */
calendarEventSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId: userId }).sort({ startDate: 1 });
};

/**
 * Static method to find events by date range
 */
calendarEventSchema.statics.findByDateRange = function(startDate: Date, endDate: Date, userId: string) {
  return this.find({
    userId: userId,
    $or: [
      // Events that start within the range
      { startDate: { $gte: startDate, $lte: endDate } },
      // Events that end within the range
      { endDate: { $gte: startDate, $lte: endDate } },
      // Events that span the entire range
      { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
    ]
  }).sort({ startDate: 1 });
};

/**
 * Static method to find upcoming events
 */
calendarEventSchema.statics.findUpcoming = function(userId: string, limit: number = 10) {
  const now = new Date();
  return this.find({
    userId: userId,
    startDate: { $gt: now }
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

/**
 * Static method to find today's events
 */
calendarEventSchema.statics.findToday = function(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  return this.find({
    userId: userId,
    $or: [
      // Events that start today
      { startDate: { $gte: startOfDay, $lte: endOfDay } },
      // Events that end today
      { endDate: { $gte: startOfDay, $lte: endOfDay } },
      // Events that span today
      { startDate: { $lte: startOfDay }, endDate: { $gte: endOfDay } }
    ]
  }).sort({ startDate: 1 });
};

/**
 * Static method to find events by month
 */
calendarEventSchema.statics.findByMonth = function(year: number, month: number, userId: string) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  return this.findByDateRange(startOfMonth, endOfMonth, userId);
};

/**
 * Static method to search events by text
 */
calendarEventSchema.statics.searchEvents = function(query: string, userId: string) {
  return this.find({
    $and: [
      { userId: userId },
      {
        $text: { $search: query }
      }
    ]
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    startDate: 1
  });
};

/**
 * Static method to get total count of events by user
 */
calendarEventSchema.statics.getTotalByUser = async function(userId: string): Promise<number> {
  return this.countDocuments({ userId: userId });
};

// Prevent model re-compilation during development
const CalendarEvent = (mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEventDocument, ICalendarEventModel>('CalendarEvent', calendarEventSchema)) as ICalendarEventModel;

export default CalendarEvent;
export { CalendarEvent };