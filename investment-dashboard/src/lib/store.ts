import { create } from "zustand";

interface UiState {
  benchmark: string;
  refreshIntervalMin: number;
  setBenchmark: (b: string) => void;
  setRefreshInterval: (m: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  benchmark: "SWDA.AS",
  refreshIntervalMin: 5,
  setBenchmark: (benchmark) => set({ benchmark }),
  setRefreshInterval: (refreshIntervalMin) => set({ refreshIntervalMin }),
}));
