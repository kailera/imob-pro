import assert from "node:assert/strict"
import test from "node:test"
import { isValidCnpj, isValidCpf, isValidCpfCnpj } from "../lib/document-validation"

test("valida os dígitos verificadores de CPF", () => {
  assert.equal(isValidCpf("529.982.247-25"), true)
  assert.equal(isValidCpf("01123456789"), false)
  assert.equal(isValidCpf("111.111.111-11"), false)
})

test("valida os dígitos verificadores de CNPJ", () => {
  assert.equal(isValidCnpj("04.252.011/0001-10"), true)
  assert.equal(isValidCnpj("12.345.678/0001-99"), false)
  assert.equal(isValidCpfCnpj("04.252.011/0001-10"), true)
})
