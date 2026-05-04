import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import { WizardState } from "../types/WizardTypes";
import { Club, DEvent } from "../types/Disco";

type DataFiltersContextType = {
  wizardState: WizardState,
  setWizardState: Dispatch<SetStateAction<WizardState>>;
  clubs: Club[];
  setClubs: Dispatch<SetStateAction<Club[]>>;
  events: DEvent[];
  setEvents: Dispatch<SetStateAction<DEvent[]>>;
};

const DataFiltersContext = createContext<DataFiltersContextType | null>(null);

export const SearchCriteriaProvider = ({ children }: { children: React.ReactNode }) => {
  const today = new Date();
  const todayDate = new Date(today.toDateString());
  const [wizardState, setWizardState] = useState<WizardState>({
    step: 'where',
    date: todayDate,
    expanded: false
  });
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<DEvent[]>([]);

  return (
    <DataFiltersContext.Provider value={{
      wizardState,
      setWizardState,
      clubs,
      setClubs,
      events,
      setEvents
    }}>
      {children}
    </DataFiltersContext.Provider>
  );
};

export const useSearchFilters = () => useContext(DataFiltersContext)!;
