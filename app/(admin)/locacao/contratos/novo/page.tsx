import NovoContratoForm from "../../components/novo-contrato/NovoContratoForm"

export default async function NovoContratoPage() {
    const tiposLocacao = [
        {
            value: "RESIDENTIAL",
            label: "Residencial"
        },
        {
            value: "COMMERCIAL",
            label: "Comercial"
        },
    ]

    return (
        <NovoContratoForm tiposLocacao={tiposLocacao} />
    )
}