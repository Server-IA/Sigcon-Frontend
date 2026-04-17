import { useState, useRef, useMemo, useEffect } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import CreateArAdvance from './create';
import ApplyArAdvance from './apply';

/**
 * Pagina principal de Anticipos de Clientes (Cuentas por Cobrar).
 * Cubre HU AR-09. Permite registrar y aplicar anticipos a facturas de venta.
 */

const STATUS_BADGE = {
    PENDING: 'bg-label-warning',
    PARTIALLY_APPLIED: 'bg-label-info',
    FULLY_APPLIED: 'bg-label-success',
};

const STATUS_LABEL = {
    PENDING: 'Pendiente',
    PARTIALLY_APPLIED: 'Parcial',
    FULLY_APPLIED: 'Aplicado',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexArAdvances = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalApplyRef = useRef(null);
    const modalApplyInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedAdvance, setSelectedAdvance] = useState(null);

    const url = ['api', 'v1', 'ar', 'advances', 'search'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Cliente',
            data: 'thirdPartyName',
            name: 'thirdPartyName',
            render: (val) => val || '-',
        },
        { title: 'Monto', data: 'amount', name: 'amount', render: (v) => formatCurrency(v) },
        { title: 'Aplicado', data: 'appliedAmount', name: 'appliedAmount', render: (v) => formatCurrency(v) },
        { title: 'Disponible', data: 'availableAmount', name: 'availableAmount', render: (v) => formatCurrency(v) },
        { title: 'Fecha', data: 'advanceDate', name: 'advanceDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                const canApply = row.status !== 'FULLY_APPLIED';
                return `
                <div class="d-flex gap-1">
                    ${canApply ? `<button class="btn btn-sm btn-label-primary action-btn"
                        data-action="apply" data-id="${id}" title="Aplicar a factura">
                        <i class="ri-check-double-line"></i>
                    </button>` : ''}
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>`;
            },
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const openModalApply = (advance) => {
        setSelectedAdvance(advance);
        if (!modalApplyInstance.current) {
            modalApplyInstance.current = new window.bootstrap.Modal(modalApplyRef.current);
        }
        modalApplyInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Anticipo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            if (action === 'apply') {
                openModalApply(selected);
            } else if (action === 'view') {
                window.Swal.fire({
                    title: `Anticipo #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Cliente:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Aplicado:</strong> ${formatCurrency(selected.appliedAmount)}</p>
                            <p><strong>Disponible:</strong> ${formatCurrency(selected.availableAmount)}</p>
                            <p><strong>Fecha:</strong> ${selected.advanceDate || '-'}</p>
                            <p><strong>Referencia:</strong> ${selected.advanceReference || '-'}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Anticipos de Clientes</h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Anticipos"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateArAdvance
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <ApplyArAdvance
                modalRef={modalApplyRef}
                modalInstance={modalApplyInstance}
                dataTableRef={dataTableRef}
                advance={selectedAdvance}
                setMessage={setMessage}
            />
        </>
    );
};

export default IndexArAdvances;
