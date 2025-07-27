"use client";

import React, { useEffect } from "react";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Fab from "@mui/material/Fab";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { Calendar, momentLocalizer } from "react-big-calendar";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./Calendar.css";

import { IconCheck } from "@tabler/icons-react";
import BlankCard from "@/app/components/shared/BlankCard";
import { useSelector, useDispatch } from "@/store/hooks";
import {
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  transformEventsForDisplay,
  CalendarEventDisplay
} from "@/store/apps/calendar/CalendarSlice";

moment.locale("en-GB");
const localizer = momentLocalizer(moment);

const BigCalendar = () => {
  const dispatch = useDispatch();
  const { events, loading, error } = useSelector((state) => state.calendarReducer);

  // Transform events for display
  const displayEvents = transformEventsForDisplay(events);

  const [open, setOpen] = React.useState<boolean>(false);
  const [title, setTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [location, setLocation] = React.useState<string>("");
  const [start, setStart] = React.useState<Date | null>(new Date());
  const [end, setEnd] = React.useState<Date | null>(new Date());
  const [isAllDay, setIsAllDay] = React.useState<boolean>(false);
  const [color, setColor] = React.useState<string>("default");
  const [updateEventData, setUpdateEventData] = React.useState<CalendarEventDisplay | null>(null);

  const ColorVariation = [
    {
      id: 1,
      eColor: "#1a97f5",
      value: "default",
    },
    {
      id: 2,
      eColor: "#39b69a",
      value: "green",
    },
    {
      id: 3,
      eColor: "#fc4b6c",
      value: "red",
    },
    {
      id: 4,
      eColor: "#615dff",
      value: "azure",
    },
    {
      id: 5,
      eColor: "#fdd43f",
      value: "warning",
    },
  ];

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const addNewEventAlert = (slotInfo: any) => {
    setOpen(true);
    setTitle("");
    setDescription("");
    setLocation("");
    setStart(slotInfo.start);
    setEnd(slotInfo.end);
    setIsAllDay(slotInfo.start.getHours() === 0 && slotInfo.end.getHours() === 0);
    setColor("default");
    setUpdateEventData(null);
  };

  const editEvent = (event: CalendarEventDisplay) => {
    setOpen(true);
    setTitle(event.title);
    setDescription(event.description || "");
    setLocation(event.location || "");
    setStart(event.start);
    setEnd(event.end);
    setIsAllDay(event.allDay);
    setColor(event.color);
    setUpdateEventData(event);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !start || !end) {
      return;
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startDate: start,
      endDate: end,
      isAllDay,
      color
    };

    if (updateEventData) {
      await dispatch(updateEvent(updateEventData.id, eventData));
    } else {
      await dispatch(addEvent(eventData));
    }

    handleClose();
  };

  const handleDelete = async () => {
    if (updateEventData) {
      await dispatch(deleteEvent(updateEventData.id));
      handleClose();
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTitle("");
    setDescription("");
    setLocation("");
    setStart(new Date());
    setEnd(new Date());
    setIsAllDay(false);
    setColor("default");
    setUpdateEventData(null);
  };

  const eventColors = (event: CalendarEventDisplay) => {
    const colorClass = event.color.startsWith('#') ? 'default' : event.color;
    return { className: `event-${colorClass}` };
  };

  const handleStartChange = (newValue: Date | null) => {
    setStart(newValue);
    // Auto-adjust end date if it's before start date
    if (newValue && end && newValue > end) {
      const newEnd = new Date(newValue);
      newEnd.setHours(newEnd.getHours() + 1);
      setEnd(newEnd);
    }
  };

  const handleEndChange = (newValue: Date | null) => {
    setEnd(newValue);
  };

  if (error) {
    return (
      <BlankCard>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            onClick={() => dispatch(fetchEvents())}
            disabled={loading}
          >
            Retry
          </Button>
        </CardContent>
      </BlankCard>
    );
  }

  return (
    <>
      <BlankCard>
        <CardContent>
          {loading && displayEvents.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Calendar
              selectable
              events={displayEvents}
              defaultView="month"
              scrollToTime={new Date(1970, 1, 1, 6)}
              defaultDate={new Date()}
              localizer={localizer}
              style={{ height: "calc(100vh - 350px)" }}
              onSelectEvent={(event) => editEvent(event as CalendarEventDisplay)}
              onSelectSlot={(slotInfo: any) => addNewEventAlert(slotInfo)}
              eventPropGetter={(event: any) => eventColors(event)}
            />
          )}
        </CardContent>
      </BlankCard>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Typography variant="h4" sx={{ mb: 2 }}>
              {updateEventData ? "Update Event" : "Add Event"}
            </Typography>
            <Typography mb={3} variant="subtitle2">
              {!updateEventData
                ? "To add an event, fill in the details below and choose the event color."
                : "To edit/update the event, modify the details below and press the update button."}
            </Typography>

            <TextField
              id="event-title"
              placeholder="Enter Event Title"
              variant="outlined"
              fullWidth
              label="Event Title"
              value={title}
              sx={{ mb: 3 }}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <TextField
              id="event-description"
              placeholder="Enter Event Description"
              variant="outlined"
              fullWidth
              label="Description (Optional)"
              value={description}
              sx={{ mb: 3 }}
              multiline
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
            />

            <TextField
              id="event-location"
              placeholder="Enter Event Location"
              variant="outlined"
              fullWidth
              label="Location (Optional)"
              value={location}
              sx={{ mb: 3 }}
              onChange={(e) => setLocation(e.target.value)}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={start}
                onChange={handleStartChange}
                renderInput={(params: any) => (
                  <TextField {...params} fullWidth sx={{ mb: 3 }} />
                )}
              />
              <DatePicker
                label="End Date"
                value={end}
                onChange={handleEndChange}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    fullWidth
                    sx={{ mb: 3 }}
                    error={start && end ? start > end : false}
                    helperText={
                      start && end && start > end
                        ? "End date must be later than start date"
                        : ""
                    }
                  />
                )}
              />
            </LocalizationProvider>

            <Box sx={{ mb: 3 }}>
              <label>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                All Day Event
              </label>
            </Box>

            <Typography variant="h6" fontWeight={600} my={2}>
              Select Event Color
            </Typography>
            {ColorVariation.map((mcolor) => {
              return (
                <Fab
                  color="primary"
                  style={{ backgroundColor: mcolor.eColor }}
                  sx={{
                    marginRight: "3px",
                    transition: "0.1s ease-in",
                    scale: mcolor.value === color ? "0.9" : "0.7",
                  }}
                  size="small"
                  key={mcolor.id}
                  onClick={() => setColor(mcolor.value)}
                >
                  {mcolor.value === color ? <IconCheck width={16} /> : ""}
                </Fab>
              );
            })}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>

            {updateEventData && (
              <Button
                color="error"
                variant="contained"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            )}

            <Button
              type="submit"
              disabled={!title || loading || (start && end ? start > end : false)}
              variant="contained"
            >
              {loading
                ? (updateEventData ? "Updating..." : "Adding...")
                : (updateEventData ? "Update Event" : "Add Event")
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default BigCalendar;