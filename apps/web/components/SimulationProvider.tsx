"use client";

import { createContext, useContext } from "react";

/**
 * Whether the signed-in account has simulated position figures.
 *
 * Read once in the app shell from profiles.is_simulated and handed down,
 * so no component needs the flag passed through it and no component can
 * get a different answer from its neighbour. The default is false, which
 * is what every account that is not a test account gets, and what any
 * component rendered outside the shell gets.
 */
const SimulationContext = createContext(false);

export function SimulationProvider({
  simulated,
  children
}: {
  simulated: boolean;
  children: React.ReactNode;
}) {
  return <SimulationContext.Provider value={simulated}>{children}</SimulationContext.Provider>;
}

export function useSimulatedAccount(): boolean {
  return useContext(SimulationContext);
}
