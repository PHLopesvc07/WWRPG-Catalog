# Guia de Navegacao — Arquivo Geral do Ministerio da Magia

Este guia apresenta instrucoes simples para navegar, filtrar registros, alternar modos visuais e utilizar os recursos do catalogo tanto na versao para computador quanto no aplicativo movel Android.

---

## 1. Visao Geral dos Quatro Arquivos

O catalogo esta organizado em quatro departamentos ministeriais independentes:

1. **Animais Magicos (D.R.C.C.M.):** 92 especies catalogadas com classificacao de periculosidade (X a XXXXX), licenca exigida, tipo, locomocao, atributos fisicos, habilidades de combate e prontuario veterinario de injurias.
2. **Feiticos (C.E.F.):** 210 encantamentos organizados por nivel (1 a 7), categoria magica (Charme, Transfiguracao, Azaracao, Maldicao, Contrafeitico, Cura), pericia de conjuracao e condicao aplicada.
3. **Plantas Magicas (Herbologia):** 44 especies botânicas com indicacao de raridade (Popular ou Dificil de Adquirir), nivel de herbologia (1 a 7), dificuldade de colheita/manejo (CD) e usos alquimicos.
4. **Pocoes (Alquimia):** 166 receitas de elixires, antidotos, solucoes e venenos com dificuldade de preparo (CD), tempo de fermentacao, duracao e via de administracao.

---

## 2. Navegacao na Versao Web (Desktop)

### 2.1. Alternancia de Departamentos (Abas)
- Clique nas abas no topo da tela (`I. Animais Magicos`, `II. Feiticos`, `III. Plantas` ou `IV. Pocoes`) para mudar de catalogo.
- O numero exibido ao lado do nome de cada aba indica a quantidade de registros carregados em tempo real do Cloud Firestore.

### 2.2. Barra Lateral de Filtros e Busca
- **Busca por Texto:** Digite palavras-chave no campo de busca (como nome da criatura, efeito do feitico, nome cientifico da planta ou ingrediente da pocao). A busca possui resposta rapida com filtro em memoria.
- **Filtros Especiais:** Utilize os seletores de classificacao, nivel de dificuldade, categoria ou locomocao para refinar a listagem.
- **Ordenacao:** Alterne entre ordem alfabetica (A-Z) ou ordem por nivel/perigo crescente e decrescente.
- **Limpar Filtros:** Clique no botao `Limpar Filtros` para restaurar a lista completa.

### 2.3. Visualizacao da Ficha Completa
- Clique em qualquer registro da lista lateral para que a ficha ministerial completa seja carregada no painel principal a direita.
- Cada ficha apresenta informacoes detalhadas, atributos, ilustracoes e opcoes de exportacao individual no formato `.json`.

### 2.4. Alternancia de Temas Visuais
No canto superior esquerdo do cabecalho, estao disponiveis os botoes de modo de leitura:
- **Modo Escuro / Claro:** Alterna entre o pergaminho classico e a versao noturna de alto contraste.
- **Modo Terminal:** Ativa a estetica tatica inspirada em terminais governamentais com fundo escuro e acentos em verde-azulado.
- **Versao Movel:** Atalho direto para acessar a interface otimizada para telas pequenas.

---

## 3. Navegacao no Aplicativo Movel Android

### 3.1. Barra de Navegacao Inferior (Bottom Navigation)
- Localizada na parte inferior da tela com botoes dedicados para cada departamento: `Animais`, `Feiticos`, `Plantas` e `Pocoes`.
- Cada botao exibe a quantidade atualizada de registros catalogados.

### 3.2. Filtros Rapidos e Avancados
- No topo de cada tela ha uma barra de busca direta com campo de digitacao.
- Toque no botao `Filtros` para expandir ou recolher as opcoes de ordenacao e categorias, mantendo a tela limpa para leitura.

### 3.3. Ficha Deslizante (Bottom Sheet)
- Ao tocar em um item da lista, a ficha completa desliza a partir da parte inferior da tela como uma lâmina modal.
- Nela e possivel consultar a foto, atributos, mecanica e descricoes sem perder a posicao de rolagem da lista.
- Para voltar a lista, toque no botao `Fechar` ou clique na area externa escurecida.

### 3.4. Notificacao Automatica de Atualizacoes
- O aplicativo verifica periodicamente a presenca de novas releases publicadas no GitHub.
- Havendo uma versao mais recente, um aviso em destaque sera exibido no topo da tela com o link para baixar diretamente o instalador atualizado (`.apk`).
