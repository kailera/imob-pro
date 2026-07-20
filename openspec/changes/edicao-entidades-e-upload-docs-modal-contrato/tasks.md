## 1. Database and Schema Updates

- [x] 1.1 Add `documentoUrl Json?` to `ContratoImovelLocacao` model in `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma db push` or create a migration to update the database schema
- [x] 1.3 Regenerate the Prisma client

## 2. Server Actions Implementation

- [x] 2.1 Implement Server Action `updateLocatario` in `app/(admin)/contratos/actions.ts`
- [x] 2.2 Implement Server Action `updateLocador` in `app/(admin)/contratos/actions.ts`
- [x] 2.3 Ensure `createContratoLocacao` accepts and persists contract document URLs and metadata in the new database field

## 3. Hook and Frontend State Management

- [x] 3.1 Update `useNovoContratoForm.ts` to add states for editing mode (e.g., `isEditingLocatario`, `isEditingLocador`, `isEditingImovel`)
- [x] 3.2 Add UI handlers for mapping selected entity fields into editing forms in `useNovoContratoForm.ts`
- [x] 3.3 Add state and handler logic for document description and upload using `uploadMediaToRustFS` for both tenant and contract

## 4. Components and Views Updates

- [x] 4.1 Update `NovoContratoModal.tsx` to display edit buttons for Selected Tenant, Landlord, and Property
- [x] 4.2 Update `CadastroInquilinoForm.tsx` to handle edit mode, displaying "Salvar Alterações" and pre-populating fields
- [x] 4.3 Implement inline or separate form view for editing Landlord (Locador) and Property (Imovel) inside the modal
- [x] 4.4 Implement Document Upload UI component at the end of the modal for tenant and contract document lists
