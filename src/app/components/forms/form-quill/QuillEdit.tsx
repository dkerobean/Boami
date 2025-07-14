"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import "./Quill.css";

import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
const ReactQuill: any = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");
    // eslint-disable-next-line react/display-name
    return ({ ...props }) => <RQ {...props} />;
  },
  {
    ssr: false,
  }
);

import Paper from "@mui/material/Paper";

interface QuillEditProps {
  value?: string;
  onChange?: (content: string) => void;
}

const QuillEdit = ({ value = "", onChange }: QuillEditProps) => {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  const handleChange = (content: string) => {
    setText(content);
    if (onChange) {
      onChange(content);
    }
  };

  return (
    <Paper sx={{ border: `1px solid ${borderColor}` }} variant="outlined">
      <ReactQuill
        value={text}
        onChange={handleChange}
        placeholder="Type here..."
      />
    </Paper>
  );
};

export default QuillEdit;
