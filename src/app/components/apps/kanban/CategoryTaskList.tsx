"use client";
import { SetStateAction, useContext, useEffect, useState } from "react";
import { IconPlus, IconDotsVertical } from "@tabler/icons-react";
import TaskData from "./TaskData";
import EditCategoryModal from "./TaskModal/EditCategoryModal";
import AddNewTaskModal from "./TaskModal/AddNewTaskModal";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { KanbanDataContext } from "@/app/context/kanbancontext/index";
import axios from "@/utils/axios";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";

function CategoryTaskList({ id }: any) {
  const { todoCategories, deleteCategory, clearAllTasks, deleteTodo, addTask, updateTask } =
    useContext(KanbanDataContext);

  const category = todoCategories.find((cat) => cat.id === id) as any;

  const [allTasks, setAllTasks] = useState(category ? category.child : []);
  const [showModal, setShowModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState(category.name);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showContainer, setShowContainer] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Find the category and update tasks
  useEffect(() => {
    const category = todoCategories.find((cat) => cat.id === id);
    if (category) {
      setAllTasks(category.child);
    }
  }, [todoCategories, id]);

  const [newTaskData, setNewTaskData]: any = useState({
    task: "",
    taskText: "",
    taskProperty: "",
    date: new Date().toISOString().split("T")[0],
    imageURL: null,
  });

  //Shows the modal for adding a new task.
  const handleShowModal = () => {
    setShowModal(true);
  };
  // Closes the modal
  const handleCloseModal = (): any => {
    setShowModal(false);
  };
  //  Shows the modal for editing a category.
  const handleShowEditCategoryModal = () => {
    handleClose();
    setShowEditCategoryModal(true);
  };
  //Closes the modal for editing a category.
  const handleCloseEditCategoryModal = () => setShowEditCategoryModal(false);

  //Updates the category name
  const handleUpdateCategory = async (
    updatedName: SetStateAction<string | any>
  ) => {
    try {
      // This functionality will need to be implemented in the context
      // For now, just update the local state
      setNewCategoryName(updatedName);
      console.log("Category name updated locally:", updatedName);
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };
  //Adds a new task to the category.
  const handleAddTask = async () => {
    try {
      await addTask(id, {
        task: newTaskData.task,
        taskText: newTaskData.taskText,
        taskProperty: newTaskData.taskProperty,
        date: newTaskData.date,
        taskImage: newTaskData.imageURL,
      });

      // Reset form data
      setNewTaskData({
        task: "",
        taskText: "",
        taskProperty: "",
        date: new Date().toISOString().split("T")[0],
        imageURL: null,
      });
      handleCloseModal();
      console.log("Task added successfully");
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };
  // Clears all tasks from the current category.
  const handleClearAll = async () => {
    try {
      await clearAllTasks(id);
      console.log("All tasks cleared successfully");
    } catch (error) {
      console.error("Error clearing tasks:", error);
    }
  };
  // Deletes a specific task.
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTodo(taskId);
      console.log("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };
  //Handles the deletion of the current category.
  const handleDeleteClick = async () => {
    try {
      setShowContainer(false);
      await deleteCategory(id);
      console.log("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      setShowContainer(true); // Restore container if deletion fails
    }
  };

  const backgroundColor = category
    ? category.name === "Todo"
      ? "primary.light"
      : category.name === "Progress"
      ? "secondary.light"
      : category.name === "Pending"
      ? "warning.light"
      : category.name === "Done"
      ? "success.light"
      : "primary.light"
    : "primary.light";

  return (
    <>
      <Box width="265px" flexShrink="0px">
        {showContainer && category && (
          <Box px={3} py={2} sx={{ backgroundColor }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" className="fw-semibold">
                {newCategoryName}
              </Typography>
              <Stack direction="row">
                <Box>
                  {category.name === "Todo" && (
                    <>
                      <Tooltip title="Add Task">
                        <IconButton onClick={handleShowModal}>
                          <IconPlus size="1rem" />
                        </IconButton>
                      </Tooltip>
                      <AddNewTaskModal
                        show={showModal}
                        onHide={handleCloseModal}
                        onSave={handleAddTask}
                        newTaskData={newTaskData}
                        setNewTaskData={setNewTaskData}
                        updateTasks={() =>
                          setAllTasks([...allTasks, newTaskData])
                        }
                      />
                    </>
                  )}
                  <EditCategoryModal
                    showModal={showEditCategoryModal}
                    handleCloseModal={handleCloseEditCategoryModal}
                    initialCategoryName={newCategoryName}
                    handleUpdateCategory={handleUpdateCategory}
                  />
                </Box>
                <Tooltip title="Menu">
                  <IconButton onClick={handleClick}>
                    <IconDotsVertical size="1rem" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleShowEditCategoryModal}>
                    Edit
                  </MenuItem>
                  <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                  <MenuItem onClick={handleClearAll}>Clear All</MenuItem>
                </Menu>
              </Stack>
            </Box>
            {allTasks.map((task: { id: any }, index: number) => (
              <TaskData
                key={task.id}
                task={task}
                onDeleteTask={() => handleDeleteTask(task.id)}
                index={index}
              />
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}
export default CategoryTaskList;
