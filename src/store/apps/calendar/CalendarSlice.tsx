import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from '../../store';
import type { PayloadAction } from '@reduxjs/toolkit';

const API_URL = '/api/productivity/calendar/events';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color?: string;
  location?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Transform database event to react-big-calendar format
export interface CalendarEventDisplay {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  description?: string;
  location?: string;
}

interface StateType {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
}

const initialState: StateType = {
  events: [],
  loading: false,
  error: null,
};

export const CalendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    getEvents: (state, action) => {
      state.events = action.payload;
      state.loading = false;
      state.error = null;
    },
    addEventSuccess: (state, action) => {
      state.events.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updateEventSuccess: (state, action) => {
      const index = state.events.findIndex((event) => event._id === action.payload._id);
      if (index !== -1) {
        state.events[index] = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    deleteEventSuccess: (state, action) => {
      state.events = state.events.filter((event) => event._id !== action.payload);
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  getEvents,
  addEventSuccess,
  updateEventSuccess,
  deleteEventSuccess
} = CalendarSlice.actions;

// Helper function to transform database events to display format
export const transformEventsForDisplay = (events: CalendarEvent[]): CalendarEventDisplay[] => {
  return events.map(event => ({
    id: event._id,
    title: event.title,
    start: new Date(event.startDate),
    end: new Date(event.endDate),
    allDay: event.isAllDay,
    color: event.color || '#1976d2',
    description: event.description,
    location: event.location
  }));
};

// Helper function to map color names to hex values
const colorMap: { [key: string]: string } = {
  'default': '#1976d2',
  'green': '#39b69a',
  'red': '#fc4b6c',
  'azure': '#615dff',
  'warning': '#fdd43f',
  'primary': '#1976d2',
  'info': '#1976d2',
  'success': '#39b69a',
  'error': '#fc4b6c'
};

const getColorHex = (colorName: string): string => {
  return colorMap[colorName] || colorName;
};

// Async thunks for API calls
export const fetchEvents = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${API_URL}`);

    if (response.data.success) {
      dispatch(getEvents(response.data.data.events));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to fetch events'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to fetch events'));
  }
};

export const addEvent = (eventData: {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  color?: string;
  location?: string;
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.post(`${API_URL}`, {
      ...eventData,
      color: getColorHex(eventData.color || 'default')
    });

    if (response.data.success) {
      dispatch(addEventSuccess(response.data.data.event));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to create event'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to create event'));
  }
};

export const updateEvent = (id: string, eventData: {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  isAllDay?: boolean;
  color?: string;
  location?: string;
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const updateData = { ...eventData };
    if (updateData.color) {
      updateData.color = getColorHex(updateData.color);
    }

    const response = await axios.put(`${API_URL}/${id}`, updateData);

    if (response.data.success) {
      dispatch(updateEventSuccess(response.data.data.event));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to update event'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to update event'));
  }
};

export const deleteEvent = (id: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.delete(`${API_URL}/${id}`);

    if (response.data.success) {
      dispatch(deleteEventSuccess(id));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to delete event'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to delete event'));
  }
};

export default CalendarSlice.reducer;