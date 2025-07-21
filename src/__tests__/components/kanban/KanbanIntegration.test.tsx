import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { KanbanDataContextProvider } from '@/app/context/kanbancontext/index';
import TaskManager from '@/app/components/apps/kanban/TaskManager';
import axios from '@/utils/axios';

// Mock axios
jest.mock('@/utils/axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the drag and drop library
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }: any) => <div data-testid="drag-drop-context">{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: jest.fn(), droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: any) => children({ draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() }),
}));

// Mock SimpleBar
jest.mock('simplebar-react', () => {
  return function SimpleBar({ children }: any) {
    return <div data-testid="simplebar">{children}</div>;
  };
});

describe('Kanban Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load boards from database API', async () => {
    // Mock API responses
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          boards: [{
            _id: 'board1',
            name: 'Test Board',
            columns: [
              {
                id: 'col1',
                name: 'Todo',
                order: 0,
                tasks: [
                  {
                    _id: 'task1',
                    title: 'Test Task',
                    description: 'Test Description',
                    taskProperty: 'Design',
                    date: '2024-01-01'
                  }
                ]
              },
              {
                id: 'col2',
                name: 'In Progress',
                order: 1,
                tasks: []
              }
            ]
          }]
        }
      }
    });

    render(
      <KanbanDataContextProvider>
        <TaskManager />
      </KanbanDataContextProvider>
    );

    // Should show loading initially
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should call the boards API with includeTasks=true
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/productivity/kanban/boards?includeTasks=true');

    // Should display the board columns
    await waitFor(() => {
      expect(screen.getByText('Todo')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  it('should create default board when no boards exist', async () => {
    // Mock empty boards response
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          boards: []
        }
      }
    });

    // Mock create default board response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          board: {
            _id: 'new-board',
            name: 'My Board',
            columns: [
              { id: 'col1', name: 'Todo', order: 0 },
              { id: 'col2', name: 'Progress', order: 1 },
              { id: 'col3', name: 'Done', order: 2 }
            ]
          }
        }
      }
    });

    render(
      <KanbanDataContextProvider>
        <TaskManager />
      </KanbanDataContextProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should call create board API when no boards exist
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/productivity/kanban/boards', {
      name: 'My Board',
      useDefaults: true
    });

    // Should display default columns
    await waitFor(() => {
      expect(screen.getByText('Todo')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    mockedAxios.get.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Failed to fetch boards'
          }
        }
      }
    });

    render(
      <KanbanDataContextProvider>
        <TaskManager />
      </KanbanDataContextProvider>
    );

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch boards')).toBeInTheDocument();
    });
  });
});