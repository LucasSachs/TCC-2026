# Dashboard geoespacial dos Campos Gerais

Aplicação WebGIS desenvolvida em Next.js para integrar e visualizar dados de
vegetação nativa e áreas de preservação nos 19 municípios associados à
Associação dos Municípios dos Campos Gerais (AMCG), no Paraná.

O dashboard geoespacial apresenta camadas de formações vegetais, Unidades de
Conservação, Áreas de Preservação Permanente (APP) e Reservas Legais. As
camadas de APP e Reserva Legal foram obtidas a partir dos dados declarados no
Cadastro Ambiental Rural (CAR). Os limites e os demais dados cadastrais dos
imóveis rurais não são exibidos na aplicação.

## Funcionalidades

- visualização das camadas ambientais sobre um mapa interativo;
- ativação e desativação individual das camadas;
- filtro pelos municípios da área de estudo;
- controle de opacidade das camadas;
- consulta das informações associadas às feições;
- cálculo e atualização da área correspondente às camadas selecionadas.

## Arquitetura da aplicação

A interface foi desenvolvida com Next.js e React. Os dados geoespaciais são
armazenados como arquivos GeoJSON no diretório `public/geojson` e carregados
diretamente pelo navegador. A versão atual não utiliza uma API externa nem um
banco de dados.

O Docker é utilizado para reunir a aplicação, as dependências e os arquivos
necessários em um ambiente padronizado de execução.

## Pré-requisitos

### Execução com Docker — recomendada

- Git;
- Docker Desktop, no Windows ou macOS, ou Docker Engine, no Linux;
- virtualização habilitada, quando exigida pela plataforma Docker;
- pelo menos 8 GB de memória RAM;
- porta local `3000` disponível.

Não é necessário instalar Node.js ou pnpm no sistema quando a aplicação é
executada exclusivamente pelo Docker.

### Execução sem Docker

Para executar o código diretamente no sistema, também são necessários:

- Node.js 22;
- Corepack habilitado;
- pnpm 12.9.1, versão indicada no arquivo `package.json`.

## Obtenção do projeto

Clone o repositório e acesse seu diretório:

```bash
git clone https://github.com/LucasSachs/TCC-2026.git
cd TCC-2026
```

## Execução local com Docker

Na raiz do projeto, construa a imagem:

```bash
docker build -t dashboard-geoespacial-campos-gerais .
```

Depois, crie e inicie o contêiner:

```bash
docker run --rm --name dashboard-geoespacial-campos-gerais -p 127.0.0.1:3000:3000 dashboard-geoespacial-campos-gerais
```

Quando a aplicação estiver pronta, acesse:

```text
http://localhost:3000
```

O vínculo com `127.0.0.1` restringe o acesso à própria máquina. Enquanto o
comando estiver ativo, o terminal permanecerá exibindo os registros da
aplicação. Para interromper a execução, pressione `Ctrl+C`. Como foi utilizada a
opção `--rm`, o contêiner será removido automaticamente depois de encerrado.

Após alterações no código ou nos arquivos GeoJSON, reconstrua a imagem antes de
iniciar um novo contêiner:

```bash
docker build -t dashboard-geoespacial-campos-gerais .
```

## Execução local sem Docker

Habilite o Corepack e instale as dependências registradas no arquivo de lock:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Para iniciar o ambiente de desenvolvimento:

```bash
pnpm dev
```

A aplicação ficará disponível em `http://localhost:3000`.

Para simular a execução de produção sem Docker:

```bash
pnpm build
pnpm start
```

## Verificação do projeto

Antes de gerar a versão de produção, o código pode ser verificado com:

```bash
pnpm lint
pnpm build
```

O primeiro comando executa as verificações configuradas no Biome. O segundo
gera a compilação de produção do Next.js e identifica erros que impeçam a
construção da aplicação.

## Organização principal

```text
.
├── public/
│   └── geojson/             # Camadas geoespaciais consumidas pela aplicação
├── src/
│   ├── app/                 # Página, layout e estilos globais
│   ├── components/          # Interface e componente principal do dashboard
│   └── lib/                 # Configuração das camadas e funções auxiliares
├── Dockerfile               # Etapas de instalação, compilação e execução
├── package.json             # Dependências e comandos do projeto
└── pnpm-lock.yaml           # Versões resolvidas das dependências
```

## Atualização das camadas

Os arquivos GeoJSON são recursos estáticos. Para atualizar uma camada, substitua
o arquivo correspondente em `public/geojson`, mantendo o nome e a estrutura
esperados pela configuração presente em `src/lib/layers.ts`.

Depois da substituição, reinicie o servidor de desenvolvimento ou reconstrua a
imagem Docker. Mudanças nos dados não são buscadas automaticamente em serviços
externos.

## Solução de problemas

### A porta 3000 já está em uso

Encerre a aplicação que utiliza a porta ou publique o contêiner em outra porta
local. O exemplo abaixo utiliza a porta `3001`:

```bash
docker run --rm --name dashboard-geoespacial-campos-gerais -p 127.0.0.1:3001:3000 dashboard-geoespacial-campos-gerais
```

Nesse caso, acesse `http://localhost:3001`.

### O comando Docker não é reconhecido

Confirme se o Docker Desktop ou o Docker Engine está instalado e em execução.
No Windows, verifique também se a virtualização e o ambiente exigido pelo Docker
estão habilitados.

### Uma camada não é exibida

Verifique se o arquivo correspondente está no diretório `public/geojson` e se o
nome registrado em `src/lib/layers.ts` corresponde exatamente ao nome do
arquivo. O GeoJSON também deve possuir uma `FeatureCollection` válida e uma
propriedade `features` organizada como lista.

## Autores

- Lucas Sachs
- Amanda Yohana Vosgerau Campos

