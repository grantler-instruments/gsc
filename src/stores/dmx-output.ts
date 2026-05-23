import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DmxOutputState {
  revision: number;
}

export const useDmxOutputStore = create<DmxOutputState>()(
  devtools(() => ({ revision: 0 }), { name: "DmxOutputStore" }),
);

export function bumpDmxOutputRevision(): void {
  useDmxOutputStore.setState((state) => ({ revision: state.revision + 1 }));
}
