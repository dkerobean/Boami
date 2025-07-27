import React from 'react';
import {
  Tabs as MuiTabs,
  Tab,
  TabsProps as MuiTabsProps,
  Box,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface TabsContextType {
  value?: string | number;
  onValueChange?: (value: string | number) => void;
}

const TabsContext = React.createContext<TabsContextType>({});

export interface TabsProps extends Omit<MuiTabsProps, 'value' | 'onChange'> {
  value?: string | number;
  onValueChange?: (value: string | number) => void;
  children?: React.ReactNode;
  defaultValue?: string | number;
}

const StyledTabs = styled(MuiTabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
  },
}));

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  defaultValue,
  ...props
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value);
  
  const handleChange = (event: React.SyntheticEvent, newValue: string | number) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  const contextValue = {
    value: value !== undefined ? value : internalValue,
    onValueChange: onValueChange || setInternalValue,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <Box>
        {children}
      </Box>
    </TabsContext.Provider>
  );
};

export interface TabsListProps {
  children?: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className,
  ...props
}) => {
  const { value } = React.useContext(TabsContext);
  
  const handleChange = (event: React.SyntheticEvent, newValue: string | number) => {
    const { onValueChange } = React.useContext(TabsContext);
    onValueChange?.(newValue);
  };

  return (
    <StyledTabs
      value={value}
      onChange={handleChange}
      className={className}
      {...props}
    >
      {children}
    </StyledTabs>
  );
};

export interface TabsTriggerProps {
  value: string | number;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <Tab
      value={value}
      label={children}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
};

export interface TabsContentProps {
  value: string | number;
  children?: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value: contentValue,
  children,
  className,
  ...props
}) => {
  const { value } = React.useContext(TabsContext);
  
  if (value !== contentValue) {
    return null;
  }

  return (
    <Box
      role="tabpanel"
      className={className}
      {...props}
    >
      {children}
    </Box>
  );
};