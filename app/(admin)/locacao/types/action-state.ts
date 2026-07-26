// types/action-state.ts

export type ActionState<Field extends string = string> = {
    success: boolean
    message: string | null
    errors: Partial<Record<Field, string[]>>
}

export type IdentificationField =
    | 'tipoLocacao'
    | 'finalidade'
    | 'dataInicio'
    | 'prazoMeses'

export type IdentificationActionState =
    ActionState<IdentificationField>