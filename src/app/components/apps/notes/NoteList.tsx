import React, { useEffect } from "react";
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSelector, useDispatch } from "@/store/hooks";
import Scrollbar from "../../custom-scroll/Scrollbar";
import {
  fetchNotes,
  SelectNote,
  deleteNote,
  SearchNotes,
} from "@/store/apps/notes/NotesSlice";
import { IconTrash } from "@tabler/icons-react";
import { NotesType } from '../../../(DashboardLayout)/types/apps/notes';

const NoteList = () => {
  const dispatch = useDispatch();
  const activeNote = useSelector((state) => state.notesReducer.notesContent);
  const searchTerm = useSelector((state) => state.notesReducer.noteSearch);
  const loading = useSelector((state) => state.notesReducer.loading);
  const error = useSelector((state) => state.notesReducer.error);

  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  const filterNotes = (notes: NotesType[], nSearch: string) => {
    if (nSearch !== "")
      return notes.filter(
        (note: NotesType) =>
          !note.isDeleted &&
          note.title
            .toLowerCase()
            .includes(nSearch.toLowerCase())
      );

    return notes.filter((note) => !note.isDeleted);
  };

  const notes = useSelector((state) =>
    filterNotes(state.notesReducer.notes, state.notesReducer.noteSearch)
  );
  return (
    <>
      <Box p={3} px={2}>
        <TextField
          id="search"
          value={searchTerm}
          placeholder="Search Notes"
          inputProps={{ "aria-label": "Search Notes" }}
          size="small"
          type="search"
          variant="outlined"
          fullWidth
          onChange={(e) => dispatch(SearchNotes(e.target.value))}
        />
        <Typography variant="h6" mb={0} mt={4} pl={1}>
          All Notes
        </Typography>
      </Box>
      <Box>
        <Scrollbar
          sx={{
            height: { lg: "calc(100vh - 300px)", sm: "100vh" },
            maxHeight: "700px",
          }}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box m={2}>
              <Alert severity="error" variant="filled" sx={{ color: "white" }}>
                {error}
              </Alert>
            </Box>
          ) : notes && notes.length ? (
            notes.map((note, index) => (
              <Box key={note._id} px={2}>
                <Box
                  p={2}
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                    mb: 1,
                    transition: "0.1s ease-in",
                    transform:
                      activeNote === index ? "scale(1)" : "scale(0.95)",
                    backgroundColor: `${note.color}.light`,
                  }}
                  onClick={() => dispatch(SelectNote(index))}
                >
                  <Typography variant="h6" noWrap color={note.color + ".main"}>
                    {note.title}
                  </Typography>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="caption">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Typography>
                    <Tooltip title="Delete">
                      <IconButton
                        aria-label="delete"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(deleteNote(note._id));
                        }}
                      >
                        <IconTrash width={18} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            ))
          ) : (
            <Box m={2}>
              <Alert severity="info" variant="filled" sx={{ color: "white" }}>
                No Notes Found! Create your first note to get started.
              </Alert>
            </Box>
          )}
        </Scrollbar>
      </Box>
    </>
  );
};

export default NoteList;
