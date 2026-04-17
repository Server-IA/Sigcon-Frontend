import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApPayment from './create';

/**
 * Pagina principal de Pagos y Abonos (Cuentas por Pagar).
 * Muestra un listado paginado de pagos realizados a proveedores.
 */

/** Colores de badge por estado de pago. */
const STATUS_BADGE = {
    APPLIED: 'bg-label-success',
    PENDING: 'bg-label-warning',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    APPLIED: 'Aplicado',
    PENDING: 'Pendiente',
    REVERSED: 'Reversado',
};

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApPayments = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Endpoint de busqueda paginada de pagos. */
    const url = ['api', 'v1', 'ap', 'payments'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Factura',
            data: 'invoiceId',
            name: 'invoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        { title: 'Fecha Pago', data: 'paymentDate', name: 'paymentDate' },
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

    /** Abre modal de registro de pago. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Botones de cabecera. */
    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Pago</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    /** Rows normalizadas. */
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
                    title: `Pago #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Factura:</strong> ${selected.invoiceId || '-'}</p>
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
                <h5 className="card-header text-md-start text-center">Pagos y Abonos</h5>

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
                        title="Pagos y Abonos"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApPayment
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />
        </>
    );
};

export default IndexApPayments;
