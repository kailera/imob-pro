## ADDED Requirements

### Requirement: Persistência de Configurações do Site
O sistema DEVE permitir que os administradores salvem as configurações de Serviços, Mídias/Banners e Depoimentos no banco de dados e que tais dados sejam persistidos de forma permanente.

#### Scenario: Salvar lista de serviços com sucesso
- **WHEN** o administrador edita e clica em "Salvar" na aba de Serviços Oferecidos
- **THEN** o sistema envia as alterações via Server Action, salva os dados na tabela `site_config` no banco de dados e exibe notificação de sucesso

#### Scenario: Salvar mídias e depoimentos com sucesso
- **WHEN** o administrador edita e clica em "Salvar" nas abas de Mídias ou Depoimentos
- **THEN** o sistema persiste as atualizações no banco de dados e mantém os dados mesmo após o recarregamento da página

### Requirement: Exibição Dinâmica dos Dados no Site Público
A página principal pública (`PublicHome`) DEVE buscar as configurações salvas no banco de dados e renderizar os dados dinâmicos do editor nos componentes públicos.

#### Scenario: Carregamento dos serviços dinâmicos na Landing Page
- **WHEN** um visitante acessa a Landing Page pública (`/`)
- **THEN** o componente `ServicesOfferted` exibe os serviços cadastrados e salvos pelo editor no banco de dados, utilizando os valores padrão apenas caso não existam dados salvos

#### Scenario: Carregamento dos depoimentos dinâmicos na Landing Page
- **WHEN** um visitante navega até a seção de depoimentos na Landing Page pública
- **THEN** a página renderiza os depoimentos cadastrados no editor do site ao invés dos depoimentos estáticos (mock)
