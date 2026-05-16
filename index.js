import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs';
import cron from 'node-cron';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;
let ultimoQrCode = ""; // ✅ Variável global para armazenar o QR Code

const historicoTestes = new Set(); 
const ARQUIVO_CLIENTES = './clientes.json';

if (!fs.existsSync(ARQUIVO_CLIENTES)) {
    fs.writeFileSync(ARQUIVO_CLIENTES, JSON.stringify([], null, 2));
}

const CONFIG_FAMILY = {
    nome: "Assistente Family 24h",
    dono_numero: "5521980236044@s.whatsapp.net", // ✅ SEU WHATSAPP MASTER CONFIGURADO
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
    // ✅ SEU ACCESS TOKEN DO MERCADO PAGO INJETADO
    mercado_pago_token: "APP_USR-7834190256108432-051520-b4618e74a129dca3e512cda47b19810f-184920153" 
};

const TUTORIAIS = {
    1: { texto: "📺 *COMO INSTALAR NA SUA TV SAMSUNG:*\n\n1️⃣ Abra a loja de aplicativos da sua TV Samsung.\n2️⃣ Pesquise por: *Blessed Player* e clique em Instalar.\n\n⚠️ *Caso não encontre na loja:* \nInstale via Pen Drive:\n• Baixe o arquivo no PC pelo link: \`fui.ai/blessedsamsung\`\n• Extraia os arquivos dentro do Pen Drive.\n• Conecte o Pen Drive na entrada USB da sua TV Samsung.", arquivo: "./samsung.jpg" },
    2: { texto: "📺 *COMO INSTALAR NA SUA TV LG:*\n\n1️⃣ Abra a *Loja de APPs* (LG Content Store) na sua TV.\n2️⃣ Clique na barra de pesquisa (ícone de lupa).\n3️⃣ Pesquise exatamente por: *Blessed Player*.\n4️⃣ Selecione o aplicativo e clique no botão *Instalar*.", arquivo: "./lg.jpg" },
    3: { texto: "🤖 *COMO INSTALAR NO SEU ANDROID TV (TCL/OUTRAS):*\n\n1️⃣ Abra a *Play Store* na sua TV.\n2️⃣ Pesquise por: *Blessed Player*.\n3️⃣ Clique no botão *Instalar*.", arquivo: "./androidtv.jpg" },
    4: { texto: "🔥 *COMO INSTALAR NO SEU FIRESTICK:*\n\n1️⃣ Abra o aplicativo *Downloader* no seu Firestick.\n2️⃣ No campo de busca por URL, digite o código principal: \`6390937\` (Se falhar, use o reserva \`9602872\`).\n3️⃣ O download começará sozinho. Clique em Instalar!", arquivo: "./androidtv.jpg" },
    5: { texto: "🟣 *COMO INSTALAR NO SEU SISTEMA ROKU:*\n\n1️⃣ No menu lateral da tela inicial do seu Roku, selecione *Pesquisar* ou *Central de apps*.\n2️⃣ Na barra de busca, digite: *Blessed Player*.\n3️⃣ Clique no botão *Adicionar canal*.", arquivo: "./roku.jpg" },
    6: { texto: "📱 *COMO INSTALAR NO SEU CELULAR (ANDROID OU IPHONE):*\n\n1️⃣ Abra a loja do seu aparelho (*Google Play* no Android ou *App Store* no iPhone).\n2️⃣ Busque exatamente por: *Blessed Player*.\n3️⃣ Clique em *Instalar* ou *Obter*.", arquivo: "./celular.jpg" }
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
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.goto(CONFIG_FAMILY.servidores.principal, { waitUntil: 'networkidle2' });
        // ✅ SEU SEU LOGIN E SENHA OFICIAIS DO PAINEL KRYPTHON INJETADOS
        await page.type('input[type="text"]', 'family_24h_vendas'); 
        await page.type('input[type="password"]', 'KrypthonMaster2024@'); 
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await page.goto(`${CONFIG_FAMILY.servidores.principal}#/customers/create-test`);
        await page.waitForSelector('.btn-generate-test');
        await page.click('.btn-generate-test');
        const dados = await page.evaluate(() => {
            return {
                user: document.querySelector('.username')?.innerText || "Erro",
                pass: document.querySelector('.password')?.innerText || "Erro",
                m3u: document.querySelector('.m3u-link')?.innerText || "Erro"
            };
        });
        await browser.close();
        return dados;
    } catch (e) {
        await browser.close();
        return null;
    }
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
    const { state, saveCreds } = await useMultiFileAuthState('sessao_family');
    const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: true,
        logger: (await import('pino')).default({ level: 'silent' })
    });
    const testesPendentesDeDispositivo = new Map();

    // ✅ Alimenta a variável global toda vez que o Baileys gerar ou atualizar o QR Code
    sock.ev.on('connection.update', (update) => {
        const { qr } = update;
        if (qr) ultimoQrCode = qr;
    });

    if (!sock.authState.creds.registered) {
        const numeroDoBot = "5521980236044"; // ✅ SEU NÚMERO DO BOT FILTRADO E CORRIGIDO
        setTimeout(async () => {
            let code = await sock.requestPairingCode(numeroDoBot);
            console.log(`\n=========================================\n📌 SEU CÓDIGO DO WHATSAPP: ${code}\n=========================================\n`);
        }, 5000);
    }

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

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages;
        if (!msg.message || msg.key.fromMe) return;
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
                return; 
            }
        }
    });
}

// ✅ Rotas do Express Corrigidas e Atualizadas usando Template Literals corretos
app.get('/', (req, res) => {
    res.send('<h1>Bot IPTV Family Ativo!</h1><p>Para ver o QR Code de conexão, acesse: <strong>/qr</strong> no final do link.</p>');
});

app.get('/qr', (req, res) => {
    if (!ultimoQrCode) {
        res.send('<h3>Aguardando o WhatsApp gerar um QR Code... Recarregue a página em 5 segundos!</h3>');
    } else {
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>Escaneie com seu WhatsApp Business:</h2>
                <img src="https://qrserver.com{encodeURIComponent(ultimoQrCode)}" alt="QR Code" />
                <p>Mantenha a página aberta até conectar.</p>
            </div>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Porta do Railway aberta: ${PORT}`);
    iniciarBot();
});
