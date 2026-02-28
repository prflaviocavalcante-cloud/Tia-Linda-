import { db, auth } from '../firebase-config.js';

import { 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc, 
    addDoc, query, orderBy, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { setPersistence, browserLocalPersistence }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Persistência ativada");
    })
    .catch((error) => {
        console.error("Erro persistência:", error);
    });

const somNotificacao = new Audio('alerta.mp3'); 
let quantidadePedidosAnterior = -1;
let categoriaAtiva = null; 
let listaPedidos = [];

onAuthStateChanged(auth, (user) => {
    
    const telaLogin = document.getElementById("tela-login");
    const painel = document.getElementById("painel-adm");
    
    if (user) {
        console.log("Usuário logado:", user.email);
        
        if (telaLogin) telaLogin.style.display = "none";
        if (painel) painel.style.display = "flex"; // ⚠ layout usa flex
        
    } else {
        console.log("Usuário não logado");
        
        if (telaLogin) telaLogin.style.display = "flex";
        if (painel) painel.style.display = "none";
    }
    
});

// Escutador global de pedidos para relatórios
onSnapshot(collection(db, "pedidos"), (snapshot) => {
    listaPedidos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
});

// ================= 1. LOGIN E CONTROLE DE ACESSO =================
onAuthStateChanged(auth, (user) => {
    const telaLogin = document.getElementById("tela-login");
    const painelAdm = document.getElementById("painel-adm");
    if (user) {
        if(telaLogin) telaLogin.style.display = "none";
        if(painelAdm) painelAdm.style.display = "flex";
        window.navegar('pedidos');
    } else {
        if(telaLogin) telaLogin.style.display = "flex";
        if(painelAdm) painelAdm.style.display = "none";
    }
});

document.getElementById("btn-login").onclick = async () => {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, senha);
        
        // 🔥 Redirecionamento após login
        window.location.replace("painel.html");
        
    } catch (e) {
        alert("Erro ao entrar! Verifique e-mail e senha.");
    }
};
document.getElementById("btn-logout").onclick = () => signOut(auth);

// ================= 2. NAVEGAÇÃO PRINCIPAL =================
window.navegar = (pagina) => {
    const titulo = document.getElementById("titulo-pagina");
    const area = document.getElementById("area-trabalho");
    area.innerHTML = "<p style='color:white'>Carregando...</p>";

    if(pagina === 'pedidos') {
        titulo.innerText = "📦 Pedidos em Tempo Real";
        renderizarPedidos();
    } else if(pagina === 'cardapio') {
        titulo.innerText = "📋 Gerenciar Cardápio";
        categoriaAtiva = null; 
        window.renderizarGestaoCardapio();
    } else if(pagina === 'categorias') {
        titulo.innerText = "📁 Gerenciar Categorias";
        window.renderizarGerenciarCategorias();
    } else if(pagina === 'vendas') {
        titulo.innerText = "💰 Vendas e Caixa";
        window.renderizarVendasCaixa();
    } else if(pagina === 'financeiro') {
        titulo.innerText = "📊 Financeiro e Lucro Real";
        window.renderizarFinanceiro();
    }
};

// ================= 3. GESTÃO DO CARDÁPIO =================
window.renderizarGestaoCardapio = () => {
    const area = document.getElementById("area-trabalho");
    if (!categoriaAtiva) {
        area.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color:white">Pastas do Cardápio</h3>
                <button onclick="window.abrirModalProduto()" class="btn-sucesso">+ Novo Produto</button>
            </div>
            <div id="grade-categorias" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px;"></div>
        `;
        gerarCardsCategorias();
    } else {
        area.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button onclick="window.voltarParaCategorias()" style="background:#334155; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; margin-bottom:15px;">⬅ Voltar</button>
                <h3 style="color:white">Pasta: <span style="color:#22c55e">${categoriaAtiva}</span></h3>
            </div>
            <div class="card">
                <table style="width:100%;">
                    <thead>
                        <tr style="text-align:left; color:#94a3b8;">
                            <th style="padding:10px;">Produto</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabela-produtos-categoria"></tbody>
                </table>
            </div>
        `;
        renderizarProdutosDaCategoria(categoriaAtiva);
    }
    carregarCategoriasNoSelect();
};

function gerarCardsCategorias() {
    const container = document.getElementById('grade-categorias');
    onSnapshot(collection(db, "categorias"), (snapshot) => {
        if(!container) return;
        container.innerHTML = "";
        
        const cardOrfaos = document.createElement('div');
        cardOrfaos.className = "card-financeiro bg-pedidos";
        cardOrfaos.style.cursor = "pointer";
        cardOrfaos.innerHTML = `<h3>⚠️ Pendentes</h3><p>Itens sem pasta</p>`;
        cardOrfaos.onclick = () => { categoriaAtiva = "Nenhuma"; window.renderizarGestaoCardapio(); };
        container.appendChild(cardOrfaos);

        snapshot.forEach(docSnap => {
            const cat = docSnap.data();
            const card = document.createElement('div');
            card.className = "card-financeiro bg-lucro";
            card.style.cursor = "pointer";
            card.innerHTML = `<h3>📁 ${cat.nome.toUpperCase()}</h3><p>Ver itens</p>`;
            card.onclick = () => { categoriaAtiva = cat.nome; window.renderizarGestaoCardapio(); };
            container.appendChild(card);
        });
    });
}

function renderizarProdutosDaCategoria(nomeCat) {
    const tbody = document.getElementById('tabela-produtos-categoria');
    
    const produtosRef = collection(db, "produtos");
    const q = query(produtosRef, orderBy("ordem", "asc"));
    
    onSnapshot(q, (snapshot) => {
        if (!tbody) return;
        tbody.innerHTML = "";
        
        snapshot.forEach(fbDoc => {
            const item = fbDoc.data();
            const id = fbDoc.id;
            
            const pertence = (nomeCat === "Nenhuma") ?
                (!item.categoria) :
                (item.categoria === nomeCat);
            
            if (pertence) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:12px;">${item.nome}</td>
                    <td>R$ ${Number(item.preco).toFixed(2)}</td>
                    <td>${item.estoque || 0}</td>
                    <td>
                        <button onclick="window.alternarStatusProduto('${id}', ${item.ativo})"
                            style="background:none; border:none; color:${item.ativo ? '#22c55e' : '#ef4444'}; cursor:pointer;">
                            ${item.ativo ? '● Ativo' : '○ Pausado'}
                        </button>
                    </td>
                    <td>
                        <button onclick="window.abrirModalProduto('${id}')" style="background:none; border:none; cursor:pointer;">📝</button>
                        <button onclick="window.excluirProduto('${id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
    });
}

window.voltarParaCategorias = () => {
    categoriaAtiva = null;
    window.renderizarGestaoCardapio();
};

// ================= 4. PRODUTOS E STATUS =================
window.alternarStatusProduto = async (id, statusAtual) => {
    await updateDoc(doc(db, "produtos", id), { ativo: !statusAtual });
};

window.excluirProduto = async (id) => {
    if(confirm("Excluir produto definitivamente?")) await deleteDoc(doc(db, "produtos", id));
};

window.abrirModalProduto = async function(id = null) {
    const modal = document.getElementById('modal-produto');
    const inputId = document.getElementById('p-id-edit');
    
    modal.style.display = 'flex';
    
    if (id) {
        const snap = await getDoc(doc(db, "produtos", id));
        if (!snap.exists()) return;
        
        const p = snap.data();
        
        inputId.value = id;
        document.getElementById('p-nome').value = p.nome || "";
        document.getElementById('p-venda').value = p.preco || 0;
        document.getElementById('p-custo').value = p.precoCusto || 0;
        document.getElementById('p-estoque').value = p.estoque || 0;
        document.getElementById('p-tipo-select').value = p.categoria || "";
        document.getElementById('p-descricao').value = p.descricao || "";
        
        // ✅ AQUI ESTÁ A CORREÇÃO DA ORDEM
        document.getElementById('p-ordem').value = p.ordem || 0;
    
        // ✅ IMAGEM DO PRODUTO
        document.getElementById('p-imagem-link').value = p.imagem || "";
        
    } else {
        // Novo produto
        inputId.value = "";
        document.getElementById('p-nome').value = "";
        document.getElementById('p-venda').value = "";
        document.getElementById('p-custo').value = "";
        document.getElementById('p-estoque').value = "";
        document.getElementById('p-tipo-select').value = "";
        document.getElementById('p-descricao').value = "";
        
        // ✅ Zera a ordem ao criar novo
        document.getElementById('p-ordem').value = "";
    }
};
window.fecharModal = () => document.getElementById('modal-produto').style.display = 'none';

document.getElementById('btn-salvar-produto').onclick = async () => {
    const id = document.getElementById('p-id-edit').value;
    
    const dados = {
        nome: document.getElementById('p-nome').value,
        preco: Number(document.getElementById('p-venda').value) || 0,
        precoCusto: Number(document.getElementById('p-custo').value) || 0,
        estoque: Number(document.getElementById('p-estoque').value) || 0,
        categoria: document.getElementById('p-tipo-select').value,
        descricao: document.getElementById('p-descricao').value || "",
        ordem: Number(document.getElementById('p-ordem').value) || 0,
        
        // ✅ agora cada produto tem sua própria imagem
        imagem: document.getElementById('p-imagem-link').value || "",
        
        timestamp: serverTimestamp()
    };
    
    if (id) {
        await updateDoc(doc(db, "produtos", id), dados);
    } else {
        dados.ativo = true;
        await addDoc(collection(db, "produtos"), dados);
    }
    
    window.fecharModal();
};

function carregarCategoriasNoSelect() {
    const select = document.getElementById('p-tipo-select');
    
    onSnapshot(collection(db, "categorias"), (snapshot) => {
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecionar Categoria...</option>';
        
        snapshot.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.data().nome;
            opt.innerText = d.data().nome;
            select.appendChild(opt);
        });
    });
}
// ================= 5. PEDIDOS EM TEMPO REAL =================
window.alterarStatus = async (id, novoStatus) => {
    await updateDoc(doc(db, "pedidos", id), { status: novoStatus });
};

function renderizarPedidos() {
    const area = document.getElementById("area-trabalho");
    area.innerHTML = `<div id="lista-pedidos" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:15px;"></div>`;
    
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        const container = document.getElementById('lista-pedidos');
        if (!container) return;
        container.innerHTML = "";
        
        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            const id = docSnap.id;
            if (p.status === 'concluido') return;
            
            const corStatus = { recebido: "#eab308", andamento: "#3b82f6", enviado: "#22c55e" };
            const card = document.createElement("div");
            card.className = "card";
            card.style = `border-left:5px solid ${corStatus[p.status] || "#64748b"}; padding:15px; background:#1e293b; color:white; border-radius:8px;`;
            
            card.innerHTML = `
                <div style="margin-bottom:10px;">
                    <b>👤 ${p.cliente}</b>
                    <p>💰 R$ ${Number(p.total).toFixed(2)}</p>
                    <small style="color:#94a3b8;">${p.itens ? p.itens.map(i => i.nome).join(', ') : ''}</small>
                </div>
                <div style="display:flex;gap:5px;flex-wrap:wrap;">
                    <button onclick="window.alterarStatus('${id}','recebido')" style="background:#eab308; padding:5px 8px; border-radius:4px; border:none; cursor:pointer;">Recebido</button>
                    <button onclick="window.alterarStatus('${id}','andamento')" style="background:#3b82f6; padding:5px 8px; border-radius:4px; border:none; color:white; cursor:pointer;">Andamento</button>
                    <button onclick="window.alterarStatus('${id}','enviado')" style="background:#22c55e; padding:5px 8px; border-radius:4px; border:none; color:white; cursor:pointer;">Enviado</button>
                    <button onclick="window.alterarStatus('${id}','concluido')" style="background:#64748b; padding:5px 8px; border-radius:4px; border:none; color:white; cursor:pointer;">Concluir</button>
                </div>
            `;
            container.appendChild(card);
        });
        if (quantidadePedidosAnterior !== -1 && snapshot.size > quantidadePedidosAnterior) somNotificacao.play().catch(() => {});
        quantidadePedidosAnterior = snapshot.size;
    });
}

// ================= 6. VENDAS E CAIXA =================
window.renderizarVendasCaixa = () => {
    const area = document.getElementById("area-trabalho");
    area.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div class="card-financeiro bg-lucro"><h3>💰 Faturamento</h3><p id="faturamento-hoje">R$ 0,00</p></div>
            <div class="card-financeiro bg-pedidos"><h3>📦 Concluídos</h3><p id="total-vendas-count">0</p></div>
        </div>
        <div class="card"><table style="width:100%; color:white;"><thead><tr style="text-align:left; border-bottom:1px solid #334155;"><th style="padding:10px;">Data</th><th>Cliente</th><th>Total</th></tr></thead><tbody id="tabela-vendas-corpo"></tbody></table></div>
    `;
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        const tbody = document.getElementById('tabela-vendas-corpo');
        if (!tbody) return;
        let total = 0, count = 0;
        tbody.innerHTML = "";
        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            if (p.status === 'concluido') {
                total += Number(p.total); count++;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:10px;">${p.timestamp?.toDate().toLocaleString() || '---'}</td><td>${p.cliente}</td><td style="color:#22c55e;">R$ ${Number(p.total).toFixed(2)}</td>`;
                tbody.prepend(tr);
            }
        });
        document.getElementById('faturamento-hoje').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('total-vendas-count').innerText = count;
    });
};

// ================= 7. CATEGORIAS =================
window.renderizarGerenciarCategorias = () => {
    const area = document.getElementById("area-trabalho");
    area.innerHTML = `
    <div class="card" style="max-width: 500px; margin: 0 auto;">
        <h3 style="color:white;">Pastas</h3>
        <div style="display:flex; gap:10px; margin: 20px 0;">
            <input type="text" id="cat-nome-input" placeholder="Nova pasta...">
            <button id="btn-add-cat" class="btn-sucesso" type="button">Adicionar</button>
        </div>
        <div id="lista-categorias-adm"></div>
    </div>`;
    
    document.getElementById('btn-add-cat').onclick = async () => {
        const nome = document.getElementById('cat-nome-input').value;
        if (nome) await addDoc(collection(db, "categorias"), { nome });
        document.getElementById('cat-nome-input').value = "";
    };
    
    onSnapshot(collection(db, "categorias"), (snapshot) => {
        const lista = document.getElementById('lista-categorias-adm');
        if (!lista) return;
        lista.innerHTML = "";
        snapshot.forEach(d => {
            const item = document.createElement('div');
            item.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #334155; color:white;";
            item.innerHTML = `
                <span>📁 ${d.data().nome}</span>
                <button onclick="window.excluirCategoria('${d.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>`;
            lista.appendChild(item);
        });
    });
};

window.excluirCategoria = async (id) => { if(confirm("Excluir pasta?")) await deleteDoc(doc(db, "categorias", id)); };

// ================= 9. FINANCEIRO E DESPESAS =================
window.renderizarFinanceiro = () => {
    const area = document.getElementById("area-trabalho");
    area.innerHTML = `
        <div class="resumo-vendas" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
            <div class="card-financeiro bg-lucro"><h3>💰 Entradas</h3><p id="fin-entradas">R$ 0,00</p></div>
            <div class="card-financeiro bg-pedidos" style="background:#ef4444;"><h3>💸 Saídas</h3><p id="fin-saidas">R$ 0,00</p></div>
            <div class="card-financeiro bg-faturamento" id="card-lucro-real"><h3>📈 Lucro Líquido</h3><p id="fin-lucro">R$ 0,00</p></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="card">
                <h3 style="color:white; margin-bottom:15px;">📥 Lançar Gasto</h3>
                <input type="text" id="desp-nome" placeholder="Nome do gasto">
                <select id="desp-tipo"><option value="Compra">Insumos</option><option value="Fixa">Fixa</option></select>
                <input type="number" id="desp-valor" placeholder="Valor R$">
                <button onclick="window.salvarDespesa()" class="btn-sucesso" style="width:100%;">Salvar Gasto</button>
            </div>
            <div class="card">
                <h3 style="color:white; margin-bottom:15px;">📄 Gerar Relatórios (Excel)</h3>
                <button onclick="window.gerarDiario()" style="width:100%; margin-bottom:10px; background:#334155; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">📅 Diário</button>
                <button onclick="window.gerarSemanal()" style="width:100%; margin-bottom:10px; background:#334155; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">📆 Semanal</button>
                <button onclick="window.gerarMensal()" style="width:100%; margin-bottom:10px; background:#334155; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">🗓️ Mensal</button>
                <button onclick="window.gerarAnual()" style="width:100%; background:#334155; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">📊 Anual</button>
            </div>
        </div>
        <div class="card" style="margin-top:20px;"><h3 style="color:white; margin-bottom:10px;">📉 Últimos Lançamentos</h3><table style="width:100%; color:white;"><tbody id="lista-despesas"></tbody></table></div>
    `;
    carregarResumoFinanceiro();
};

window.salvarDespesa = async () => {
    const nome = document.getElementById('desp-nome').value;
    const tipo = document.getElementById('desp-tipo').value;
    const valor = Number(document.getElementById('desp-valor').value);
    if(nome && valor) {
        await addDoc(collection(db, "financeiro"), { nome, tipo, valor, data: serverTimestamp() });
        document.getElementById('desp-nome').value = ""; document.getElementById('desp-valor').value = "";
    }
};

async function carregarResumoFinanceiro() {
    onSnapshot(collection(db, "pedidos"), (snap) => {
        let ent = 0; snap.forEach(d => { if(d.data().status === 'concluido') ent += Number(d.data().total); });
        const el = document.getElementById('fin-entradas'); if(el) el.innerText = `R$ ${ent.toFixed(2)}`;
        calcularSaldoFinal();
    });
    onSnapshot(collection(db, "financeiro"), (snap) => {
        const lista = document.getElementById('lista-despesas'); let sai = 0;
        if(lista) lista.innerHTML = "";
        snap.forEach(d => {
            const desp = d.data(); sai += desp.valor;
            if(lista) { const tr = document.createElement('tr'); tr.innerHTML = `<td>${desp.nome}</td><td style="color:#ef4444">- R$ ${desp.valor.toFixed(2)}</td>`; lista.prepend(tr); }
        });
        const elSai = document.getElementById('fin-saidas'); if(elSai) elSai.innerText = `R$ ${sai.toFixed(2)}`;
        calcularSaldoFinal();
    });
}

function calcularSaldoFinal() {
    const elEnt = document.getElementById('fin-entradas'); const elSai = document.getElementById('fin-saidas'); const elLucro = document.getElementById('fin-lucro');
    if(!elEnt || !elSai || !elLucro) return;
    const lucro = parseFloat(elEnt.innerText.replace('R$ ', '')) - parseFloat(elSai.innerText.replace('R$ ', ''));
    elLucro.innerText = `R$ ${lucro.toFixed(2)}`;
    document.getElementById('card-lucro-real').style.background = lucro >= 0 ? "#1e293b" : "#7f1d1d";
}

// ================= 10. GERAÇÃO DE PDF =================
const filtrarVendasPorPeriodo = (dias) => {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return listaPedidos.filter(p => {
        if (!p.timestamp || p.status !== "concluido") return false;
        const dt = p.timestamp.toDate ? p.timestamp.toDate() : new Date(p.timestamp.seconds * 1000);
        return dt >= limite;
    });
};

// ================= 10. GERAÇÃO DE RELATÓRIO EM EXCEL (CORRIGIDO) =================

// ================= 10. MOTOR DE EXCEL =================
window.exportarParaExcel = (titulo) => {
    if (typeof XLSX === 'undefined') {
        alert("Biblioteca Excel ainda carregando...");
        return;
    }
    
    let dias = 1;
    if (titulo === "Semanal") dias = 7;
    else if (titulo === "Mensal") dias = 30;
    else if (titulo === "Anual") dias = 365;
    
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    
    const filtrados = listaPedidos.filter(p => {
        if (!p.timestamp || p.status !== "concluido") return false;
        const dt = p.timestamp.toDate ?
            p.timestamp.toDate() :
            new Date(p.timestamp.seconds * 1000);
        return dt >= limite;
    });
    
    if (filtrados.length === 0) {
        alert("Nenhum pedido concluído neste período.");
        return;
    }
    
    const dados = filtrados.map(p => ({
        "Data": p.timestamp.toDate ?
            p.timestamp.toDate().toLocaleString() :
            new Date(p.timestamp.seconds * 1000).toLocaleString(),
        "Cliente": p.cliente,
        "Total (R$)": Number(p.total).toFixed(2),
        "Itens": p.itens ? p.itens.map(i => i.nome).join(", ") : ""
    }));
    
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    const dataUri = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + wbout;
    
    // 🔥 ESTA LINHA É A DIFERENÇA
    window.location.href = dataUri;
};

// Vinculação Global
window.gerarDiario = () => window.exportarParaExcel("Diario");
window.gerarSemanal = () => window.exportarParaExcel("Semanal");
window.gerarMensal = () => window.exportarParaExcel("Mensal");
window.gerarAnual = () => window.exportarParaExcel("Anual");
