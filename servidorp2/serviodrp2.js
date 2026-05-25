// ================= IMPORTAÇÃO DE MÓDULOS E CONFIGURAÇÃO =================

const express = require('express'); // Importa o framework Express, usado para criar o servidor web e gerenciar rotas HTTP.
const mongoose = require('mongoose'); // Importa o Mongoose, biblioteca que facilita a comunicação com o MongoDB usando Schemas.
const path = require('path'); // Importa o módulo nativo Path do Node.js, útil para manipular caminhos de arquivos e diretórios de forma segura.

const app = express(); // Inicializa uma nova aplicação Express.

// Configurações do Express e do motor de visualização (View Engine) EJS
app.set('view engine', 'ejs'); // Define o EJS como o motor padrão para renderizar os templates HTML dinâmicos.
app.set('views', path.join(__dirname, 'views')); // Configura a pasta onde o Express deve procurar os arquivos .ejs (pasta 'views').

app.use(express.urlencoded({ extended: true })); // Middleware do Express para ler, decodificar e processar dados vindos de formulários HTML (req.body).
app.use(express.static(path.join(__dirname, 'public'))); // Configura a pasta 'public' para servir arquivos estáticos (como CSS, imagens e JS front-end).

// Conexão com o Banco de Dados MongoDB
mongoose.connect('mongodb://localhost:27017/hotelDB') // Conecta ao banco local chamado 'hotelDB'. Se não existir, o MongoDB o cria automaticamente.
  .then(() => console.log('Conectado ao MongoDB...')) // Caso a conexão seja bem-sucedida, exibe uma mensagem de sucesso no console.
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err)); // Caso ocorra algum erro na conexão, captura e exibe no console.


// ================= COLECÕES (SCHEMAS / MODELOS) =================

// 1. Coleção de Usuários (Acesso dos funcionários/administradores do sistema)
const usuarioSchema = new mongoose.Schema({
  nome: { type: String, required: true }, // Campo 'nome' obrigatório do tipo texto.
  login: { type: String, required: true, unique: true }, // Campo 'login' obrigatório e único (impede cadastrar dois logins iguais).
  senha: { type: String, required: true } // Campo 'senha' obrigatório do tipo texto.
});
const Usuario = mongoose.model('Usuario', usuarioSchema); // Cria o modelo compilado 'Usuario' para fazer as operações no banco.

// 2. Coleção de Quartos do Hotel
const quartoSchema = new mongoose.Schema({
  numero: { type: Number, required: true, unique: true }, // Número do quarto obrigatório e único.
  tipo: { type: String, required: true }, // Tipo do quarto (Ex: Suíte Presidencial, Casal, Solteiro).
  preco: { type: Number, required: true }, // Preço da diária do quarto.
  status: { type: String, default: 'Disponível' }, // Status do quarto. Caso não seja informado, assume o padrão 'Disponível'.
  // Armazena o ID do Hóspede que está ocupando o quarto. O 'ref' faz o relacionamento com a coleção de Hóspedes (chave estrangeira).
  hospedeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospede', default: null } 
});
const Quarto = mongoose.model('Quarto', quartoSchema); // Cria o modelo compilado 'Quarto'.

// 3. Coleção de Hóspedes (Clientes do hotel)
const hospedeSchema = new mongoose.Schema({
  nome: { type: String, required: true }, // Nome completo do hóspede.
  cpf: { type: String, required: true, unique: true } // CPF do hóspede. Definido como único para evitar cadastros duplicados.
});
const Hospede = mongoose.model('Hospede', hospedeSchema); // Cria o modelo compilado 'Hospede'.


// ================= ROTAS DE NAVEGAÇÃO (GET) =================

// Rota Raiz ('/') - Direciona o usuário diretamente para a página de projetos/portfólio
app.get('/', (req, res) => {
  res.render('projects'); // Renderiza o arquivo 'views/projects.ejs'.
});

// Rota para exibir a página de Cadastro de Usuário
app.get('/cadastro', (req, res) => {
  res.render('cadastro', { msg: null }); // Renderiza 'views/cadastro.ejs' passando a variável 'msg' nula (sem avisos iniciais).
});

// Rota para exibir a página de Login do Sistema
app.get('/login', (req, res) => {
  res.render('login', { msg: null }); // Renderiza 'views/login.ejs' passando a variável 'msg' nula.
});


// ================= OPERAÇÕES DO BANCO DE DADOS (CRUD) =================

// [CREATE] - Rota POST para processar o cadastro de um novo usuário
app.post('/usuarios/novo', async (req, res) => {
  try {
    const novoUsuario = new Usuario(req.body); // Cria uma nova instância do modelo Usuario preenchida com os dados capturados do formulário.
    await novoUsuario.save(); // Salva o novo usuário de forma assíncrona no banco de dados.
    res.render('cadastro', { msg: 'Usuário cadastrado com sucesso!' }); // Renderiza a página novamente mostrando mensagem de sucesso.
  } catch (error) {
    // Se ocorrer algum erro (ex: tentar cadastrar um login que já existe), o fluxo cai no 'catch'
    res.render('cadastro', { msg: 'Erro ao cadastrar usuário. Login já existe?' }); // Renderiza a página com o aviso de erro.
  }
});

// [READ] - Rota POST para processar o login e autenticação do usuário
app.post('/usuarios/login', async (req, res) => {
  const { login, senha } = req.body; // Desestrutura os campos 'login' e 'senha' enviados pelo formulário.
  const usuario = await Usuario.findOne({ login, senha }); // Busca no banco um usuário que possua EXATAMENTE o login e a senha digitados.
  
  if (usuario) {
    res.redirect('/quartos'); // Se encontrar o usuário, a autenticação foi bem-sucedida e redireciona para o painel de quartos.
  } else {
    res.render('login', { msg: 'Usuário ou senha incorretos.' }); // Se não encontrar, recarrega a página de login com a mensagem de erro.
  }
});

// [READ] - Rota GET do Painel Principal: Busca e exibe o status de gerenciamento de Quartos e Hóspedes
app.get('/quartos', async (req, res) => {
  // Busca apenas os quartos que têm o status textual igual a 'Disponível' (usado para o menu de consulta limpo).
  const disponiveis = await Quarto.find({ status: 'Disponível' });
  
  // Busca todos os quartos registrados. O método '.populate('hospedeId')' substitui o ID do hóspede salvo pelo objeto completo do hóspede (nome e cpf).
  const todosQuartos = await Quarto.find().populate('hospedeId');
  
  // Busca todos os hóspedes cadastrados no sistema (usado para alimentar o campo select de associação).
  const todosHospedes = await Hospede.find();
  
  // Renderiza a página 'views/quartos.ejs' e injeta os dados dessas 3 variáveis coletadas do banco nela.
  res.render('quartos', { disponiveis, todosQuartos, todosHospedes });
});

// [CREATE] - Rota POST para criar/cadastrar um novo Quarto no hotel
app.post('/quartos/novo', async (req, res) => {
  try {
    const novoQuarto = new Quarto(req.body); // Cria uma nova instância de Quarto com os dados do form (número, tipo, preço).
    await novoQuarto.save(); // Salva o quarto no banco de dados de forma assíncrona.
    res.redirect('/quartos'); // Recarrega o painel de gerenciamento para listar o novo quarto criado.
  } catch (error) {
    res.send('Erro ao cadastrar quarto.'); // Envia uma resposta simples de texto caso o número do quarto seja duplicado.
  }
});

// [DELETE] - Rota POST para remover um Quarto do banco de dados através do seu ID único
app.post('/quartos/deletar/:id', async (req, res) => {
  await Quarto.findByIdAndDelete(req.params.id); // Captura o ID passado na URL (:id) e remove o documento correspondente do banco.
  res.redirect('/quartos'); // Redireciona de volta para atualizar a lista do painel.
});

// [UPDATE] - Rota POST para associar um quarto vago a um hóspede específico (Check-in)
app.post('/quartos/associar', async (req, res) => {
  const { quartoId, hospedeId } = req.body; // Recebe o ID do quarto e o ID do hóspede escolhido no formulário.
  
  if (!hospedeId) {
    return res.redirect('/quartos'); // Validação: se nenhum hóspede foi selecionado no menu drop-down, apenas ignora e recarrega a página.
  }

  // Busca o quarto selecionado pelo ID e atualiza suas propriedades:
  await Quarto.findByIdAndUpdate(quartoId, {
    status: 'Ocupado', // Altera o status para 'Ocupado' (fazendo ele sumir da lista de disponíveis do painel devido ao filtro no GET).
    hospedeId: hospedeId // Associa o ID do hóspede escolhido ao campo de referência do quarto.
  });
  
  res.redirect('/quartos'); // Redireciona para atualizar as tabelas do painel.
});

// [UPDATE] - Rota POST para desassociar um hóspede do quarto e liberá-lo (Check-out)
app.post('/quartos/liberar/:id', async (req, res) => {
  // Busca o quarto pelo ID recebido por parâmetro na URL e faz o reset dos seus dados de ocupação:
  await Quarto.findByIdAndUpdate(req.params.id, {
    status: 'Disponível', // Retorna o status para 'Disponível', fazendo-o reaparecer na lista de consultas.
    hospedeId: null // Limpa o vínculo removendo o ID do hóspede antigo (volta a ser nulo).
  });
  res.redirect('/quartos'); // Redireciona de volta para atualizar o painel.
});

// [READ] - Rota GET para listar os hóspedes cadastrados
app.get('/hospedes', async (req, res) => {
  const hospedes = await Hospede.find(); // Busca todos os hóspedes na coleção correspondente do banco.
  res.render('hospedes', { hospedes }); // Renderiza a página 'views/hospedes.ejs' exibindo a lista de pessoas cadastradas.
});

// [CREATE] - Rota POST para cadastrar um novo hóspede (Cliente)
app.post('/hospedes/novo', async (req, res) => {
  const novoHospede = new Hospede(req.body); // Captura nome e CPF do formulário e cria uma instância de Hospede.
  await novoHospede.save(); // Grava os dados assincronamente no banco de dados.
  res.redirect('/hospedes'); // Atualiza a página de hóspedes para exibir o novo cliente inserido na tabela.
});


// ================= INICIALIZAÇÃO DO SERVIDOR =================

const PORT = 80; // Define a porta padrão de rede HTTP (Porta 80).
app.listen(PORT, () => {
  // Coloca o servidor Express no ar escutando requisições na porta configurada.
  console.log(`Servidor rodando na porta ${PORT}`); // Imprime o status no terminal indicando que a aplicação está operando.
});