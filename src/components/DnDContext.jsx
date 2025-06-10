import React, { createContext, useContext, useState } from 'react';

const DnDContext = createContext();

export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null);
  return <DnDContext.Provider value={[type, setType]}>{children}</DnDContext.Provider>;
};

export const useDnD = () => useContext(DnDContext);
