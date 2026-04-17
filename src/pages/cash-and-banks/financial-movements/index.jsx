import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import CreateFinancialMovement from './create';

/**
 * Pagina principal de Movimientos Financieros.
 * Permite listar y crear movimientos financieros bancarios manuales.
 */

const SOURCE_BADGE = {
    MANUAL:      'bg-label-primary',
    BANK_IMPORT: 'bg-label-info',
    SYSTEM:      'bg-label-secondary',
};

const SOURCE_LABEL = {
    MANUAL:      'Manual',
    BANK_IMPORT: 'Importacion',
    SYSTEM:      'Sistema',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    const num = Number(val);
    const formatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Math.abs(num));
    if (num > 0) return `<span class="text-success">+${formatted}</span>`;
    if (num < 0) return `<span class="text-danger">-${formatted}</span>`;
    return `<span class="text-muted">${formatted}</span>`;
};

const IndexFinancialMovements = () => {
    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);

    const [data, setData]             = useState([]);
    const [search, setSearch]         = useState({ value: '', checked: true });
    const [itemCreate, setItemCreate] = useState(false);
    const [itemError, setItemError]   = useState(false);

    /** Columnas de la DataTable */
    const columns = [
        { title: 'Id', data: 'id', searchable: false },
        {
            title: 'Cuenta', data: 'bankAccountId', searchable: false,
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'movementDate', searchable: false },
        {
            title: 'Monto', data: 'amount', searchable: false,
            render: (val) => formatCurrency(val),
        },
        { title: 'Descripcion', data: 'description', name: 'description' },
        {
            title: 'Tipo', data: 'sourceType',
            render: (val) => {
                const badge = SOURCE_BADGE[val] || 'bg-label-secondary';
                const label = SOURCE_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        { title: 'Referencia', data: 'externalReference', searchable: false,
            render: (val) => val || '-',
        },
        {
            title: 'Conciliacion', data: 'matchedVoucherId', searchable: false,
            render: (val, _type, row) => {
                if (row.matchedCheckId || val) {
                    return '<span class="badge bg-label-success">Conciliado</span>';
                }
                return '<span class="badge bg-label-warning">Pendiente</span>';
            },
        },
    ];

    /** Abre el modal de creacion */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nuevo Movimiento</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Movimientos Financieros</h5>

                <AlertPage type="success" message="Movimiento registrado exitosamente." show={itemCreate} onChange={() => setItemCreate(false)} />
                <AlertPage type="danger"  message="Error al procesar la operacion."     show={itemError}  onChange={() => setItemError(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={['api', 'v1', 'financial-movements']}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="GET"
                        buttons={buttons}
                        title="Movimientos Financieros"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50]}
                    />
                </div>
            </div>

            <CreateFinancialMovement
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setItemCreate={setItemCreate}
            />
        </>
    );
};

export default IndexFinancialMovements;
