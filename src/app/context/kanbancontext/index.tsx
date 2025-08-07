"use client"
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import axios from '@/utils/axios';
import { TodoCategory, TodoTask } from '@/app/(dashboard)/types/apps/kanban';

interface KanbanDataContextProps {
    children: ReactNode;
}

interface KanbanContextType {
    todoCategories: TodoCategory[];
    loading: boolean;
    error: string | null;
    addCategory: (categoryName: string) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
    clearAllTasks: (categoryId: string) => Promise<void>;
    deleteTodo: (taskId: string) => Promise<void>;
    addTask: (categoryId: string, taskData: Partial<TodoTask>) => Promise<void>;
    updateTask: (taskId: string, taskData: Partial<TodoTask>) => Promise<void>;
    setError: (errorMessage: string | null) => void;
    moveTask: (
        taskId: string,
        sourceCategoryId: string,
        destinationCategoryId: string,
        sourceIndex: number,
        destinationIndex: number
    ) => Promise<void>;
    refreshData: () => Promise<void>;
}

export const KanbanDataContext = createContext<KanbanContextType>({} as KanbanContextType);

export const KanbanDataContextProvider: React.FC<KanbanDataContextProps> = ({ children }) => {
    const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

    // Transform database board data to match existing UI expectations
    const transformBoardToCategories = (board: any): TodoCategory[] => {
        if (!board || !board.columns) return [];

        return board.columns.map((column: any) => ({
            id: column.id,
            name: column.name,
            child: (column.tasks || []).map((task: any) => ({
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

    // Fetch kanban data from the database API
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // First, get boards
            const boardsResponse = await axios.get('/api/productivity/kanban/boards?includeTasks=true');

            if (!boardsResponse.data.success) {
                throw new Error(boardsResponse.data.error?.message || 'Failed to fetch boards');
            }

            const boards = boardsResponse.data.data.boards;

            if (boards.length === 0) {
                // Create a default board if none exists
                const defaultBoardResponse = await axios.post('/api/productivity/kanban/boards', {
                    name: 'My Board',
                    useDefaults: true
                });

                if (defaultBoardResponse.data.success) {
                    const newBoard = defaultBoardResponse.data.data.board;
                    setCurrentBoardId(newBoard._id);
                    setTodoCategories(transformBoardToCategories(newBoard));
                } else {
                    throw new Error('Failed to create default board');
                }
            } else {
                // Use the first board for now (in the future, we can add board selection)
                const firstBoard = boards[0];
                setCurrentBoardId(firstBoard._id);
                setTodoCategories(transformBoardToCategories(firstBoard));
            }

        } catch (error: any) {
            console.error('Kanban fetch error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to load kanban data');
        } finally {
            setLoading(false);
        }
    };

    // Refresh data
    const refreshData = async () => {
        await fetchData();
    };

    // Initial data fetch
    useEffect(() => {
        fetchData();
    }, []);

    const handleError = (errorMessage: string) => {
        setError(errorMessage);
        console.error('Kanban error:', errorMessage);
    };

    // Move task between columns with API persistence
    const moveTask = async (
        taskId: string,
        sourceCategoryId: string,
        destinationCategoryId: string,
        sourceIndex: number,
        destinationIndex: number
    ) => {
        try {
            // Optimistic update
            setTodoCategories((prevCategories) => {
                const sourceCategoryIndex = prevCategories.findIndex(cat => cat.id === sourceCategoryId);
                const destinationCategoryIndex = prevCategories.findIndex(cat => cat.id === destinationCategoryId);

                if (sourceCategoryIndex === -1 || destinationCategoryIndex === -1) {
                    return prevCategories;
                }

                const updatedCategories = [...prevCategories];
                const sourceCategory = { ...updatedCategories[sourceCategoryIndex] };
                const destinationCategory = { ...updatedCategories[destinationCategoryIndex] };

                // Remove the task from the source category
                const taskToMove = sourceCategory.child.splice(sourceIndex, 1)[0];

                // Insert the task into the destination category at the specified index
                destinationCategory.child.splice(destinationIndex, 0, taskToMove);

                // Update the categories in the state
                updatedCategories[sourceCategoryIndex] = sourceCategory;
                updatedCategories[destinationCategoryIndex] = destinationCategory;

                return updatedCategories;
            });

            // Persist to database
            const response = await axios.post('/api/productivity/kanban/tasks/reorder', {
                taskId: taskId,
                targetColumnId: destinationCategoryId,
                newOrder: destinationIndex
            });

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to move task');
            }

            setError(null);
        } catch (error: any) {
            console.error('Move task error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to move task');
            // Revert optimistic update by refreshing data
            await refreshData();
        }
    };

    // Add new category (column)
    const addCategory = async (categoryName: string) => {
        try {
            if (!currentBoardId) {
                throw new Error('No board selected');
            }

            // Get current board
            const boardResponse = await axios.get(`/api/productivity/kanban/boards/${currentBoardId}`);
            if (!boardResponse.data.success) {
                throw new Error('Failed to get current board');
            }

            const currentBoard = boardResponse.data.data.board;
            const newColumns = [...currentBoard.columns, {
                id: Date.now().toString(),
                name: categoryName,
                order: currentBoard.columns.length
            }];

            // Update board with new column
            const response = await axios.put(`/api/productivity/kanban/boards/${currentBoardId}`, {
                columns: newColumns
            });

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to add category');
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Add category error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to add category');
        }
    };

    // Delete category (column)
    const deleteCategory = async (categoryId: string) => {
        try {
            if (!currentBoardId) {
                throw new Error('No board selected');
            }

            // Get current board
            const boardResponse = await axios.get(`/api/productivity/kanban/boards/${currentBoardId}`);
            if (!boardResponse.data.success) {
                throw new Error('Failed to get current board');
            }

            const currentBoard = boardResponse.data.data.board;
            const updatedColumns = currentBoard.columns.filter((col: any) => col.id !== categoryId);

            // Update board without the deleted column
            const response = await axios.put(`/api/productivity/kanban/boards/${currentBoardId}`, {
                columns: updatedColumns
            });

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to delete category');
            }

            // Also delete all tasks in this column
            const tasksResponse = await axios.get(`/api/productivity/kanban/tasks?boardId=${currentBoardId}&columnId=${categoryId}`);
            if (tasksResponse.data.success) {
                const tasks = tasksResponse.data.data.tasks;
                for (const task of tasks) {
                    await axios.delete(`/api/productivity/kanban/tasks/${task._id}`);
                }
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Delete category error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to delete category');
        }
    };

    // Clear all tasks from a category
    const clearAllTasks = async (categoryId: string) => {
        try {
            if (!currentBoardId) {
                throw new Error('No board selected');
            }

            // Get all tasks in this column
            const tasksResponse = await axios.get(`/api/productivity/kanban/tasks?boardId=${currentBoardId}&columnId=${categoryId}`);

            if (tasksResponse.data.success) {
                const tasks = tasksResponse.data.data.tasks;

                // Delete all tasks
                for (const task of tasks) {
                    await axios.delete(`/api/productivity/kanban/tasks/${task._id}`);
                }
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Clear tasks error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to clear tasks');
        }
    };

    // Delete a specific task
    const deleteTodo = async (taskId: string) => {
        try {
            const response = await axios.delete(`/api/productivity/kanban/tasks/${taskId}`);

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to delete task');
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Delete task error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to delete task');
        }
    };

    // Add new task
    const addTask = async (categoryId: string, taskData: Partial<TodoTask>) => {
        try {
            if (!currentBoardId) {
                throw new Error('No board selected');
            }

            const response = await axios.post('/api/productivity/kanban/tasks', {
                title: taskData.task || 'New Task',
                description: taskData.taskText || '',
                taskImage: taskData.taskImage || '',
                date: taskData.date || '',
                taskProperty: taskData.taskProperty || '',
                boardId: currentBoardId,
                columnId: categoryId
            });

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to add task');
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Add task error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to add task');
        }
    };

    // Update existing task
    const updateTask = async (taskId: string, taskData: Partial<TodoTask>) => {
        try {
            const response = await axios.put(`/api/productivity/kanban/tasks/${taskId}`, {
                title: taskData.task,
                description: taskData.taskText,
                taskImage: taskData.taskImage,
                date: taskData.date,
                taskProperty: taskData.taskProperty
            });

            if (!response.data.success) {
                throw new Error(response.data.error?.message || 'Failed to update task');
            }

            // Refresh data to get updated board
            await refreshData();
            setError(null);
        } catch (error: any) {
            console.error('Update task error:', error);
            handleError(error.response?.data?.error?.message || error.message || 'Failed to update task');
        }
    };

    return (
        <KanbanDataContext.Provider value={{
            todoCategories,
            loading,
            error,
            addCategory,
            deleteCategory,
            clearAllTasks,
            deleteTodo,
            addTask,
            updateTask,
            setError,
            moveTask,
            refreshData
        }}>
            {children}
        </KanbanDataContext.Provider>
    );
};




