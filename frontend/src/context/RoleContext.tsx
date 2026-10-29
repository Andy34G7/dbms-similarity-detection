'use client';

import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'TEACHER' | 'STUDENT';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deptOrSRN: string;
}

export const PRESET_USERS: UserProfile[] = [
  {
    id: 'T101',
    name: 'Dr. Deena Hajim',
    email: 'deena.hajim@pes.edu',
    role: 'TEACHER',
    deptOrSRN: 'Dept of Computer Science',
  },
  {
    id: 'T102',
    name: 'Prof. Nagasundari S',
    email: 'nagasundari@pes.edu',
    role: 'TEACHER',
    deptOrSRN: 'Dept of Computer Science',
  },
  {
    id: 'PES2UG24CS061',
    name: 'Hemanth Andey',
    email: 'hemanth.cs061@pes.edu',
    role: 'STUDENT',
    deptOrSRN: 'PES2UG24CS061',
  },
  {
    id: 'PES2UG24CS058',
    name: 'Ananya Ratnaparkhi',
    email: 'ananya.cs058@pes.edu',
    role: 'STUDENT',
    deptOrSRN: 'PES2UG24CS058',
  },
  {
    id: 'PES2UG24CS102',
    name: 'Ananya Sharma',
    email: 'ananya.cs102@pes.edu',
    role: 'STUDENT',
    deptOrSRN: 'PES2UG24CS102',
  },
  {
    id: 'PES2UG24CS115',
    name: 'Vikram Patel',
    email: 'vikram.cs115@pes.edu',
    role: 'STUDENT',
    deptOrSRN: 'PES2UG24CS115',
  },
];

interface RoleContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchUserById: (id: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(PRESET_USERS[0]);

  const switchUserById = (id: string) => {
    const user = PRESET_USERS.find((u) => u.id === id);
    if (user) {
      setCurrentUser(user);
    }
  };

  return (
    <RoleContext.Provider value={{ currentUser, setCurrentUser, switchUserById }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
