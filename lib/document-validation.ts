function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value)
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false

  for (let digitIndex = 9; digitIndex < 11; digitIndex += 1) {
    let sum = 0
    for (let index = 0; index < digitIndex; index += 1) {
      sum += Number(cpf[index]) * (digitIndex + 1 - index)
    }
    const remainder = (sum * 10) % 11
    const checkDigit = remainder === 10 ? 0 : remainder
    if (checkDigit !== Number(cpf[digitIndex])) return false
  }
  return true
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false

  const calculateDigit = (length: number) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  return calculateDigit(12) === Number(cnpj[12])
    && calculateDigit(13) === Number(cnpj[13])
}

export function isValidCpfCnpj(value: string) {
  const document = onlyDigits(value)
  return document.length === 11 ? isValidCpf(document) : isValidCnpj(document)
}
