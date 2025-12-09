import mysql from 'mysql2/promise';

// Cria a conexão (Pool) usando a variável da Vercel
const pool = mysql.createPool(process.env.DATABASE_URL);

export default async function handler(request, response) {
  const { codigo } = request.query;

  // Permite que o site acesse a API
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!codigo) {
    return response.status(400).json({ erro: 'Código obrigatório' });
  }

  try {
    // 1. Limpa espaços em branco (ex: " 789 ")
    let codigoLimpo = codigo.trim();

    // Query padrão
    let query = 'SELECT nome, classificacao_geral FROM produtos WHERE codigo_barras = ?';
    
    // TENTATIVA 1: Busca exata
    let [rows] = await pool.execute(query, [codigoLimpo]);

    // TENTATIVA 2: Se falhar, tenta tirar zeros do começo (ex: Leitor leu 0789, banco tem 789)
    if (rows.length === 0 && codigoLimpo.startsWith('0')) {
        const codigoSemZero = codigoLimpo.replace(/^0+/, '');
        [rows] = await pool.execute(query, [codigoSemZero]);
    }

    // TENTATIVA 3: Se falhar, tenta colocar zero no começo (ex: Leitor leu 789, banco tem 0789)
    if (rows.length === 0) {
         [rows] = await pool.execute(query, ['0' + codigoLimpo]);
    }

    if (rows.length > 0) {
      return response.status(200).json({ 
          nome: rows[0].nome,
          classificacao: rows[0].classificacao_geral 
      });
    } else {
      return response.status(404).json({ erro: 'Não encontrado' });
    }

  } catch (error) {
    console.error('Erro API:', error);
    return response.status(500).json({ erro: 'Erro interno no servidor' });
  }
}