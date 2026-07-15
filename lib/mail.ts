import nodemailer from "nodemailer";

export interface MailProperty {
  id: string;
  codigo: string;
  titulo: string;
  bairro: string;
  cidade: string;
  uf: string;
  preco: number; // em centavos
  operation: "venda" | "locacao";
  quartos: number;
  banheiros: number;
  vagas: number;
  area: number;
  imagem: string;
}

/**
 * Envia um e-mail com as sugestões de imóveis para o Lead.
 */
export async function sendMatchingImoveisEmail(
  email: string,
  nome: string,
  imoveis: MailProperty[]
) {
  if (!email) {
    throw new Error("O e-mail do lead é obrigatório para envio.");
  }
  if (!imoveis || imoveis.length === 0) {
    throw new Error("A lista de imóveis recomendados não pode estar vazia.");
  }

  // Configuração do transportador SMTP
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || "nao-responder@imobpro.com.br";
  const fromName = process.env.SMTP_FROM_NAME || "Scatolin Imóveis";

  if (!host || !user || !pass) {
    console.warn("SMTP não configurado. O envio de e-mail será simulado no console.");
    console.log(`[E-mail Simulado] Enviando ${imoveis.length} imóveis para ${nome} (${email})`);
    return { success: true, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Gerar o HTML para os imóveis
  const imoveisListHtml = imoveis
    .map((im) => {
      const formattedPrice = im.operation === "locacao"
        ? `R$ ${(im.preco / 100).toLocaleString("pt-BR")}/mês`
        : `R$ ${(im.preco / 100).toLocaleString("pt-BR")}`;

      const linkDetails = `${appUrl}/busca?operation=${im.operation}`;

      return `
        <div style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="position: relative;">
            <img src="${im.imagem}" alt="${im.titulo}" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
          </div>
          <div style="padding: 20px;">
            <div style="margin-bottom: 8px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${im.operation === 'venda' ? '#fef3c7' : '#dcfce7'}; color: ${im.operation === 'venda' ? '#b45309' : '#15803d'}; padding: 4px 8px; border-radius: 6px; display: inline-block;">
                ${im.operation === 'venda' ? 'Comprar' : 'Alugar'}
              </span>
              <span style="font-size: 11px; color: #71717a; margin-left: 8px; font-weight: 500;">Código: ${im.codigo}</span>
            </div>
            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; line-height: 1.4;">${im.titulo}</h3>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; font-weight: 500;">📍 ${im.bairro}, ${im.cidade}/${im.uf}</p>
            
            <div style="font-size: 22px; font-weight: 800; color: #004777; margin-bottom: 16px; letter-spacing: -0.02em;">
              ${formattedPrice}
            </div>
            
            <div style="display: flex; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 14px; margin-bottom: 20px;">
              <div style="font-size: 12px; color: #475569; font-weight: 600;">🛏️ ${im.quartos} ${im.quartos === 1 ? 'Quarto' : 'Quartos'}</div>
              <div style="font-size: 12px; color: #475569; font-weight: 600;">🚿 ${im.banheiros} ${im.banheiros === 1 ? 'Banheiro' : 'Banheiros'}</div>
              <div style="font-size: 12px; color: #475569; font-weight: 600;">🚗 ${im.vagas} ${im.vagas === 1 ? 'Vaga' : 'Vagas'}</div>
              <div style="font-size: 12px; color: #475569; font-weight: 600;">📏 ${im.area} m²</div>
            </div>
            
            <a href="${linkDetails}" target="_blank" style="display: block; text-align: center; background-color: #004777; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 700; transition: background-color 0.2s;">
              Visualizar Imóvel no Mapa
            </a>
          </div>
        </div>
      `;
    })
    .join("");

  const emailHtml = `
    <div style="background-color: #f8fafc; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em;">Scatolin Imóveis</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">Seleção Exclusiva de Oportunidades</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Olá, ${nome}!</h2>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0; font-weight: 400;">
            Com base no seu perfil de interesse registrado em nosso sistema, selecionamos algumas excelentes opções de imóveis que acabaram de ficar disponíveis. Confira abaixo:
          </p>
          
          ${imoveisListHtml}
          
          <!-- Footer info -->
          <div style="text-align: center; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500;">
              Este é um informativo de correspondência automática enviado pela Scatolin Imóveis.
            </p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 4px 0 0 0;">
              Caso queira cancelar o recebimento dessas sugestões, fale com o seu corretor responsável.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `🔍 Selecionamos ${imoveis.length} imóvel(is) ideal(is) para você!`,
    html: emailHtml,
  });

  return { success: true, messageId: info.messageId };
}
