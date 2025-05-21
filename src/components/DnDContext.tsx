import React, {useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';
// Define the type for the context value: an array with [type, setType]
type DnDContextType = [string | null, Dispatch<SetStateAction<string | null>>];

// Create the context with the default value
const DnDContext = createContext<DnDContextType>([null, () => {}]);

// Define the types for the DnDProvider component props
interface DnDProviderProps {
  children: ReactNode;
}

// DnDProvider component
export const DnDProvider: React.FC<DnDProviderProps> = ({ children }) => {
  const [type, setType] = useState<string | null>(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

// Custom hook to use the DnDContext
export const useDnD = (): DnDContextType => {
  return useContext(DnDContext);
};

// Default export for the context
export default DnDContext;
