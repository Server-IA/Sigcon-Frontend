import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApInvoice from './create';
import UpdatedApInvoice from './updated';
// HU-AP-13 (2026-04-28): documentos soporte de factura de compra.
import ApAttachmentsModal from './attachments';

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
    const filterRef = useRef(null);
    const filterInstance = useRef(null);
    // HU-AP-13: refs para modal de documentos soporte
    const modalAttachRef = useRef(null);
    const modalAttachInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    // HU-AP-13: factura para la que se abre el modal de attachments
    const [attachInvoice, setAttachInvoice] = useState(null);

    /** Endpoint de busqueda paginada de facturas. */
    const url = ['api', 'v1', 'invoices', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Factura Proveedor', data: 'supplierInvoiceNumber', name: 'supplierInvoiceNumber' },
        {
            // HU-AP-01 DEF#3: la columna anterior leia `resolution`, que es el
            // consecutivo interno numerico ("1","2","3"). El campo correcto
            // visible al usuario es `resolutionInvoice`, que guarda la
            // resolucion DIAN real ("FC-QA3-003", "RES-2026-001", etc).
            title: 'Resolucion',
            data: 'resolutionInvoice',
            name: 'resolutionInvoice',
            render: (val) => val || '-',
        },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            // QA-BLOQUE-AO (2026-04-29): name = path JPA real para que el GenericFilterModal
            // pueda hacer table.column('thirdParty.businessName:name') correctamente y el
            // backend DataTableSpecificationBuilder resuelva el JOIN.
            name: 'thirdParty.businessName',
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
                // HU-AP-03: liquidar SOLO si esta totalmente pagada (saldo=0) y no
                // ya liquidada/anulada.
                // HU-AP-02 (Bloque AT): no permitir edit en VOIDED, SETTLED ni PAID
                const isEditable    = row?.status !== 'VOIDED' && row?.status !== 'SETTLED' && row?.status !== 'PAID';
                const isDeletable   = row?.status === 'PENDING';
                const isSettleable  = row?.status === 'PAID';
                // HU-AP-25 (Bloque AS/AY): se puede anular factura en estado
                // PENDIENTE o PARTIALLY_PAID (sin pagos efectivos: el backend
                // valida que los pagos hayan sido reversados antes de permitir).
                // QA-BLOQUE-AY HU-AP-25 E4 (2026-05-06): habilitar para
                // PARTIALLY_PAID; antes solo PENDIENTE bloqueaba el flujo de
                // reversion de pagos parciales aunque el backend ya soportaba.
                // Fallo 3 (HU-AP-25 E6, informe AgroFusion): el boton tambien se
                // habilita para facturas AAEF para que, al pulsarlo, el usuario
                // reciba un mensaje claro explicando que deben corregirse desde
                // AgroFusion (antes el boton salia deshabilitado, sin explicacion).
                const isVoidable    = (row?.status === 'PENDING'
                                       || row?.status === 'PARTIALLY_PAID');
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
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="settle" data-id="${id}"
                        title="Liquidar factura (HU-AP-03)"
                        ${!isSettleable ? 'disabled' : ''}>
                        <i class="ri-check-double-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="attachments" data-id="${id}"
                        title="Documentos soporte (HU-AP-13)">
                        <i class="ri-attachment-2"></i>
                    </button>
                    <button class="btn btn-sm btn-label-warning action-btn"
                        data-action="void" data-id="${id}"
                        title="Anular factura (HU-AP-25)"
                        ${!isVoidable ? 'disabled' : ''}>
                        <i class="ri-close-circle-line"></i>
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
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
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
                // Imagen 3 QA: el modal anterior mostraba botones fantasma
                // "Cerrar / No / Cancel". showCancelButton/Deny en false los oculta.
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
                    showCancelButton: false,
                    showDenyButton: false,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'edit') {
                if (selected.status === 'VOIDED' || selected.status === 'SETTLED' || selected.status === 'PAID') {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'No se puede editar una factura ' + (
                            selected.status === 'PAID' ? 'totalmente pagada' :
                            selected.status === 'VOIDED' ? 'anulada' : 'liquidada') +
                            '. Si necesita correcciones, anule y registre una nueva factura.',
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
                return;
            }

            if (action === 'attachments') {
                // HU-AP-13 (2026-04-28): abrir modal de documentos soporte.
                setAttachInvoice({ id: selected.id, invoiceNumber: selected.supplierInvoiceNumber });
                if (!modalAttachInstance.current) {
                    modalAttachInstance.current = new window.bootstrap.Modal(modalAttachRef.current);
                }
                modalAttachInstance.current.show();
                return;
            }

            if (action === 'void') {
                // Fallo 3 (HU-AP-25 E6, informe AgroFusion): si la factura fue
                // originada por integracion AAEF, NO se anula manualmente. Antes el
                // boton salia deshabilitado sin explicacion; ahora mostramos el
                // mensaje exacto de la HU para orientar al usuario.
                if (selected?.source === 'AAEF') {
                    window.Swal.fire({
                        icon: 'info',
                        title: 'Factura de integracion AAEF',
                        text: 'Las facturas originadas por integración AAEF solo pueden anularse o corregirse mediante el proceso de corrección de AgroFusion',
                        confirmButtonText: 'Entendido',
                    });
                    return;
                }
                // HU-AP-25 (Bloque AS): anular factura con motivo (>=10 chars).
                // Backend valida E1-E9: AAEF, PAGADA, PARCIAL, periodo cerrado.
                window.Swal.fire({
                    title: 'Anular factura?',
                    html: `<p>Se anulara la factura <strong>#${selected.supplierInvoiceNumber || selected.id}</strong>.</p>
                           <p class="text-muted small">Esta accion conserva la trazabilidad pero marca la factura como ANULADA. Si la factura tiene asiento contable contabilizado, se generara un asiento de reversa.</p>`,
                    input: 'textarea',
                    inputLabel: 'Motivo de anulacion (minimo 10 caracteres)',
                    inputPlaceholder: 'Indique el motivo...',
                    inputAttributes: { 'aria-label': 'Motivo de anulacion' },
                    showCancelButton: true,
                    confirmButtonText: 'Si, anular',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ff9800',
                    inputValidator: (value) => {
                        if (!value || value.trim().length < 10) {
                            return 'Debe ingresar el motivo de anulacion (minimo 10 caracteres)';
                        }
                    }
                }).then(async (result) => {
                    if (!result.isConfirmed) return;
                    try {
                        await fetchHelper.post(
                            base_url(['api', 'v1', 'invoices', selected.id, 'void']),
                            { reason: result.value }, {}, 1000
                        );
                        setMessage({ type: 'success', show: true, message: 'Factura anulada exitosamente.' });
                        dataTableRef?.current?.ajax.reload();
                    } catch (err) {
                        setMessage({
                            type: 'danger',
                            show: true,
                            message: err?.message || err?.msg || 'Error al anular la factura.',
                        });
                    }
                });
                return;
            }

            if (action === 'settle') {
                // HU-AP-03 E1: liquidar factura. El backend valida saldo=0 y
                // pagos conciliados antes de aceptar.
                if (selected.status !== 'PAID') {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'Solo se pueden liquidar facturas con saldo $0 (estado Pagada).',
                    });
                    return;
                }
                window.Swal.fire({
                    title: 'Liquidar factura?',
                    text: `Se liquidara la factura #${selected.supplierInvoiceNumber || selected.id}. Esta accion la marca como cerrada definitivamente.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Si, liquidar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                }).then(async (result) => {
                    if (!result.isConfirmed) return;
                    try {
                        await fetchHelper.post(
                            base_url(['api', 'v1', 'invoices', selected.id, 'settle']),
                            {}, {}, 1000
                        );
                        setMessage({ type: 'success', show: true, message: 'Factura liquidada correctamente.' });
                        dataTableRef?.current?.ajax.reload();
                    } catch (err) {
                        setMessage({
                            type: 'danger',
                            show: true,
                            message: err?.message || err?.msg || 'Error al liquidar la factura.',
                        });
                    }
                });
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

            {/* HU-AP-13: documentos soporte de la factura de compra. */}
            <ApAttachmentsModal
                modalRef={modalAttachRef}
                modalInstance={modalAttachInstance}
                invoiceId={attachInvoice?.id}
                invoiceNumber={attachInvoice?.invoiceNumber}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Facturas de Compra"
                columns={[
                    // QA-BLOQUE-AT (2026-04-30): quitado "NIT proveedor" (innecesario,
                    // no aparece en la tabla) y agregado "Resolucion DIAN" en su lugar.
                    { column: 'supplierInvoiceNumber:supplierInvoiceNumber', label: '# Factura Proveedor' },
                    { column: 'resolutionInvoice:resolutionInvoice', label: 'Resolucion DIAN' },
                    { column: 'thirdParty.businessName:thirdParty.businessName', label: 'Proveedor' },
                    { column: 'invoiceDate:invoiceDate', label: 'Fecha', type: 'date' },
                    { column: 'totalPayment:totalPayment', label: 'Total', type: 'number' },
                    { column: 'status:status', label: 'Estado', type: 'select', options: [
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'PAID', label: 'Pagada' },
                        { id: 'PARTIALLY_PAID', label: 'Pago Parcial' },
                        { id: 'OVERDUE', label: 'Vencida' },
                        { id: 'CANCELLED', label: 'Anulada' },
                        { id: 'VOIDED', label: 'Anulada/VOIDED' },
                        { id: 'SETTLED', label: 'Liquidada' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApInvoices;
