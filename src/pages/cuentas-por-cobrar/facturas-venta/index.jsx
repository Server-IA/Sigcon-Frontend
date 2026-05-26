import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url, app_path } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateSalesInvoice from './create';
import UpdatedSalesInvoice from './updated';
import AttachmentsModal from './attachments';

import { statusBadge, traducir } from '../../../utils/statusLabels';
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
    const filterRef = useRef(null);
    const filterInstance = useRef(null);
    // HU-AR-03: modal de adjuntos vinculado a una factura especifica.
    const modalAttachRef = useRef(null);
    const modalAttachInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [attachInvoice, setAttachInvoice] = useState({ id: null, invoiceNumber: '' });

    /** Endpoint DataTable. */
    const url = ['api', 'v1', 'sales-invoices', 'search'];

    /** Columnas DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Factura', data: 'invoiceNumber', name: 'invoiceNumber' },
        {
            // HU-AR-01B E1 + AR-12 E1: el JSON de respuesta trae `thirdPartyName`
            // plano (DTO) pero la entidad SalesInvoice solo tiene
            // `thirdParty.businessName`. El backend usa `name` para resolver
            // el path JPA via DataTableSpecificationBuilder.
            title: 'Cliente',
            data: 'thirdPartyName',
            name: 'thirdParty.businessName',
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
            // HU-AR-12 E1 (2026-04-27): agregado `name` para que el filter
            // del modal pueda mapear la columna y aplicar busqueda por status.
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                return statusBadge(val);
            },
        },
        {
            // HU-AR-01B E5: columna Origen (MANUAL / AAEF) con filtro
            title: 'Origen',
            data: 'source',
            name: 'source',
            render: (val) => {
                const v = val || 'MANUAL';
                const cls = v === 'AAEF' ? 'bg-label-primary' : 'bg-label-secondary';
                return `<span class="badge ${cls}">${v}</span>`;
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
                // HU-AR-08 (2026-04-27): atajo "Registrar cobro" para que el contador
                // pueda aplicar abono parcial sin salir del listado. La factura debe
                // estar emitida y con saldo > 0.
                const canPay = ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(row?.status)
                    && Number(row?.balanceDue ?? 0) > 0;
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
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="register-payment" data-id="${id}" title="Registrar cobro / abono parcial (HU-AR-08)"
                        ${!canPay ? 'disabled' : ''}>
                        <i class="ri-money-dollar-circle-line"></i>
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
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="attachments" data-id="${id}" title="Comprobantes adjuntos (HU-AR-03)">
                        <i class="ri-attachment-2"></i>
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

    // QA Bloque BN (2026-05-18): export "completo" server-side que reemplaza
    // funcionalmente al dropdown "Opciones" del DataTable nativo. El export del
    // DataTable nativo (PDFmake/Excel HTML5) NO traia header empresa, ni
    // filtros aplicados, ni fila TOTAL. Este export hace fetch al endpoint
    // /api/v1/sales-invoices/export/{format} que genera el archivo con el
    // formato unificado del proyecto (mismo modelo que "Estado de cuenta
    // proveedor" exigido por el lider).
    const handleExportServer = async (format) => {
        try {
            // Detectar filtros activos del DataTable para pasarlos al backend.
            const dt = dataTableRef?.current;
            let status = '';
            if (dt) {
                const sCol = dt.column('status:name');
                if (sCol) status = (sCol.search() || '').toString();
            }
            const qs = new URLSearchParams();
            // Solo pasamos status si es un valor simple (no la cadena multi
            // "PARTIALLY_PAID,ISSUED,OVERDUE" del filtro "Solo pendientes").
            if (status && !status.includes(',')) qs.append('status', status);
            const url = `${base_url(['api', 'v1', 'sales-invoices', 'export', format])}${qs.toString() ? '?' + qs.toString() : ''}`;
            const token = localStorage.getItem('token');
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!resp.ok) {
                let detail = `HTTP ${resp.status}`;
                try {
                    const errJson = await resp.json();
                    detail = errJson.msg || errJson.message || errJson.error || detail;
                } catch (_) { /* binary, no json */ }
                throw new Error(detail);
            }
            const blob = await resp.blob();
            const fileName = `facturas-venta.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
            const dlUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(dlUrl);
            setMessage({
                type: 'success',
                show: true,
                message: `Reporte ${format.toUpperCase()} descargado con encabezado de empresa y fila TOTAL.`,
            });
        } catch (err) {
            setMessage({
                type: 'danger',
                show: true,
                message: 'No se pudo exportar el reporte: ' + (err?.message || 'error desconocido'),
            });
        }
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
        // QA Bloque BN: boton dedicado "Exportar reporte" que llama al endpoint
        // server-side. Diferenciado del dropdown "Opciones" (export nativo del
        // DataTable, sin header empresa) hasta que migremos todo a server-side.
        {
            text: '<i class="ri-file-download-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Exportar (Excel)</span>',
            className: 'btn rounded-pill btn-success waves-effect mx-1 my-2',
            action: () => handleExportServer('xlsx'),
        },
        {
            text: '<i class="ri-file-text-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Exportar (CSV)</span>',
            className: 'btn rounded-pill btn-outline-success waves-effect mx-1 my-2',
            action: () => handleExportServer('csv'),
        },
        // HU-AR-12 E1: toggle "Solo pendientes" filtra por status PARTIALLY_PAID/ISSUED/OVERDUE
        // (facturas con saldo > 0). Click 2 veces limpia. Usa coma como separador
        // (la rama IN multi-select del DataTableSpecificationBuilder convierte cada
        // valor al ENUM SalesInvoiceStatus correspondiente).
        {
            text: '<i class="ri-funnel-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Solo pendientes</span>',
            className: 'btn rounded-pill btn-warning waves-effect mx-1 my-2',
            action: () => {
                const dt = dataTableRef?.current;
                if (!dt) return;
                const col = dt.column('status:name');
                const current = col.search();
                if (current && current.includes('PARTIALLY_PAID')) {
                    col.search('').draw();
                } else {
                    col.search('PARTIALLY_PAID,ISSUED,OVERDUE', false, false).draw();
                }
            }
        },
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
                // HU-AR-01B E4: el detalle debe mostrar el estado contable
                // (si fue contabilizada, en que comprobante y con que estado).
                const jeId = selected.journalEntryId;
                // HU-AR-11 E2 (2026-04-27): cuando la factura esta en moneda
                // extranjera, mostrar tambien la conversion a COP usando la
                // tasa de cambio guardada al emitir.
                const isForeign = selected.currencyIso && selected.currencyIso !== 'COP';
                const exRate = Number(selected.exchangeRate) || 1;
                const fxBlock = isForeign ? (val) => `
                    <span class="text-muted small">(≈ ${formatCurrency((Number(val)||0) * exRate)} COP)</span>
                ` : () => '';
                const baseHtml = (jeBlock) => `
                    <div class="text-start">
                        <p><strong>Cliente:</strong> ${selected.thirdPartyName || '-'}</p>
                        <p><strong>Fecha:</strong> ${selected.invoiceDate || '-'}</p>
                        <p><strong>Vencimiento:</strong> ${selected.dueDate || '-'}</p>
                        <p><strong>Moneda:</strong> ${selected.currencyIso || 'COP'} (tasa ${selected.exchangeRate || 1})</p>
                        <p><strong>Subtotal:</strong> ${formatCurrency(selected.subtotal)} ${fxBlock(selected.subtotal)}</p>
                        <p><strong>IVA:</strong> ${formatCurrency(selected.totalTax)} ${fxBlock(selected.totalTax)}</p>
                        <p><strong>Retencion:</strong> ${formatCurrency(selected.totalWithholding)} ${fxBlock(selected.totalWithholding)}</p>
                        <p><strong>Total:</strong> ${formatCurrency(selected.totalAmount)} ${fxBlock(selected.totalAmount)}</p>
                        <p><strong>Saldo:</strong> ${formatCurrency(selected.balanceDue)} ${fxBlock(selected.balanceDue)}</p>
                        <p><strong>Estado factura:</strong> ${traducir(selected.status)}</p>
                        <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        <hr/>
                        <h6 class="text-primary mb-2"><i class="ri-file-list-line me-1"></i>Estado contable</h6>
                        ${jeBlock}
                    </div>`;
                const renderModal = (jeBlock) => window.Swal.fire({
                    title: `Factura ${selected.invoiceNumber || selected.id}`,
                    html: baseHtml(jeBlock),
                    width: 560,
                    showCancelButton: false,
                    showDenyButton: false,
                    confirmButtonText: 'Cerrar',
                });

                if (!jeId) {
                    renderModal(`<p class="text-muted"><em>Sin asiento contable generado.</em></p>`);
                    return;
                }
                // Carga sincrona del JE para mostrar comprobante + estado.
                fetchHelper.get(base_url(['api', 'v1', 'journal-entries', jeId]), {}, 1000, true)
                    .then((resp) => {
                        const je = resp?.data || resp;
                        const status = je?.status || '-';
                        const statusLabel = {
                            DRAFT: '<span class="badge bg-label-secondary">Borrador</span>',
                            POSTED: '<span class="badge bg-label-success">Contabilizado</span>',
                            REVERSED: '<span class="badge bg-label-danger">Reversado</span>',
                        }[status] || `<span class="badge bg-label-secondary">${status}</span>`;
                        const block = `
                            <p><strong>Comprobante:</strong> ${je?.voucherCode || `JE-${jeId}`}</p>
                            <p><strong>Fecha:</strong> ${je?.entryDate || '-'}</p>
                            <p><strong>Estado:</strong> ${statusLabel}</p>
                            <p><strong>Total D / C:</strong> ${formatCurrency(je?.totalDebit)} / ${formatCurrency(je?.totalCredit)}</p>`;
                        renderModal(block);
                    })
                    .catch(() => {
                        renderModal(`<p class="text-warning"><em>No se pudo cargar el comprobante #${jeId}.</em></p>`);
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

            if (action === 'attachments') {
                // HU-AR-03: abrir modal para subir/listar/descargar comprobantes
                // de pago asociados a la factura seleccionada.
                setAttachInvoice({ id: selected.id, invoiceNumber: selected.invoiceNumber });
                if (!modalAttachInstance.current) {
                    modalAttachInstance.current = new window.bootstrap.Modal(modalAttachRef.current);
                }
                modalAttachInstance.current.show();
                return;
            }

            if (action === 'register-payment') {
                // HU-AR-08 (2026-04-27): atajo a /cobros con la factura preseleccionada.
                // El query param invoiceId lo lee la pagina de cobros para abrir el
                // modal Crear cobro con esa factura ya cargada.
                // QA-BLOQUE-AL: usar app_path() para respetar el basename del
                // BrowserRouter (/sigcon/dev/ en Dokploy). Antes el path absoluto
                // saltaba el prefix y caia en una pagina fuera del SPA.
                window.location.assign(app_path(`/cuentas-por-cobrar/cobros?invoiceId=${selected.id}`));
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
                        hideDefaultExport
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

            <AttachmentsModal
                modalRef={modalAttachRef}
                modalInstance={modalAttachInstance}
                invoiceId={attachInvoice.id}
                invoiceNumber={attachInvoice.invoiceNumber}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Facturas de Venta"
                columns={[
                    // HU-AR-12 E1+E2 (2026-04-27): paths JPA reales. El formato
                    // `<jpaPath>:<columnName>` permite al filter mapear el campo
                    // del request al column.name del DataTable. Antes los filtros
                    // usaban `:name` literal y nunca encajaban con ninguna columna,
                    // por eso aparecian sin funcionar.
                    { column: 'invoiceNumber:invoiceNumber', label: '# Factura' },
                    { column: 'thirdParty.businessName:name', label: 'Cliente' },
                    { column: 'invoiceDate:invoiceDate', label: 'Fecha', type: 'date' },
                    { column: 'dueDate:dueDate', label: 'Vence', type: 'date' },
                    { column: 'status:status', label: 'Estado', type: 'select', options: [
                        { id: 'DRAFT', label: 'Borrador' },
                        { id: 'ISSUED', label: 'Emitida' },
                        { id: 'PARTIALLY_PAID', label: 'Pago Parcial' },
                        { id: 'PAID', label: 'Pagada' },
                        { id: 'VOIDED', label: 'Anulada' },
                        { id: 'SETTLED', label: 'Liquidada' },
                    ]},
                    // HU-AR-01B E5: filtro origen MANUAL/AAEF
                    { column: 'integrationSource.source:source', label: 'Origen', type: 'select', options: [
                        { id: 'MANUAL', label: 'Manual' },
                        { id: 'AAEF', label: 'AgroFusion (AAEF)' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexSalesInvoices;
