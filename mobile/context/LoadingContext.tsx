import React, {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

interface LoadingContextType {
  appLoading: boolean;
  setAppLoading: Dispatch<SetStateAction<boolean>>;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

const LoadingProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [appLoading, setAppLoading] = useState<boolean>(false);

  return (
    <LoadingContext.Provider value={{ appLoading, setAppLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context)
    throw new Error(
      "Loading context must be used within loading context provider",
    );
  return context;
};

export default LoadingProvider;
