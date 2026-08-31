import assert from "node:assert/strict";
import test from "node:test";
import {
  findCompleteLeaseForLegacyContract,
  removeLegacyDuplicatesWithCompleteLease,
} from "../lib/locacao/contract-deduplication.js";

const legacy = {
  id: "legacy-1",
  imovelId: "property-1",
  locatarios: [{ cpfCnpj: "123.456.789-01" }],
};

const completeLease = {
  id: "lease-1",
  propertyId: "property-1",
  status: "ACTIVE",
  termsPeriods: [{ reviewStatus: "REVIEWED" }],
  parties: [
    {
      role: "TENANT",
      person: { cpfCnpj: "12345678901" },
    },
  ],
};

test("encontra o contrato completo pelo imóvel e CPF do inquilino", () => {
  assert.equal(
    findCompleteLeaseForLegacyContract(legacy, [completeLease])?.id,
    "lease-1",
  );
});

test("remove da listagem somente o legado coberto por contrato completo", () => {
  const incompleteLease = {
    ...completeLease,
    id: "lease-2",
    termsPeriods: [{ reviewStatus: "PENDING" }],
  };

  assert.deepEqual(
    removeLegacyDuplicatesWithCompleteLease([legacy], [completeLease]),
    [],
  );
  assert.deepEqual(
    removeLegacyDuplicatesWithCompleteLease([legacy], [incompleteLease]),
    [legacy],
  );
});

test("o vínculo explícito da migração prevalece mesmo com contrato atual incompleto", () => {
  const incompleteLinkedLease = {
    ...completeLease,
    id: "lease-linked",
    legacyCode: legacy.id,
    propertyId: null,
    termsPeriods: [],
    parties: [],
  };

  assert.equal(
    findCompleteLeaseForLegacyContract(legacy, [incompleteLinkedLease])?.id,
    "lease-linked",
  );
  assert.deepEqual(
    removeLegacyDuplicatesWithCompleteLease([legacy], [incompleteLinkedLease]),
    [],
  );
});

test("mantém o legado oculto quando o contrato canônico foi inativado", () => {
  const suspendedLease = {
    ...completeLease,
    status: "SUSPENDED",
    termsPeriods: [{ reviewStatus: "PENDING" }],
  };

  assert.deepEqual(
    removeLegacyDuplicatesWithCompleteLease([legacy], [suspendedLease]),
    [],
  );
});

test("não deduplica contratos de imóvel ou inquilino diferentes", () => {
  assert.deepEqual(
    removeLegacyDuplicatesWithCompleteLease(
      [
        { ...legacy, imovelId: "property-2" },
        {
          ...legacy,
          id: "legacy-2",
          locatarios: [{ cpfCnpj: "99999999999" }],
        },
      ],
      [completeLease],
    ).map((item) => item.id),
    ["legacy-1", "legacy-2"],
  );
});
