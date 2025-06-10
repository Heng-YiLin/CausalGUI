import React, { useContext, useState, createContext } from 'react';

// Create the context
const DnDContext = createContext(undefined);

// DnDProvider component
export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

// Custom hook to use the DnDContext
export const useDnD = () => {
  const context = useContext(DnDContext);
  if (!context) {
    throw new Error("useDnD must be used within a DnDProvider");
  }
  return context;
};

// Default export
export default DnDContext;
