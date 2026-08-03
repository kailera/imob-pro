CREATE TABLE "site_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "services" JSONB,
    "mediaItems" JSONB,
    "reviews" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

INSERT INTO "site_config" (
    "id",
    "services",
    "mediaItems",
    "reviews",
    "updatedAt"
)
VALUES (
    'default',
    $json$[
      {"id":"1","mediaUrl":"https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80","title":"Intermediação de Vendas","description":"Assessoria completa na compra e venda de imóveis com ampla divulgação, curadoria personalizada e transparência em todas as etapas.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"},
      {"id":"2","mediaUrl":"https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80","title":"Gestão de Locação","description":"Administração segura do seu imóvel com cobrança automatizada, análise rigorosa de fiadores e repasse pontual garantido.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"},
      {"id":"3","mediaUrl":"https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80","title":"Vistorias Detalhadas","description":"Laudos cautelares completos com fotografias em alta definição e registros minuciosos para total proteção de locador e locatário.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"},
      {"id":"4","mediaUrl":"https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80","title":"Assessoria Jurídica","description":"Análise prévia minuciosa de certidões, regularização imobiliária e elaboração de contratos por advogados especialistas no setor.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"},
      {"id":"5","mediaUrl":"https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80","title":"Avaliação Imobiliária","description":"Parecer técnico mercadológico fundamentado em dados estatísticos reais do mercado local para identificar o valor justo do seu patrimônio.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"},
      {"id":"6","mediaUrl":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80","title":"Consultoria de Patrimônio","description":"Orientações estratégicas e inteligência imobiliária para investidores que buscam alta rentabilidade e diversificação patrimonial.","whatsapp":"5518996942082","email":"contato@scatolinimoveis.com.br","instagram":"https://instagram.com/scatolinimoveis"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","title":"Excelência e Assessoria Personalizada","category":"Equipe Especializada","description":"Nossa equipe de corretores e consultores jurídicos é altamente especializada para guiar você em cada etapa da negociação imobiliária, garantindo total transparência, máxima agilidade e segurança absoluta.","imageUrl":"https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1000&q=80"},
      {"id":"2","title":"Vistorias Rigorosas e Tecnologia","category":"Inovação & Segurança","description":"Utilizamos laudos fotográficos detalhados e vistorias digitais com inteligência imobiliária, protegendo o patrimônio do proprietário e assegurando tranquilidade ao inquilino.","imageUrl":"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80"},
      {"id":"3","title":"Relacionamento e Atendimento Humanizado","category":"Tradição & Confiança","description":"Mais do que intermediar imóveis, construímos parcerias de longo prazo. Estamos ao seu lado com atendimento dedicado para entender suas reais necessidades e encontrar o imóvel perfeito.","imageUrl":"https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1000&q=80"}
    ]$json$::jsonb,
    $json$[
      {"id":"1","author":"Mariana S. Albuquerque","role":"Compradora em Moema","comment":"A experiência de compra com a Scatolin foi impecável. A vistoria minuciosa me deu total segurança para fechar o negócio sem surpresas.","rating":5},
      {"id":"2","author":"Ricardo Fonseca","role":"Proprietário no Itaim Bibi","comment":"Como locador, prezo pela segurança dos meus bens. O laudo de vistoria gerado pela equipe deles é o mais detalhado e profissional que já vi.","rating":5}
    ]$json$::jsonb,
    CURRENT_TIMESTAMP
);
