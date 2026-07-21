## 1. Front-end Update

- [x] 1.1 Adicionar função utilitária de geração de UUID v4 no arquivo `components/vistorias/ficha-vistoria/RoomBuilderForm.tsx`
- [x] 1.2 Atualizar o ID atribuído ao novo ambiente no `handleAdd` de `RoomBuilderForm.tsx` para usar o UUID v4 gerado pela função utilitária

## 2. Back-end Update

- [x] 2.1 Implementar função auxiliar `getOrCreateDbUser` no arquivo `app/(admin)/vistorias/actions.ts`
- [x] 2.2 Atualizar a Server Action `updateVistoria` para utilizar a nova função de autocadastro JIT
- [x] 2.3 Atualizar a Server Action `resolveContestacao` para utilizar a nova função de autocadastro JIT

## 3. Validação

- [ ] 3.1 Iniciar o servidor local e validar que a criação de novos ambientes funciona normalmente sem erros
- [ ] 3.2 Validar que, ao adicionar fotos/comentários em um novo ambiente criado e salvar a vistoria, as fotos permanecem corretamente associadas ao ambiente após atualizar/recarregar a página
- [ ] 3.3 Validar que um usuário autenticado no Clerk que não esteja na tabela `users` do banco local consiga salvar a vistoria com sucesso e seja autocadastrado

