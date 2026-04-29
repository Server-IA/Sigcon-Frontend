import { useState, useRef, useMemo, useEffect } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import CreateArPayment from './create';

/**
 * Pagina principal de Cobros (Cuentas por Cobrar).
 * Cubre HUs AR-02 y AR-08.
 * Muestra un listado paginado de cobros aplicados a facturas de venta.
 */

const STATUS_BADGE = {
    COMPLETED: 'bg-label-success',
    PENDING: 'bg-label-warning',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    COMPLETED: 'Completado',
    PENDING: 'Pendiente',
    REVERSED: 'Reversado',
};

/** Formato moneda colombiana. */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexArPayments = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    // HU-AR-08 (2026-04-27): factura preseleccionada via query param desde el
    // boton "Registrar cobro" del listado de FV.
    const [preselectedInvoiceId, setPreselectedInvoiceId] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invoiceId = params.get('invoiceId');
        if (invoiceId) {
            setPreselectedInvoiceId(Number(invoiceId));
            // Esperar al render del modal antes de abrirlo
            setTimeout(() => {
                if (!modalCreateInstance.current && modalCreateRef.current) {
                    modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
                }
                modalCreateInstance.current?.show();
            }, 300);
        }
    }, []);

    /** Endpoint de busqueda paginada de cobros. */
    const url = ['api', 'v1', 'ar', 'payments', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Factura',
            data: 'invoiceNumber',
            name: 'invoiceNumber',
            render: (val, _type, row) => val || (row?.invoiceId ?? '-'),
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        { title: 'Fecha', data: 'paymentDate', name: 'paymentDate' },
        {
            title: 'Referencia',
            data: 'paymentReference',
            name: 'paymentReference',
            render: (val) => val || '-',
        },
        {
            title: 'Metodo',
            data: 'paymentMethod',
            name: 'paymentMethod',
            render: (val) => val || '-',
        },
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
            render: (id) => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>`,
        },
    ];

    /** Abre modal de registro de cobro. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Botones de cabecera. */
    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Cobro</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    /** Filas normalizadas. */
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /** Listener de acciones por fila. */
    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            if (action === 'view') {
                window.Swal.fire({
                    title: `Cobro #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Factura:</strong> ${selected.invoiceNumber || selected.invoiceId || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Fecha:</strong> ${selected.paymentDate || '-'}</p>
                            <p><strong>Referencia:</strong> ${selected.paymentReference || '-'}</p>
                            <p><strong>Metodo:</strong> ${selected.paymentMethod || '-'}</p>
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
                <h5 className="card-header text-md-start text-center">Cobros</h5>

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
                        title="Cobros"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateArPayment
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                preselectedInvoiceId={preselectedInvoiceId}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Cobros"
                columns={[
                    { column: 'invoiceNumber:name', label: 'Factura' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'paymentDate:name', label: 'Fecha', type: 'date' },
                    { column: 'paymentReference:name', label: 'Referencia' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'COMPLETED', label: 'Completado' },
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'REVERSED', label: 'Reversado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexArPayments;
