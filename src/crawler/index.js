const { run } = require('./spawn.js')

const searchCNPJ = async (cnpj = '83887703000100') => {
  const html = await run(cnpj)

  const cnpjs = html.match(/\d\d\.?\d\d\d\.?\d\d\d\/\d\d\d\d[-]?\d\d/ig)

  console.log({ cnpjs })
}

searchCNPJ()
