export type ContractUpdateEvent = {
  contratoId: string;
  situacao: string;
};

export function isPendingContractUpdate(event: ContractUpdateEvent) {
  return event.situacao !== "TRATADO";
}

export function countPendingContractUpdates(events: ContractUpdateEvent[]) {
  return new Set(
    events
      .filter(isPendingContractUpdate)
      .map((event) => event.contratoId)
      .filter(Boolean),
  ).size;
}
