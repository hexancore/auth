import type { FRequest } from "@hexancore/core";
import type { SessionData } from "../Data/SessionData";
import type { Session } from "../Session";

export type FReqWithSession<D extends SessionData> = FRequest & { session?: Session<D>; };