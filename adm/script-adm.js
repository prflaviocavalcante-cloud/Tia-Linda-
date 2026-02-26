// ================= IMPORTS =================
import { db, auth } from '../firebase-config.js';

import {
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// ================= CONFIG INICIAL =================
await setPersistence(auth, browserLocalPersistence);

const somNotificacao = new Audio('alerta.mp3');

let categoriaAtiva = null;
let listaPedidos = [];
let quantidadePedidosAnterior = -1;


// ================= AUTENTICAÇÃO =================
onAuthStateChanged(auth, (user) => {
    const telaLogin = document.getElementById("tela-login");
    const painel = document.getElementById("painel-adm");

    if (user) {
        telaLogin.style.display = "none";
        painel.style.display = "flex";
        window.navegar("pedidos");
    } else {
        telaLogin.style.display = "flex";
        painel.style.display = "none";
    }
});

document.getElementById("btn-login").onclick = async () => {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        window.location.replace("painel.html");
    } catch {
        alert("Erro ao entrar! Verifique e-mail e senha.");
    }
};

document.getElementById("btn-logout").onclick = () => signOut(auth);


// ================= NAVEGAÇÃO =================
window.navegar = (pagina) => {
    const titulo = document.getElementById("titulo-pagina");
    const area = document.getElementById("area-trabalho");
    area.innerHTML = "<p style='color:white'>Carregando...</p>";

    const paginas = {
        pedidos: () => { titulo.innerText = "📦 Pedidos"; renderizarPedidos(); },
        cardapio: () => { titulo.innerText = "📋 Cardápio"; categoriaAtiva = null; renderizarGestaoCardapio(); },
        categorias: () => { titulo.innerText = "📁 Categorias"; renderizarCategorias(); },
        vendas: () => { titulo.innerText = "💰 Vendas"; renderizarVendas(); },
        financeiro: () => { titulo.innerText = "📊 Financeiro"; renderizarFinanceiro(); }
    };

    paginas[pagina]?.();
};


// ================= CARDÁPIO =================
function renderizarGestaoCardapio() {
    const area = document.getElementById("area-trabalho");

    if (!categoriaAtiva) {
        area.innerHTML = `
            <button onclick="window.abrirModalProduto()" class="btn-sucesso">+ Novo Produto</button>
            <div id="grade-categorias"></div>
        `;
        gerarCategorias();
    } else {
        area.innerHTML = `
            <button onclick="window.voltarCategorias()">⬅ Voltar</button>
            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="tabela-produtos"></tbody>
            </table>
        `;
        renderizarProdutos();
    }
}

function gerarCategorias() {
    const container = document.getElementById("grade-categorias");

    onSnapshot(collection(db, "categorias"), (snapshot) => {
        container.innerHTML = "";

        snapshot.forEach(docSnap => {
            const cat = docSnap.data();
            const div = document.createElement("div");
            div.innerHTML = `📁 ${cat.nome}`;
            div.style.cursor = "pointer";
            div.onclick = () => {
                categoriaAtiva = cat.nome;
                renderizarGestaoCardapio();
            };
            container.appendChild(div);
        });
    });
}

function renderizarProdutos() {
    const tbody = document.getElementById("tabela-produtos");

    onSnapshot(collection(db, "produtos"), (snapshot) => {

        const produtos = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        produtos.sort((a, b) =>
            (Number(a.ordem) || 0) - (Number(b.ordem) || 0)
        );

        tbody.innerHTML = "";

        produtos.forEach(p => {
            if (p.categoria !== categoriaAtiva) return;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${p.nome}</td>
                <td>R$ ${Number(p.preco).toFixed(2)}</td>
                <td>${p.estoque || 0}</td>
                <td>
                    <button onclick="window.toggleProduto('${p.id}', ${p.ativo})">
                        ${p.ativo ? "Ativo" : "Pausado"}
                    </button>
                </td>
                <td>
                    <button onclick="window.abrirModalProduto('${p.id}')">Editar</button>
                    <button onclick="window.excluirProduto('${p.id}')">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

window.toggleProduto = async (id, status) => {
    await updateDoc(doc(db, "produtos", id), { ativo: !status });
};

window.excluirProduto = async (id) => {
    if (confirm("Excluir produto?"))
        await deleteDoc(doc(db, "produtos", id));
};

window.voltarCategorias = () => {
    categoriaAtiva = null;
    renderizarGestaoCardapio();
};


// ================= PEDIDOS =================
function renderizarPedidos() {
    const area = document.getElementById("area-trabalho");
    
    area.innerHTML = `
        <div id="lista-pedidos"
        style="display:grid;
               grid-template-columns:repeat(auto-fill,minmax(320px,1fr));
               gap:15px;">
        </div>
    `;
    
    onSnapshot(collection(db, "pedidos"), (snapshot) => {
        
        const pedidos = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));
        
        pedidos.sort((a, b) =>
            (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
        );
        
        const container = document.getElementById("lista-pedidos");
        container.innerHTML = "";
        
        pedidos.forEach(p => {
            
            if (p.status?.toLowerCase() === "concluido") return;
            
            const cores = {
                recebido: "#eab308",
                andamento: "#3b82f6",
                enviado: "#22c55e"
            };
            
            const card = document.createElement("div");
            card.className = "card";
            card.style = `
                border-left:5px solid ${cores[p.status] || "#64748b"};
                padding:15px;
                background:#1e293b;
                color:white;
                border-radius:8px;
            `;
            
            card.innerHTML = `
                <div style="margin-bottom:10px;">
                    <b>👤 ${p.cliente}</b>
                    <p style="margin:5px 0;">💰 R$ ${Number(p.total).toFixed(2)}</p>
                    <small style="color:#94a3b8;">
                        ${p.itens ? p.itens.map(i => i.nome).join(', ') : ''}
                    </small>
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
                    <button onclick="window.alterarStatus('${p.id}','recebido')"
                        style="background:#eab308;color:black;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
                        Recebido
                    </button>

                    <button onclick="window.alterarStatus('${p.id}','andamento')"
                        style="background:#3b82f6;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
                        Andamento
                    </button>

                    <button onclick="window.alterarStatus('${p.id}','enviado')"
                        style="background:#22c55e;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
                        Enviado
                    </button>

                    <button onclick="window.alterarStatus('${p.id}','concluido')"
                        style="background:#64748b;color:white;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;">
                        Concluir
                    </button>
                </div>
            `;
            
            container.appendChild(card);
        });
        
        if (quantidadePedidosAnterior !== -1 &&
            snapshot.size > quantidadePedidosAnterior) {
            somNotificacao.play().catch(() => {});
        }
        
        quantidadePedidosAnterior = snapshot.size;
    });
}
window.alterarStatus = async (id, novoStatus) => {
    try {
        await updateDoc(doc(db, "pedidos", id), {
            status: novoStatus.toLowerCase().trim()
        });
        
        console.log("Status atualizado para:", novoStatus);
        
    } catch (erro) {
        console.error("Erro ao atualizar status:", erro);
        alert("Erro ao atualizar status do pedido.");
    }
};

window.exportarParaExcel = (periodo) => {

    if (typeof XLSX === "undefined") {
        alert("Biblioteca Excel ainda carregando...");
        return;
    }

    const dias = { Diario: 1, Semanal: 7, Mensal: 30, Anual: 365 }[periodo] || 1;

    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    const filtrados = listaPedidos.filter(p => {
        if (!p.timestamp || p.status !== "concluido") return false;
        const dt = p.timestamp.toDate();
        return dt >= limite;
    });

    if (!filtrados.length) {
        alert("Nenhum pedido no período.");
        return;
    }

    const dados = filtrados.map(p => ({
        Data: p.timestamp.toDate().toLocaleString(),
        Cliente: p.cliente,
        Total: Number(p.total).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");

    XLSX.writeFile(wb, `Relatorio-${periodo}.xlsx`);
};

window.gerarDiario = () => exportarParaExcel("Diario");
window.gerarSemanal = () => exportarParaExcel("Semanal");
window.gerarMensal = () => exportarParaExcel("Mensal");
window.gerarAnual = () => exportarParaExcel("Anual");