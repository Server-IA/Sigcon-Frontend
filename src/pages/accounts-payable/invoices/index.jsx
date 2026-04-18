import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApInvoice from './create';
import UpdatedApInvoice from './updated';

/**
 * Pagina principal de Facturas de Compra (Cuentas por Pagar).
 * Muestra un listado paginado con DataTable y permite registrar, editar y eliminar facturas.
 */

/** Colores de badge por estado de factura. */
const STATUS_BADGE = {
    PENDING: 'bg-label-warning',
    PAID: 'bg-label-success',
    PARTIALLY_PAID: 'bg-label-info',
    OVERDUE: 'bg-label-danger',
    CANCELLED: 'bg-label-secondary',
};

/** Etiquetas en espanol por estado. */
const STATUS_LABEL = {
    PENDING: 'Pendiente',
    PAID: 'Pagada',
    PARTIALLY_PAID: 'Pago Parcial',
    OVERDUE: 'Vencida',
    CANCELLED: 'Anulada',
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

const IndexApInvoices = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    /** Endpoint de busqueda paginada de facturas. */
    const url = ['api', 'v1', 'invoices', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Factura Proveedor', data: 'supplierInvoiceNumber', name: 'supplierInvoiceNumber' },
        {
            title: 'Resolucion',
            data: 'resolution',
            name: 'resolution',
            render: (val) => val || '-',
        },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            name: 'thirdPartyName',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'invoiceDate', name: 'invoiceDate' },
        {
            // Muestra el total real a pagar (Subtotal + IVA - Retenciones), no el
            // subtotal. El backend expone ambos: totalAmount=subtotal,
            // totalPayment=neto a pagar. La columna del listado debe ser el neto.
            title: 'Total',
            data: 'totalPayment',
            name: 'totalPayment',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Saldo',
            data: 'balanceDue',
            name: 'balanceDue',
            render: (val) => formatCurrency(val),
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
            render: (id, _type, row) => {
                // Backend permite editar siempre que no este anulada ni liquidada.
                // Solo se puede eliminar (soft delete) si esta en estado PENDIENTE.
                const isEditable   = row?.status !== 'VOIDED' && row?.status !== 'SETTLED';
                const isDeletable  = row?.status === 'PENDING';
                return `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-primary action-btn"
                        data-action="edit" data-id="${id}" title="Editar"
                        ${!isEditable ? 'disabled' : ''}>
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn"
                        data-action="delete" data-id="${id}" title="Eliminar"
                        ${!isDeletable ? 'disabled' : ''}>
                        <i class="ri-delete-bin-5-line"></i>
                    </button>
                </div>`;
            },
        },
    ];

    /** Abre modal de registro de factura. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Elimina factura con confirmacion SweetAlert. */
    const handleDelete = async (selected) => {
        const confirm = await window.Swal.fire({
            title: 'Eliminar factura?',
            text: `Se eliminara la factura #${selected.supplierInvoiceNumber || selected.id}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        try {
            // Firma fetchHelper.delete: (url, data, headers, time, showErrorAlert, useToken)
            // headers DEBE ser un objeto, no un numero. El time se pasa en la 4a posicion.
            await fetchHelper.delete(base_url(['api', 'v1', 'invoices', selected.id]), {}, {}, 1000);
            setMessage({ type: 'success', show: true, message: 'Factura eliminada exitosamente.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al eliminar la factura.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    /** Botones de cabecera del DataTable. */
    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Factura</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    /** Rows normalizadas para el listener de acciones. */
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /** Listener de acciones por fila (view, edit, delete). */
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
                    title: `Factura #${selected.supplierInvoiceNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Proveedor:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.invoiceDate || '-'}</p>
                            <p><strong>Total:</strong> ${formatCurrency(selected.totalPayment)}</p>
                            <p><strong>Saldo:</strong> ${formatCurrency(selected.balanceDue)}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'edit') {
                if (selected.status === 'VOIDED' || selected.status === 'SETTLED') {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'No se puede editar una factura anulada o liquidada.',
                    });
                    return;
                }
                setSelectedInvoice(selected);
                if (!modalUpdateInstance.current) {
                    modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                }
                modalUpdateInstance.current.show();
                return;
            }

            if (action === 'delete') {
                if (selected.status !== 'PENDING') {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'Solo se pueden eliminar facturas en estado PENDIENTE.',
                    });
                    return;
                }
                handleDelete(selected);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Facturas de Compra</h5>

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
                        title="Facturas de Compra"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApInvoice
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <UpdatedApInvoice
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                selected={selectedInvoice}
            />
        </>
    );
};

export default IndexApInvoices;
