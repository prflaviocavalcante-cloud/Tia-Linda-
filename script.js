import { db } from './firebase-config.js';

import {
    collection,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
/* ======================================
   VARIÁVEIS GLOBAIS
====================================== */

let produtos = []; // ← AGORA EXISTE
let carrinho = [];
let produtoSelecionado = null;
let adicionaisSelecionados = [];
let valorAtualProduto = 0;

/* ======================================
   FIREBASE - CARREGAR PRODUTOS
====================================== */

const produtosRef = collection(db, "produtos");
const q = query(produtosRef, orderBy("ordem", "asc"));

onSnapshot(q, (snapshot) => {
    console.log("🔥 Firebase conectou!");
    console.log("Quantidade de documentos:", snapshot.size);
    
    produtos = [];
    
    snapshot.forEach((doc) => {
        produtos.push({ id: doc.id, ...doc.data() });
    });
    
    console.log("Produtos ordenados:", produtos);
    
    carregarProdutos(produtos);
});

/* ======================================
   INICIALIZAÇÃO
====================================== */

document.addEventListener("DOMContentLoaded", () => {
    mostrarPrimeiraCategoria();
    verificarStatusLoja();
});

/* ======================================
   STATUS LOJA
====================================== */

function verificarStatusLoja() {
    const statusEl = document.getElementById("status-loja");
    if (!statusEl) return;

    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours();

    let aberto = (dia >= 1 && dia <= 6 && hora >= 10 && hora < 22);

    statusEl.innerText = aberto ? "🟢 Aberto agora" : "🔴 Fechado no momento";
    statusEl.style.color = aberto ? "green" : "red";
}

/* ======================================
   CATEGORIAS
====================================== */

window.mostrar = function(categoria, botao) {
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");

    const secao = document.getElementById(categoria);
    if (secao) secao.style.display = "block";

    document.querySelectorAll(".aba").forEach(btn => btn.classList.remove("ativa"));
    if (botao) botao.classList.add("ativa");
}

function mostrarPrimeiraCategoria() {
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");

    const primeira = document.getElementById("cuscuz");
    if (primeira) primeira.style.display = "block";

    const primeiraAba = document.querySelector(".aba");
    if (primeiraAba) primeiraAba.classList.add("ativa");
}

/* ======================================
   CARREGAR PRODUTOS
====================================== */

function carregarProdutos(listaProdutos) {
    
    const categorias = ["cuscuz", "pastel", "bebidas"];
    
    categorias.forEach(cat => {
        const container = document.getElementById(`lista-${cat}`);
        if (container) container.innerHTML = "";
    });
    
    listaProdutos.forEach(prod => {
        
        let categoriaDestino = prod.categoria
            ?.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        
        if (!categoriaDestino) return;
        
        // força mapeamento
        if (categoriaDestino.includes("cuscuz")) categoriaDestino = "cuscuz";
        if (categoriaDestino.includes("past")) categoriaDestino = "pastel";
        if (categoriaDestino.includes("beb")) categoriaDestino = "bebidas";
        
        const container = document.getElementById(`lista-${categoriaDestino}`);
        
        if (!container) return;
        
        const card = document.createElement("div");
        card.className = "card-produto";
        
        card.innerHTML = `
            <div class="card-info">
                <h3>${prod.nome}</h3>
                <p>Categoria: ${prod.categoria}</p>
                <p class="preco">R$ ${Number(prod.preco || 0).toFixed(2)}</p>
                <button onclick="adicionarProduto('${prod.id}')">Adicionar</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}/* ======================================
   ADICIONAR PRODUTO
====================================== */

window.adicionarProduto = function(id) {

    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    if (produto.categoria === "bebidas") {

        carrinho.push({
            nome: produto.nome,
            preco: produto.preco,
            qtd: 1,
            adicionais: []
        });

        atualizarCarrinho();
        atualizarBadge();

    } else {
        abrirModalAdicionais(produto);
    }
};

/* ======================================
   MODAL ADICIONAIS
====================================== */

window.abrirModalAdicionais = function(produto) {
    
    try {
        
        if (!produto) {
            alert("Erro ao abrir produto.");
            return;
        }
        
        if (!produtos || !Array.isArray(produtos)) {
            alert("Produtos ainda não carregados.");
            return;
        }
        
        produtoSelecionado = produto;
        adicionaisSelecionados = [];
        valorAtualProduto = parseFloat(produto.preco) || 0;
        
        const titulo = document.getElementById("tituloProduto");
        const lista = document.getElementById("listaAdicionais");
        const modal = document.getElementById("modalAdicionais");
        
        if (!titulo || !lista || !modal) {
            alert("Elementos do modal não encontrados.");
            return;
        }
        
        titulo.innerText = produto.nome;
        lista.innerHTML = "";
        
        const adicionais = produtos.filter(p =>
            p.categoria &&
            p.categoria.toLowerCase().trim() === "adicionais" &&
            p.ativo === true
        );
        
        console.log("Adicionais encontrados:", adicionais);
        
        if (adicionais.length === 0) {
            lista.innerHTML = "<p>Nenhum adicional disponível.</p>";
        } else {
            
            produtoSelecionado.adicionaisGlobais = adicionais;
            
            adicionais.forEach((adicional, index) => {
                
                const item = document.createElement("div");
                
                item.innerHTML = `
                    <label style="display:flex;justify-content:space-between;padding:8px 0;">
                        <div>
                            <input type="checkbox" onchange="toggleAdicionalGlobal(${index})">
                            ${adicional.nome}
                        </div>
                        <div>
                            + R$ ${Number(adicional.preco || 0).toFixed(2)}
                        </div>
                    </label>
                `;
                
                lista.appendChild(item);
            });
        }
        
        atualizarBotaoConfirmar();
        modal.style.display = "flex";
        
    } catch (erro) {
        console.error("Erro ao abrir modal:", erro);
        alert("Erro ao abrir adicionais. Veja o console.");
    }
};


/* ======================================
   FECHAR MODAL ADICIONAIS
====================================== */

window.fecharModal = function() {
    const modal = document.getElementById("modalAdicionais");
    if (modal) modal.style.display = "none";
    
    produtoSelecionado = null;
    adicionaisSelecionados = [];
    valorAtualProduto = 0;
};
/* ======================================
   CARRINHO
====================================== */

function atualizarBadge() {
    const badge = document.getElementById("qtd-itens");
    badge.innerText = carrinho.reduce((s, i) => s + i.qtd, 0);
}

function atualizarCarrinho() {

    const lista = document.getElementById("itensCarrinho");
    const totalEl = document.getElementById("totalCarrinho");

    lista.innerHTML = "";

    let total = 0;

    carrinho.forEach((item, index) => {

        const subtotal = item.preco * item.qtd;
        total += subtotal;

        const div = document.createElement("div");

        div.innerHTML = `
            <div>
                <strong>${item.nome}</strong><br>
                ${item.adicionais.join("<br>")}<br>
                R$ ${subtotal.toFixed(2)}
            </div>
            <div>
                <button onclick="diminuir(${index})">−</button>
                ${item.qtd}
                <button onclick="aumentar(${index})">+</button>
            </div>
        `;

        lista.appendChild(div);
    });

    totalEl.innerText = `Total: R$ ${total.toFixed(2)}`;
}

window.aumentar = function(i) {
    carrinho[i].qtd++;
    atualizarCarrinho();
    atualizarBadge();
};

window.diminuir = function(i) {
    carrinho[i].qtd--;
    if (carrinho[i].qtd <= 0) carrinho.splice(i, 1);
    atualizarCarrinho();
    atualizarBadge();
};

window.abrirCarrinho = function() {
    document.getElementById("modalCarrinho").style.display = "flex";
};

window.fecharCarrinho = function() {
    document.getElementById("modalCarrinho").style.display = "none";
};

window.finalizarPedido = function() {
    if (carrinho.length === 0) return alert("Carrinho vazio");
    document.getElementById("modalFinalizacao").style.display = "flex";
};

window.fecharFinalizacao = function() {
    document.getElementById("modalFinalizacao").style.display = "none";
};

window.enviarPedidoWhatsApp = async function() {
    
    const nome = document.getElementById("nomeCliente").value;
    const endereco = document.getElementById("enderecoCliente").value;
    
    if (!nome || !endereco) {
        alert("Preencha os campos");
        return;
    }
    
    let msg = `*Pedido - Tia Linda*%0A%0A`;
    
    carrinho.forEach(i => {
        msg += `• ${i.nome} x${i.qtd}%0A`;
        i.adicionais.forEach(a => {
            msg += `   ${a}%0A`;
        });
    });
    
    try {
        
        const pedidoRef = await addDoc(collection(db, "pedidos"), {
            cliente: nome,
            endereco: endereco,
            itens: carrinho,
            total: carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0),
            status: "recebido",
            timestamp: serverTimestamp()
        });
        
        const pedidoId = pedidoRef.id;
        
        // 🔹 Envia para WhatsApp
        window.open(`https://wa.me/5541987276769?text=${msg}`, "_blank");
        
        // 🔹 Fecha modais
        document.getElementById("modalFinalizacao").style.display = "none";
        document.getElementById("modalCarrinho").style.display = "none";
        
        // 🔹 Limpa carrinho
        carrinho = [];
        atualizarCarrinho();
        atualizarBadge();
        
        // 🔹 Mostra acompanhamento
        mostrarAcompanhamentoPedido();
        
        // 🔹 Escuta atualização de status (VERSÃO CORRIGIDA)
onSnapshot(doc(db, "pedidos", pedidoId), (docSnap) => {
    if (!docSnap.exists()) return;
    
    let status = docSnap.data().status || "";
    
    // 🔹 Normaliza status (resolve maiúscula/minúscula)
    status = status.toString().toLowerCase().trim();
    
    console.log("Status atualizado:", status);
    
    // 🔹 Remove todos ativos
    document.querySelectorAll(".status-item")
        .forEach(el => el.classList.remove("ativo"));
    
    // 🔹 Ativa conforme status
    if (status === "recebido") {
        document.getElementById("status-recebido")?.classList.add("ativo");
    }
    
    if (status === "andamento") {
        document.getElementById("status-andamento")?.classList.add("ativo");
    }
    
    if (status === "enviado") {
        document.getElementById("status-enviado")?.classList.add("ativo");
    }
    
    if (status === "concluido" || status === "concluído") {
        document.getElementById("status-concluido")?.classList.add("ativo");
    }
});
        
    } catch (erro) {
        console.error("Erro ao salvar pedido:", erro);
        alert("Erro ao enviar pedido.");
    }
};function mostrarDebugCategorias() {
    const debug = document.getElementById("debugCategorias");
    if (!debug) return;
    
    const categoriasUnicas = [...new Set(produtos.map(p => p.categoria))];
    
    debug.innerHTML = "<strong>Categorias encontradas no Firebase:</strong><br>";
    
    categoriasUnicas.forEach(cat => {
        debug.innerHTML += cat + "<br>";
    });
}

// chama depois que carregar
setTimeout(() => {
    mostrarDebugCategorias();
}, 2000);
/* ======================================
   ADICIONAIS - CONTROLE
====================================== */

window.toggleAdicionalGlobal = function(index) {
    const adicional = produtoSelecionado.adicionaisGlobais[index];
    if (!adicional) return;
    
    const jaExiste = adicionaisSelecionados.find(a => a.id === adicional.id);
    
    if (jaExiste) {
        adicionaisSelecionados = adicionaisSelecionados.filter(a => a.id !== adicional.id);
        valorAtualProduto -= parseFloat(adicional.preco || 0);
    } else {
        adicionaisSelecionados.push(adicional);
        valorAtualProduto += parseFloat(adicional.preco || 0);
    }
    
    atualizarBotaoConfirmar();
};

function atualizarBotaoConfirmar() {
    const btn = document.getElementById("btnConfirmar");
    if (!btn) return;
    
    btn.innerText = `Adicionar ao Carrinho • R$ ${valorAtualProduto.toFixed(2)}`;
}

window.confirmarAdicionais = function() {
    
    carrinho.push({
        nome: produtoSelecionado.nome,
        preco: valorAtualProduto,
        qtd: 1,
        adicionais: adicionaisSelecionados.map(a => `+ ${a.nome}`)
    });
    
    atualizarCarrinho();
    atualizarBadge();
    
    document.getElementById("modalAdicionais").style.display = "none";
};
function mostrarAcompanhamentoPedido() {
    document.getElementById("modalStatus").style.display = "flex";
}

window.fecharStatus = function() {
    document.getElementById("modalStatus").style.display = "none";
};