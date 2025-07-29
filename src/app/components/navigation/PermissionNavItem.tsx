'use client';

import React from 'react';
import { useAuthContext } from '@/app/context/AuthContext';
import NavItem from '@/app/(DashboardLayout)/layout/vertical/sidebar/NavItem';

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
  children?: NavGroup[];
  chip?: string;
  chipColor?: any;
  variant?: string | any;
  external?: boolean;
  level?: number;
  onClick?: React.MouseEvent<HTMLButtonElement, MouseEvent>;
  permissionRequired?: {
    resource: string;
    action: string;
  };
};

interface PermissionNavItemProps {
  item: NavGroup;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  hideMenu?: any;
  level?: number | any;
  pathDirect: string;
}

export default function PermissionNavItem(props: PermissionNavItemProps) {
  const { item } = props;
  const { user, isLoading } = useAuthContext();

  // If no permission is required, render the item normally
  if (!item.permissionRequired) {
    return <NavItem {...props} />;
  }

  // If auth is loading, don't render the item yet
  if (isLoading) {
    return null;
  }

  // If user is not authenticated, don't render the item
  if (!user) {
    return null;
  }

  // For now, render all items for authenticated users
  // TODO: Implement proper permission checking with user roles
  return <NavItem {...props} />;
}