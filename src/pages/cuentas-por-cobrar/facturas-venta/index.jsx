import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateSalesInvoice from './create';
import UpdatedSalesInvoice from './updated';

/**
 * Pagina principal de Facturas de Venta (Cuentas por Cobrar).
 * Muestra listado paginado con DataTable y permite crear/editar/eliminar facturas FV.
 */

const STATUS_BADGE = {
    DRAFT: 'bg-label-secondary',
    ISSUED: 'bg-label-warning',
    PARTIALLY_PAID: 'bg-label-info',
    PAID: 'bg-label-success',
    VOIDED: 'bg-label-danger',
    SETTLED: 'bg-label-success',
};

const STATUS_LABEL = {
    DRAFT: 'Borrador',
    ISSUED: 'Emitida',
    PARTIALLY_PAID: 'Pago Parcial',
    PAID: 'Pagada',
    VOIDED: 'Anulada',
    SETTLED: 'Liquidada',
};

/** Formatea importes en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexSalesInvoices = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedRecord, setSelectedRecord] = useState(null);

    /** Endpoint DataTable. */
    const url = ['api', 'v1', 'sales-invoices', 'search'];

    /** Columnas DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Factura', data: 'invoiceNumber', name: 'invoiceNumber' },
        {
            title: 'Cliente',
            data: 'thirdPartyName',
            name: 'thirdPartyName',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'invoiceDate', name: 'invoiceDate' },
        { title: 'Vence', data: 'dueDate', name: 'dueDate' },
        {
            title: 'Moneda',
            data: 'currencyIso',
            name: 'currencyIso',
            render: (val) => val || 'COP',
        },
        {
            title: 'Subtotal',
            data: 'subtotal',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'IVA',
            data: 'totalTax',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Retencion',
            data: 'totalWithholding',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Total',
            data: 'totalAmount',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Estado',
            data: 'status',
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
                const canEdit = ['DRAFT', 'ISSUED'].includes(row?.status);
                const canDelete = ['DRAFT', 'ISSUED'].includes(row?.status);
                const canDian = row?.status !== 'VOIDED' && row?.status !== 'DRAFT';
                const alreadySent = row?.xmlSent === true;
                return `
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-primary action-btn"
                        data-action="edit" data-id="${id}" title="Editar"
                        ${!canEdit ? 'disabled' : ''}>
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-warning action-btn"
                        data-action="generate-xml" data-id="${id}" title="Generar XML DIAN"
                        ${!canDian || alreadySent ? 'disabled' : ''}>
                        <i class="ri-file-code-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="submit-dian" data-id="${id}" title="Enviar DIAN"
                        ${!canDian ? 'disabled' : ''}>
                        <i class="ri-send-plane-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="download-pdf" data-id="${id}" title="Descargar PDF">
                        <i class="ri-file-pdf-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn"
                        data-action="delete" data-id="${id}" title="Eliminar"
                        ${!canDelete ? 'disabled' : ''}>
                        <i class="ri-delete-bin-5-line"></i>
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

    const openModalUpdate = (record) => {
        setSelectedRecord(record);
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const handleDelete = async (selected) => {
        const confirm = await window.Swal.fire({
            title: 'Eliminar factura?',
            text: `Se eliminara la factura ${selected.invoiceNumber || selected.id}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.delete(base_url(['api', 'v1', 'sales-invoices', selected.id]), {}, {}, 1000);
            setMessage({ type: 'success', show: true, message: 'Factura eliminada correctamente.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.message || error?.msg || 'Error al eliminar la factura.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Factura</span>',
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

            if (action === 'view') {
                window.Swal.fire({
                    title: `Factura ${selected.invoiceNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Cliente:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.invoiceDate || '-'}</p>
                            <p><strong>Vencimiento:</strong> ${selected.dueDate || '-'}</p>
                            <p><strong>Moneda:</strong> ${selected.currencyIso || 'COP'} (tasa ${selected.exchangeRate || 1})</p>
                            <p><strong>Subtotal:</strong> ${formatCurrency(selected.subtotal)}</p>
                            <p><strong>IVA:</strong> ${formatCurrency(selected.totalTax)}</p>
                            <p><strong>Retencion:</strong> ${formatCurrency(selected.totalWithholding)}</p>
                            <p><strong>Total:</strong> ${formatCurrency(selected.totalAmount)}</p>
                            <p><strong>Saldo:</strong> ${formatCurrency(selected.balanceDue)}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 520,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'edit') {
                if (!['DRAFT', 'ISSUED'].includes(selected.status)) {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'Solo se pueden editar facturas en estado Borrador o Emitida.',
                    });
                    return;
                }
                openModalUpdate(selected);
                return;
            }

            if (action === 'delete') {
                if (!['DRAFT', 'ISSUED'].includes(selected.status)) {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'No se puede eliminar una factura con pagos o liquidada.',
                    });
                    return;
                }
                handleDelete(selected);
                return;
            }

            if (action === 'generate-xml') {
                fetchHelper
                    .post(base_url(['api', 'v1', 'ar', 'dian', 'invoices', selected.id, 'generate-xml']), {}, {}, 1000)
                    .then(() => {
                        setMessage({ type: 'success', show: true, message: 'XML UBL 2.1 y CUFE generados.' });
                        dataTableRef?.current?.ajax.reload();
                    })
                    .catch((err) =>
                        setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error generando XML.' })
                    );
                return;
            }

            if (action === 'submit-dian') {
                fetchHelper
                    .post(base_url(['api', 'v1', 'ar', 'dian', 'invoices', selected.id, 'submit']), {}, {}, 1000)
                    .then(() => {
                        setMessage({ type: 'success', show: true, message: 'Envio DIAN encolado (simulacion PSE).' });
                        setTimeout(() => dataTableRef?.current?.ajax.reload(), 2500);
                    })
                    .catch((err) =>
                        setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error enviando a DIAN.' })
                    );
                return;
            }

            if (action === 'download-pdf') {
                const url = base_url(['api', 'v1', 'ar', 'dian', 'invoices', selected.id, 'pdf']);
                window.open(url, '_blank');
                return;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Facturas de Venta</h5>

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
                        title="Facturas de Venta"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateSalesInvoice
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <UpdatedSalesInvoice
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                dataTableRef={dataTableRef}
                record={selectedRecord}
                setMessage={setMessage}
            />
        </>
    );
};

export default IndexSalesInvoices;
