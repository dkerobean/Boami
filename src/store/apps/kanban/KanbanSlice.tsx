import axios from '../../../utils/axios';
import { createSlice } from '@reduxjs/toolkit';
import { AppDispatch } from '../../store';
import type { PayloadAction } from '@reduxjs/toolkit';

const BOARDS_API_URL = '/api/productivity/kanban/boards';
const TASKS_API_URL = '/api/productivity/kanban/tasks';
const REORDER_API_URL = '/api/productivity/kanban/tasks/reorder';

export interface KanbanTask {
  _id: string;
  title: string;
  description?: string;
  taskImage?: string;
  date?: string;
  taskProperty?: string;
  boardId: string;
  columnId: string;
  order: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  tasks?: KanbanTask[];
}

export interface KanbanBoard {
  _id: string;
  name: string;
  description?: string;
  columns: KanbanColumn[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Transform database board to legacy format for compatibility
export interface LegacyTodoCategory {
  id: string;
  name: string;
  child: LegacyTodoTask[];
}

export interface LegacyTodoTask {
  id: string;
  task: string;
  taskImage?: string;
  taskText?: string;
  date?: string;
  taskProperty?: string;
  category?: string;
}

interface StateType {
  boards: KanbanBoard[];
  currentBoard: KanbanBoard | null;
  loading: boolean;
  error: string | null;
}

const initialState: StateType = {
  boards: [],
  currentBoard: null,
  loading: false,
  error: null,
};

export const KanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    getBoards: (state, action) => {
      state.boards = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentBoard: (state, action) => {
      state.currentBoard = action.payload;
      state.loading = false;
      state.error = null;
    },
    addBoardSuccess: (state, action) => {
      state.boards.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updateBoardSuccess: (state, action) => {
      const index = state.boards.findIndex((board) => board._id === action.payload._id);
      if (index !== -1) {
        state.boards[index] = action.payload;
      }
      if (state.currentBoard && state.currentBoard._id === action.payload._id) {
        state.currentBoard = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    deleteBoardSuccess: (state, action) => {
      state.boards = state.boards.filter((board) => board._id !== action.payload);
      if (state.currentBoard && state.currentBoard._id === action.payload) {
        state.currentBoard = null;
      }
      state.loading = false;
      state.error = null;
    },
    addTaskSuccess: (state, action) => {
      if (state.currentBoard) {
        const column = state.currentBoard.columns.find(col => col.id === action.payload.columnId);
        if (column) {
          if (!column.tasks) column.tasks = [];
          column.tasks.push(action.payload);
          // Sort tasks by order
          column.tasks.sort((a, b) => a.order - b.order);
        }
      }
      state.loading = false;
      state.error = null;
    },
    updateTaskSuccess: (state, action) => {
      if (state.currentBoard) {
        // Find and update task in current board
        state.currentBoard.columns.forEach(column => {
          if (column.tasks) {
            const taskIndex = column.tasks.findIndex(task => task._id === action.payload._id);
            if (taskIndex !== -1) {
              column.tasks[taskIndex] = action.payload;
            }
          }
        });
      }
      state.loading = false;
      state.error = null;
    },
    deleteTaskSuccess: (state, action) => {
      if (state.currentBoard) {
        state.currentBoard.columns.forEach(column => {
          if (column.tasks) {
            column.tasks = column.tasks.filter(task => task._id !== action.payload);
          }
        });
      }
      state.loading = false;
      state.error = null;
    },
    moveTaskSuccess: (state, action) => {
      // This will be handled by refetching the board data
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  getBoards,
  setCurrentBoard,
  addBoardSuccess,
  updateBoardSuccess,
  deleteBoardSuccess,
  addTaskSuccess,
  updateTaskSuccess,
  deleteTaskSuccess,
  moveTaskSuccess
} = KanbanSlice.actions;

// Helper function to transform database board to legacy format
export const transformBoardToLegacy = (board: KanbanBoard): LegacyTodoCategory[] => {
  return board.columns.map(column => ({
    id: column.id,
    name: column.name,
    child: (column.tasks || []).map(task => ({
      id: task._id,
      task: task.title,
      taskImage: task.taskImage || '',
      taskText: task.description || '',
      date: task.date || '',
      taskProperty: task.taskProperty || '',
      category: column.name
    }))
  }));
};

// Async thunks for API calls
export const fetchBoards = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${BOARDS_API_URL}`);

    if (response.data.success) {
      dispatch(getBoards(response.data.data.boards));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to fetch boards'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to fetch boards'));
  }
};

export const fetchBoardWithTasks = (boardId: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${BOARDS_API_URL}/${boardId}?includeTasks=true`);

    if (response.data.success) {
      dispatch(setCurrentBoard(response.data.data.board));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to fetch board'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to fetch board'));
  }
};

export const createBoard = (boardData: {
  name: string;
  description?: string;
  useDefaults?: boolean;
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.post(`${BOARDS_API_URL}`, boardData);

    if (response.data.success) {
      dispatch(addBoardSuccess(response.data.data.board));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to create board'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to create board'));
  }
};

export const updateBoard = (boardId: string, boardData: {
  name?: string;
  description?: string;
  columns?: KanbanColumn[];
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.put(`${BOARDS_API_URL}/${boardId}`, boardData);

    if (response.data.success) {
      dispatch(updateBoardSuccess(response.data.data.board));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to update board'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to update board'));
  }
};

export const deleteBoard = (boardId: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.delete(`${BOARDS_API_URL}/${boardId}`);

    if (response.data.success) {
      dispatch(deleteBoardSuccess(boardId));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to delete board'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to delete board'));
  }
};

export const createTask = (taskData: {
  title: string;
  description?: string;
  taskImage?: string;
  date?: string;
  taskProperty?: string;
  boardId: string;
  columnId: string;
  order?: number;
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.post(`${TASKS_API_URL}`, taskData);

    if (response.data.success) {
      dispatch(addTaskSuccess(response.data.data.task));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to create task'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to create task'));
  }
};

export const updateTask = (taskId: string, taskData: {
  title?: string;
  description?: string;
  taskImage?: string;
  date?: string;
  taskProperty?: string;
  columnId?: string;
  order?: number;
}) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.put(`${TASKS_API_URL}/${taskId}`, taskData);

    if (response.data.success) {
      dispatch(updateTaskSuccess(response.data.data.task));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to update task'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to update task'));
  }
};

export const deleteTask = (taskId: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.delete(`${TASKS_API_URL}/${taskId}`);

    if (response.data.success) {
      dispatch(deleteTaskSuccess(taskId));
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to delete task'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to delete task'));
  }
};

export const moveTask = (taskId: string, targetColumnId: string, newOrder: number) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.post(`${REORDER_API_URL}`, {
      taskId,
      targetColumnId,
      newOrder
    });

    if (response.data.success) {
      dispatch(moveTaskSuccess(response.data.data.task));
      // Refetch current board to get updated task positions
      // This could be optimized by updating state directly
    } else {
      dispatch(setError(response.data.error?.message || 'Failed to move task'));
    }
  } catch (err: any) {
    dispatch(setError(err.response?.data?.error?.message || err.message || 'Failed to move task'));
  }
};

export default KanbanSlice.reducer;