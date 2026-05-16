const {
    default: makeWASocket,
    useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");

const historicoTestes = new Set();
const ARQUIVO_CLIENTES = "./clientes.json";

if (!fs.existsSync(ARQUIVO_CLIENTES)) {
    fs.writeFileSync(ARQUIVO_CLIENTES, JSON.stringify([], null, 2));
}

const CONFIG_FAMILY = {
    nome: "Assistente Family 24h",
    dono_numero: "5521980236044@s.whatsapp.net",
    servidores: {
        principal: "https://krypthon-vip.ryzen.fun",
        reserva1: "https://sigma.vin",
        reserva2: "https://zeropainel.online",
    },
    link_indicacao_revenda: "https://ryzen.funrs",
    planos: {
        uma_tela_normal: 35.0,
        uma_tela_desconto: 25.0,
        duas_telas: 60.0,
        taxa_revenda: 50.0,
    },
    mercado_pago_token:
        "APP_USR-1676815975878482-051514-f400a23f15ffe521f624038124e83022-544855967",
};

const TUTORIAIS = {
    1: {
        texto: "📺 COMO INSTALAR NA SUA TV SAMSUNG:\n\n1️⃣ Abra a loja de aplicativos da sua TV Samsung.\n2️⃣ Pesquise por: Blessed Player e clique em Instalar.\n\n⚠️ Caso não encontre na loja: \nInstale via Pen Drive:\n• Baixe o arquivo no PC pelo link: fui.ai/blessedsamsung\n• Extraia os arquivos dentro do Pen Drive.\n• Conecte o Pen Drive na entrada USB da sua TV Samsung.",
        arquivo: "./samsung.jpg",
    },
    2: {
        texto: "📺 COMO INSTALAR NA SUA TV LG:\n\n1️⃣ Abra a Loja de APPs (LG Content Store) na sua TV.\n2️⃣ Clique na barra de pesquisa (ícone de lupa).\n3️⃣ Pesquise exatamente por: Blessed Player.\n4️⃣ Selecione o aplicativo e clique no botão Instalar.",
        arquivo: "./lg.jpg",
    },
    3: {
        texto: "🤖 COMO INSTALAR NO SEU ANDROID TV (TCL/OUTRAS):\n\n1️⃣ Abra a Play Store na sua TV.\n2️⃣ Pesquise por: Blessed Player.\n3️⃣ Clique no botão Instalar.",
        arquivo: "./androidtv.jpg",
    },
    4: {
        texto: "🔥 COMO INSTALAR NO SEU FIRESTICK:\n\n1️⃣ Abra o aplicativo Downloader no seu Firestick.\n2️⃣ No campo de busca por URL, digite o código principal: 6390937 (Se falhar, use o reserva 9602872).\n3️⃣ O download começará sozinho. Clique em Instalar!",
        arquivo: "./androidtv.jpg",
    },
    5: {
        texto: "🟣 COMO INSTALAR NO SEU SISTEMA ROKU:\n\n1️⃣ No menu lateral da tela inicial do seu Roku, selecione Pesquisar ou Central de apps.\n2️⃣ Na barra de busca, digite: Blessed Player.\n3️⃣ Clique no botão Adicionar canal.",
        arquivo: "./roku.jpg",
    },
    6: {
        texto: "📱 COMO INSTALAR NO SEU CELULAR (ANDROID OU IPHONE):\n\n1️⃣ Abra a loja do seu aparelho (Google Play no Android ou App Store no iPhone).\n2️⃣ Busque exatamente por: Blessed Player.\n3️⃣ Clique em Instalar ou Obter.",
        arquivo: "./celular.jpg",
    },
};

function registrarVencimentoCliente(whatsapp, dias = 30) {
    const clientes = JSON.parse(fs.readFileSync(ARQUIVO_CLIENTES));
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + dias);

    const listaFiltrada = clientes.filter((c) => c.whatsapp !== whatsapp);
    listaFiltrada.push({
        whatsapp: whatsapp,
        vencimento: dataVencimento.toISOString().split("T")[0],
    });
    fs.writeFileSync(ARQUIVO_CLIENTES, JSON.stringify(listaFiltrada, null, 2));
}

async function executarCriacaoTeste() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    try {
        await page.goto(CONFIG_FAMILY.servidores.principal + "/login", {
            waitUntil: "networkidle2",
        });
        await page.type('input[type="text"]', "Weverson11@");
        await page.type('input[type="password"]', "Weverson12@");
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        await page.goto(
            CONFIG_FAMILY.servidores.principal + "#/customers/create-test",
        );
        await page.waitForSelector(".btn-generate-test");
        await page.click(".btn-generate-test");

        const dados = await page.evaluate(() => {
            return {
                user: document.querySelector(".username")?.innerText || "Erro",
                pass: document.querySelector(".password")?.innerText || "Erro",
                m3u: document.querySelector(".m3u-link")?.innerText || "Erro",
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
        const response = await axios.post(
            "https://api.mercadopago.com/v1/payments",
            {
                transaction_amount: valor,
                description: "Pagamento IPTV Family",
                payment_method_id: "pix",
                payer: { email: `id_${idCliente}@familyiptv.com` },
            },
            {
                headers: {
                    Authorization: `Bearer ${CONFIG_FAMILY.mercado_pago_token}`,
                },
            },
        );
        return response.data.point_of_interaction.transaction_data.qr_code;
    } catch (err) {
        console.error("Erro ao criar PIX:", err.response?.data || err.message);
        return null;
    }
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState("sessao_family");
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: (await import("pino")).default({ level: "silent" }),
    });

    if (!sock.authState.creds.registered) {
        const numeroDoBot = "5521980236044"; // ⚠️ MUDE PARA O NÚMERO DO SEU BOT (COM 55 + DDD)
        setTimeout(async () => {
            let code = await sock.requestPairingCode(numeroDoBot);
            console.log(`\n📌 SEU CÓDIGO DE ATIVAÇÃO DO WHATSAPP É: ${code}\n`);
        }, 3000);
    }

    const testesPendentesDeDispositivo = new Map();

    cron.schedule("0 9 * * *", async () => {
        console.log("🔍 Buscando clientes com vencimento próximo...");
        const clientes = JSON.parse(fs.readFileSync(ARQUIVO_CLIENTES));

        const alvoData = new Date();
        alvoData.setDate(alvoData.getDate() + 3);
        const dataAlvoStr = alvoData.toISOString().split("T")[0];

        for (const cliente of clientes) {
            if (cliente.vencimento === dataAlvoStr) {
                const pixCode = await criarPix(
                    CONFIG_FAMILY.planos.uma_tela_normal,
                    cliente.whatsapp,
                );
                if (pixCode) {
                    const textoAlerta = `⚠️ *AVISO DE VENCIMENTO IPTV FAMILY* ⚠️\n\nOlá! Passando para lembrar que o seu acesso mensal de 1 tela vence em *3 dias*.\n\nPara renovar seu sinal antecipadamente por mais 30 dias e evitar o bloqueio automático, use o código *PIX Copia e Cola* padrão de *R$ 35,00* abaixo:`;
                    await sock.sendMessage(cliente.whatsapp, {
                        text: textoAlerta,
                    });
                    await sock.sendMessage(cliente.whatsapp, {
                        text: `${pixCode}`,
                    });
                }
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const de = msg.key.remoteJid;
        const respostaCliente = (
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            ""
        )
            .trim()
            .toLowerCase();

        if (respostaCliente.startsWith("#pix ")) {
            if (
                de === CONFIG_FAMILY.dono_numero ||
                msg.key.participant === CONFIG_FAMILY.dono_numero
            ) {
                const valorInformado = parseFloat(
                    respostaCliente.replace("#pix ", "").replace(",", "."),
                );
                if (!isNaN(valorInformado) && valorInformado > 0) {
                    await sock.sendMessage(de, {
                        text: `⏳ Gerando PIX no valor personalizado de *R$ ${valorInformado.toFixed(2)}*...`,
                    });
                    const pixCode = await criarPix(valorInformado, de);
                    if (pixCode) {
                        await sock.sendMessage(de, {
                            text: `📱 *PIX COPIA E COLA GERADO (Valor: R$ ${valorInformado.toFixed(2)}):*\n\n${pixCode}\n\n_Efetue o pagamento no seu banco para processar a sua renovação._`,
                        });
                        registrarVencimentoCliente(de, 30);
                    }
                }
                return;
            }
        }

        if (
            de === CONFIG_FAMILY.dono_numero &&
            respostaCliente.startsWith("#aprovar")
        ) {
            const revendedor = respostaCliente.replace("#aprovar ", "");
            await sock.sendMessage(de, {
                text: `✅ Comando aceito! Acesse o painel para injetar os 1.000 créditos no usuário *${revendedor}* e cravá-lo no dia 07.`,
            });
            return;
        }

        if (testesPendentesDeDispositivo.has(de)) {
            const opcaoTv = parseInt(respostaCliente);
            if (opcaoTv >= 1 && opcaoTv <= 6) {
                const conta = testesPendentesDeDispositivo.get(de);
                testesPendentesDeDispositivo.delete(de);
                historicoTestes.add(de);

                await sock.sendMessage(de, {
                    text: `✅ *TESTE DE 2 HORAS GERADO COM SUCESSO!*\n\n👤 *Usuário:* ${conta.user}\n🔑 *Senha:* ${conta.pass}\n🔗 *Link M3U:* ${conta.m3u}`,
                });

                const tutorial = TUTORIAIS[opcaoTv];
                if (fs.existsSync(tutorial.arquivo)) {
                    await sock.sendMessage(de, {
                        image: fs.readFileSync(tutorial.arquivo),
                        caption: tutorial.texto,
                    });
                } else {
                    await sock.sendMessage(de, { text: tutorial.texto });
                }
            } else {
                await sock.sendMessage(de, {
                    text: "⚠️ Opção inválida. Digite um número de 1 a 6 correspondente ao seu aparelho.",
                });
            }
            return;
        }

        if (
            [
                "oi",
                "menu",
                "ola",
                "olá",
                "ajuda",
                "bom dia",
                "boa tarde",
                "boa noite",
            ].includes(respostaCliente)
        ) {
            const menuText = `Olá! Seja muito bem-vindo à *${CONFIG_FAMILY.nome}*! 🍿✨\n\nEscolha uma opção digitando apenas o número:\n\n1️⃣ *Teste Grátis (2 Horas)*\n2️⃣ *Contratar 1 Tela (Adesão Novos)* - De R$ 35 por R$ 25 no 1º mês\n3️⃣ *Contratar 2 Telas (Fixo)* - R$ 60,00\n4️⃣ *Quero Ser Revendedor* - Invista R$ 50 e ganhe 1.000 créditos\n5️⃣ *Instalar Aplicativos (Suporte Técnico)*\n6️⃣ *Clientes Antigos / Renovações (Suporte Humano)*`;
            await sock.sendMessage(de, { text: menuText });
        } else if (respostaCliente === "1") {
            if (historicoTestes.has(de)) {
                await sock.sendMessage(de, {
                    text: "⚠️ Aviso do Sistema: Identificamos que este número já utilizou um teste gratuito nos últimos 30 dias. Para continuar assistindo, escolha o plano promocional de R$ 25,00 digitando 2.",
                });
            } else {
                await sock.sendMessage(de, {
                    text: "⏳ Acessando o servidor principal Krypthon-VIP... Aguarde 10 segundos.",
                });
                const conta = await executarCriacaoTeste();
                if (conta) {
                    testesPendentesDeDispositivo.set(de, conta);
                    const menuAparelhos = `💻 *Para enviar o tutorial correto do aplicativo Blessed Player, digite o número correspondente ao seu aparelho:*\n\n1️⃣ Smart TV *Samsung*\n2️⃣ Smart TV *LG*\n3️⃣ Smart TV *TCL / Sistema Android TV*\n4️⃣ Aparelho *Firestick*\n5️⃣ Sistema *Roku TV*\n6️⃣ Celular (*Android ou iPhone*)`;
                    await sock.sendMessage(de, { text: menuAparelhos });
                } else {
                    await sock.sendMessage(de, {
                        text: "⚠️ Servidor instável. Digite 6 para falar com o suporte humano.",
                    });
                }
            }
        } else if (respostaCliente === "2") {
            await sock.sendMessage(de, {
                text: `🎉 Excelente escolha! O valor padrão do nosso Plano Mensal de 1 Tela é de *R$ 35,00*.\n\n🔥 Mas com a nossa *Promoção de Boas-Vindas*, no seu primeiro mês você paga apenas *R$ 25,00*!\n\nAguarde, gerando PIX Copia e Cola...`,
            });
            const pixCode = await criarPix(
                CONFIG_FAMILY.planos.uma_tela_desconto,
                de,
            );
            if (pixCode) {
                await sock.sendMessage(de, {
                    text: `📱 *PIX COPIA E COLA PROMOCIONAL (Valor: R$ 25,00):*\n\n${pixCode}\n\n_Copie o código acima e efetue o pagamento no seu banco._`,
                });
                registrarVencimentoCliente(de, 30);
            }
        } else if (respostaCliente === "3") {
            await sock.sendMessage(de, {
                text: `📺 *Plano 2 Telas (Fixo): R$ 60,00 mensais.*\n\nGerando a sua chave PIX de pagamento...`,
            });
            const pixCode = await criarPix(CONFIG_FAMILY.planos.duas_telas, de);
            if (pixCode) {
                await sock.sendMessage(de, {
                    text: `📱 *PIX COPIA E COLA (Valor: R$ 60,00):*\n\n${pixCode}\n\n_Copie o código acima e efetue o pagamento._`,
                });
                registrarVencimentoCliente(de, 30);
            }
        } else if (respostaCliente === "4") {
            const revendaMsg = `💼 *Seja bem-vindo à Revenda IPTV FAMILY!*\n\n• Mensalidade Fixa: R$ 50,00\n• Bônus Exclusivo: 1.000 Créditos\n• Vencimento Fixo: Todo dia 07\n\n*Passo 1:* Crie sua conta com 1 crédito grátis no link:\n🔗 ${CONFIG_FAMILY.link_indicacao_revenda}\n\n*Passo 2:* Para ativar sua licença e validar o bônus de 1.000 créditos, realize o pagamento do PIX abaixo:`;
            await sock.sendMessage(de, { text: revendaMsg });
            const pixCode = await criarPix(
                CONFIG_FAMILY.planos.taxa_revenda,
                de,
            );
            if (pixCode) {
                await sock.sendMessage(de, { text: `${pixCode}` });
                await sock.sendMessage(CONFIG_FAMILY.dono_numero, {
                    text: `🚨 *ALERTA DE REVENDA:* O número ${de} solicitou os dados de revendedor. Assim que o pagamento cair, envie o comando *#aprovar [username_dele]* para autorizar.`,
                });
            }
        } else if (respostaCliente === "5") {
            await sock.sendMessage(de, {
                text: "📺 Menu Geral de Tutoriais — Escolha seu aparelho digitando de 1 a 6:\n\n1️⃣ Smart TV Samsung\n2️⃣ Smart TV LG\n3️⃣ Smart TV TCL / Android TV\n4️⃣ Aparelho Firestick\n5️⃣ Sistema Roku TV\n6️⃣ Celular (Android ou iPhone)",
            });
            testesPendentesDeDispositivo.set(de, {
                user: "Apenas Suporte",
                pass: "N/A",
                m3u: "N/A",
            });
        } else if (respostaCliente === "6") {
            const agora = new Date();
            const dataBrasilia = new Date(
                agora.toLocaleString("en-US", {
                    timeZone: "America/Sao_Paulo",
                }),
            );

            const diaSemana = dataBrasilia.getDay();
            const horaAtual = dataBrasilia.getHours();
            let expedienteAberto = false;

            if (diaSemana >= 1 && diaSemana <= 5) {
                if (horaAtual >= 9 && horaAtual < 17) expedienteAberto = true;
            } else if (diaSemana === 6) {
                if (horaAtual >= 9 && horaAtual < 14) expedienteAberto = true;
            }

            if (expedienteAberto) {
                await sock.sendMessage(de, {
                    text: "🛎️ Entendido! Notifiquei o meu supervisor. Um atendente humano vai assumir o chat para falar com você em instantes. Por favor, deixe sua dúvida por escrito abaixo!",
                });
                await sock.sendMessage(CONFIG_FAMILY.dono_numero, {
                    text: `🛎️ *SUPORTE HUMANO SOLICITADO:* O cliente ${de} aguarda atendimento para renovação personalizada.`,
                });
            } else {
                const msgFechado = `👋 Olá! No momento nosso atendimento humano está *ENCERRADO*.\n\n⏳ Mas não se preocupe! Deixe sua dúvida ou comprovante por escrito aqui no chat. Assim que nossa equipe iniciar o próximo expediente, você será atendido com prioridade!\n\n🗓️ *Nosso Horário de Suporte Humano:*\n• Segunda a Sexta-feira: 09h às 17h\n• Sábado: 09h às 14h\n• Domingos e Feriados: *Fechado*`;
                await sock.sendMessage(de, { text: msgFechado });
            }
        }
    });
}

iniciarBot();
