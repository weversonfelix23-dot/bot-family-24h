import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import cron from 'node-cron';
import express from 'express';

// Inicialização do Servidor Web
const app = express();
const PORT = process.env.PORT || 3000;
let ultimoQrCode = ""; // Armazena o código para a página web

const historicoTestes = new Set(); 
const ARQUIVO_CLIENTES = './clientes.json';

if (!fs.existsSync(ARQUIVO_CLIENTES)) {
    fs.writeFileSync(ARQUIVO_CLIENTES, JSON.stringify([], null, 2));
}

const CONFIG_FAMILY = {
    nome: "Assistente Family 24h",
    dono_numero: "5521980236044@s.whatsapp.net",
    servidores: {
        principal: "https://ryzen.fun",
        reserva1: "https://sigma.vin",
        reserva2: "https://zeropainel.online"
    },
    link_indicacao_revenda: "https://ryzen.funrs",
    planos: {
        uma_tela_normal: 35.00,
        uma_tela_desconto: 25.00,
        duas_telas: 60.00,
        taxa_revenda: 50.00
    },
    mercado_pago_token: "APP_USR-7834190256108432-051520-b4618e74a129dca3e512cda47b19810f-184920153" 
};

// TUTORIAIS CONFIGURADOS COM LINKS DA INTERNET PARA NÃO TRAVAR O SERVER
const TUTORIAIS = {
    1: { texto: "📺 *COMO INSTALAR NA SUA TV SAMSUNG:*\n\n1️⃣ Abra a loja de aplicativos da sua TV Samsung.\n2️⃣ Pesquise por: *Blessed Player* e clique em Instalar.\n\n⚠️ *Caso não encontre na loja:* \nInstale via Pen Drive:\n• Baixe o arquivo no PC pelo link: \`fui.ai/blessedsamsung\`\n• Extraia os arquivos dentro do Pen Drive.\n• Conecte o Pen Drive na entrada USB da sua TV Samsung.", url_imagem: "https://sua-url-aqui.com" },
    2: { texto: "📺 *COMO INSTALAR NA SUA TV LG:*\n\n1️⃣ Abra a *Loja de APPs* (LG Content Store) na sua TV.\n2️⃣ Clique na barra de pesquisa (ícone de lupa).\n3️⃣ Pesquise exatamente por: *Blessed Player*.\n4️⃣ Selecione o aplicativo e clique no botão *Instalar*.", url_imagem: "https://sua-url-aqui.com" },
    3: { texto: "🤖 *COMO INSTALAR NO SEU ANDROID TV (TCL/OUTRAS):*\n\n1️⃣ Abra a *Play Store* na sua TV.\n2️⃣ Pesquise por: *Blessed Player*.\n3️⃣ Clique no botão *Instalar*.", url_imagem: "https://sua-url-aqui.com" },
    4: { texto: "🔥 *COMO INSTALAR NO SEU FIRESTICK:*\n\n1️⃣ Abra o aplicativo *Downloader* no seu Firestick.\n2️⃣ No campo de busca por URL, digite o código principal: \`6390937\` (Se falhar, use o reserva \`9602872\`).\n3️⃣ O download começará sozinho. Clique em Instalar!", url_imagem: "https://sua-url-aqui.com" },
    5: { texto: "🟣 *COMO INSTALAR NO SEU SISTEMA ROKU:*\n\n1️⃣ No menu lateral da tela inicial do seu Roku, selecione *Pesquisar* ou *Central de apps*.\n2️⃣ Na barra de busca, digite: *Blessed Player*.\n3️⃣ Clique no botão *Adicionar canal*.", url_imagem: "https://sua-url-aqui.com" },
    6: { texto: "📱 *COMO INSTALAR NO SEU CELULAR (ANDROID OU IPHONE):*\n\n1️⃣ Abra a loja do seu aparelho (*Google Play* no Android ou *App Store* no iPhone).\n2️⃣ Busque exatamente por: *Blessed Player*.\n3️⃣ Clique em *Instalar* ou *Obter*.", url_imagem: "https://sua-url-aqui.com" }
};

function registrarVencimentoCliente(whatsapp, dias = 30) {
    const clientes = JSON.parse(fs.readFileSync(ARQUIVO_CLIENTES));
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + dias);
    const listaFiltrada = clientes.filter(c => c.whatsapp !== whatsapp);
    listaFiltrada.push({ whatsapp: whatsapp, vencimento: dataVencimento.toISOString().split('T') });
    fs.writeFileSync(ARQUIVO_CLIENTES, JSON.stringify(listaFiltrada, null, 2));
}

async function executarCriacaoTeste() {
    return null;
}

async function criarPix(valor, idCliente) {
    try {
        const response = await axios.post('https://mercadopago.com', {
            transaction_amount: valor,
            description: "Pagamento IPTV Family",
            payment_method_id: "pix",
            payer: { email: `id_${idCliente}@familyiptv.com` }
        }, { headers: { Authorization: `Bearer ${CONFIG_FAMILY.mercado_pago_token}` } });
        return response.data.point_of_interaction.transaction_data.qr_code;
    } catch (err) { return null; }
}

async function iniciarBot() {
    try {
        // ✅ Forçando a gravação na pasta temporária /tmp/ do Linux para evitar bloqueio do Railway
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/sessao_family_absoluta');
        
        const sock = makeWASocket({ 
            auth: state, 
            printQRInTerminal: true,
            logger: (await import('pino')).default({ level: 'debug' }) // Aumentado log para depurar no terminal
        });

        sock.ev.on('connection.update', (update) => {
            const { qr, connection, lastDisconnect } = update;
            
            if (qr) {
                console.log("✅ NOVO QR CODE GERADO COM SUCESSO!");
                ultimoQrCode = qr;
            }

            if (connection === 'close') {
                console.log("⚠️ Conexão fechada. Tentando reconectar...", lastDisconnect?.error);
                iniciarBot();
            } else if (connection === 'open') {
                console.log("🚀 CONECTADO COM SUCESSO AO WHATSAPP!");
                ultimoQrCode = "";
            }
        });

        sock.ev.on('creds.update', saveCreds);

        cron.schedule('0 9 * * *', async () => {
            const clientes = JSON.parse(fs.readFileSync(ARQUIVO_CLIENTES));
            const alvoData = new Date();
            alvoData.setDate(alvoData.getDate() + 3);
            const dataAlvoStr = alvoData.toISOString().split('T');
            for (const cliente of clientes) {
                if (cliente.vencimento === dataAlvoStr) {
                    const pixCode = await criarPix(CONFIG_FAMILY.planos.uma_tela_normal, cliente.whatsapp);
                    if (pixCode) {
                        const textAlerta = `⚠️ *AVISO DE VENCIMENTO IPTV FAMILY* ⚠️\n\nOlá! Passando para lembrar que o seu acesso mensal de 1 tela vence em *3 dias*.\n\nPara renovar seu sinal antecipadamente por mais 30 dias e evitar o bloqueio automático, use o código *PIX Copia e Cola* padrão de *R$ 35,00* abaixo:`;
                        await sock.sendMessage(cliente.whatsapp, { text: textAlerta });
                        await sock.sendMessage(cliente.whatsapp, { text: `\`${pixCode}\`` });
                    }
                }
            }
        });

        // Sistema de Resposta a Mensagens
        sock.ev.on('messages.upsert', async m => {
            const msg = m.messages;
            if (!msg || !msg.message || msg.key.fromMe) return;
            
            const de = msg.key.remoteJid;
            const respostaCliente = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();

            if (respostaCliente.startsWith('#pix ')) {
                if (de === CONFIG_FAMILY.dono_numero || msg.key.participant === CONFIG_FAMILY.dono_numero) {
                    const valorInformado = parseFloat(respostaCliente.replace('#pix ', '').replace(',', '.'));
                    if (!isNaN(valorInformado) && valorInformado > 0) {
                        await sock.sendMessage(de, { text: `⏳ Gerando PIX no valor personalizado de *R$ ${valorInformado.toFixed(2)}*...` });
                        const pixCode = await criarPix(valorInformado, de);
                        if (pixCode) {
                            await sock.sendMessage(de, { text: `📱 *PIX COPIA E COLA GERADO (Valor: R$ ${valorInformado.toFixed(2)}):*\n\n\`${pixCode}\`\n\n_Efetue o pagamento no seu banco para processar a sua renovação._` });
                            registrarVencimentoCliente(de, 30);
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error("❌ ERRO FATAL AO INICIAR O BAILEYS:", error);
    }
}

// Rotas Web para monitoramento e conexão do QR Code externo
app.get('/', (req, res) => {
    res.send('<h1>Bot IPTV Family Ativo!</h1><p>Para ver o QR Code de conexão, acesse: <strong>/qr</strong> no final do link.</p>');
});

app.get('/qr', (req, res) => {
    if (!ultimoQrCode) {
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h3>Aguardando o WhatsApp gerar um QR Code... Esta página irá atualizar sozinha!</h3>
                <script>setTimeout(() => { window.location.reload(); }, 4000);</script>
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>Escaneie com seu WhatsApp Business:</h2>
                <img src="https://qrserver.com{encodeURIComponent(ultimoQrCode)}" alt="QR Code" style="border:1px solid #ccc; padding:10px; border-radius:5px;" />
                <p>Mantenha a página aberta até conectar.</p>
            </div>
        `);
    }
});

// Inicialização do Servidor na porta correta do Railway
app.listen(PORT, () => {
    console.log(`Porta do Railway aberta: ${PORT}`);
    iniciarBot();
});
