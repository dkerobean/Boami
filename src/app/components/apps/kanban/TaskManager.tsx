"use client";
import { useContext } from "react";
import KanbanHeader from "./KanbanHeader";
import { KanbanDataContext } from "@/app/context/kanbancontext/index";
import CategoryTaskList from "./CategoryTaskList";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import SimpleBar from "simplebar-react";
import { Box, CircularProgress, Alert } from "@mui/material";

function TaskManager() {
  const { todoCategories, moveTask, loading, error } = useContext(KanbanDataContext);

  const onDragEnd = async (result: { source: any; destination: any; draggableId: any; }) => {
    const { source, destination, draggableId } = result;

    // If no destination is provided or the drop is in the same place, do nothing
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    // Extract necessary information from the result
    const sourceCategoryId = source.droppableId;
    const destinationCategoryId = destination.droppableId;
    const sourceIndex = source.index;
    const destinationIndex = destination.index;

    // Call moveTask function from context (now async)
    await moveTask(draggableId, sourceCategoryId, destinationCategoryId, sourceIndex, destinationIndex);
  };

  if (loading) {
    return (
      <>
        <KanbanHeader />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <KanbanHeader />
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <SimpleBar>
        <DragDropContext onDragEnd={onDragEnd}>
          <Box display="flex" gap={2}>
            {todoCategories.map((category) => (
              <Droppable droppableId={category.id.toString()} key={category.id}>
                {(provided: any) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    <CategoryTaskList id={category.id} />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </Box>
        </DragDropContext>
      </SimpleBar>
    </>
  );
}

export default TaskManager;




