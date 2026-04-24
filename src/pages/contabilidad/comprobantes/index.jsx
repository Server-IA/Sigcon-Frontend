import { useState, useEffect, useRef, useMemo } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import CreateComprobante from './create';
import UpdateComprobante from './updated';

/**
 * Pagina principal de Comprobantes Contables (CG).
 * Muestra un listado paginado con DataTable y permite crear, contabilizar,
 * reversar y eliminar comprobantes (journal entries).
 */

/** Colores de badge por estado de comprobante. */
const STATUS_BADGE = {
    DRAFT:    'bg-label-warning',
    POSTED:   'bg-label-success',
    REVERSED: 'bg-label-danger',
};

/** Etiquetas en espanol por estado. */
const STATUS_LABEL = {
    DRAFT:    'Borrador',
    POSTED:   'Contabilizado',
    REVERSED: 'Reversado',
};

/** Etiquetas de modulo origen. */
const SOURCE_LABEL = {
    CG:  'Contabilidad',
    AP:  'Cuentas por Pagar',
    AR:  'Cuentas por Cobrar',
    BNK: 'Bancos y Cajas',
    ACT: 'Activos Fijos',
    NOM: 'Nomina',
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

const IndexCgComprobantes = () => {
    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef      = useRef(null);
    const modalUpdateInstance = useRef(null);
    const filterRef           = useRef(null);
    const filterInstance      = useRef(null);

    const [data, setData]     = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [editEntryId, setEditEntryId] = useState(null);

    /** Endpoint de busqueda paginada de comprobantes. */
    const url = ['api', 'v1', 'journal-entries', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Comprobante', data: 'voucherCode', name: 'entryNumber',
            // HU-CG-08B E3 / HU-CG-08C E2: muestra el voucherCode (REV-/COR-/JE-)
            // y, cuando es una reversion, hipervinculo al asiento original.
            render: (val, _type, row) => {
                const code = val || ('JE-' + (row.fiscalYear || '') + '-' + (row.entryNumber || row.id));
                if (row.reversalOfId) {
                    const origLink = row.reversalOfVoucherCode || ('JE-' + (row.fiscalYear || '') + '-' + (row.reversalOfNumber || ''));
                    return `<span class="badge bg-label-warning">${code}</span>
                            <small class="text-muted d-block">↩ <a href="#" class="rev-link" data-related-id="${row.reversalOfId}">${origLink}</a></small>`;
                }
                if (row.correctionOfId) {
                    return `<span class="badge bg-label-info">${code}</span>`;
                }
                return `<code>${code}</code>`;
            },
        },
        { title: 'Fecha', data: 'entryDate', name: 'entryDate' },
        {
            title: 'Descripcion', data: 'description', name: 'description',
            render: (val) => val || '-',
        },
        {
            title: 'Modulo Origen', data: 'sourceModule', name: 'sourceModule',
            render: (val) => SOURCE_LABEL[val] || val || '-',
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Total Debito', data: 'totalDebit', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Total Credito', data: 'totalCredit', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id, _type, row) => {
                const isDraft  = row?.status === 'DRAFT';
                const isPosted = row?.status === 'POSTED';

                let btns = `
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver detalle">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="export-pdf" data-id="${id}" title="Exportar PDF">
                        <i class="ri-file-pdf-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="export-xlsx" data-id="${id}" title="Exportar Excel">
                        <i class="ri-file-excel-2-line"></i>
                    </button>`;

                if (isDraft) {
                    btns += `
                        <button class="btn btn-sm btn-label-primary action-btn"
                            data-action="edit" data-id="${id}" title="Editar">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-success action-btn"
                            data-action="post" data-id="${id}" title="Contabilizar">
                            <i class="ri-check-double-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-danger action-btn"
                            data-action="delete" data-id="${id}" title="Eliminar">
                            <i class="ri-delete-bin-5-line"></i>
                        </button>`;
                }
                if (isPosted) {
                    btns += `
                        <button class="btn btn-sm btn-label-warning action-btn"
                            data-action="reverse" data-id="${id}" title="Reversar">
                            <i class="ri-arrow-go-back-line"></i>
                        </button>`;
                }

                return `<div class="d-flex gap-1 flex-wrap">${btns}</div>`;
            },
        },
    ];

    /** Abre modal de creacion de comprobante. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Botones de cabecera del DataTable. */
    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            },
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nuevo Comprobante</span>',
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

    /** Listener de acciones por fila (view, post, reverse, delete). */
    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const row    = rows.find(m => m.id === id);
            if (!row) return;

            switch (action) {
                case 'export-pdf':
                case 'export-xlsx': {
                    // HU-CG-01C: descarga directa del comprobante en el formato pedido.
                    // Usa fetch nativo (no fetchHelper) porque la respuesta es un Blob,
                    // no JSON, y necesitamos la cabecera Content-Disposition para el nombre.
                    const isPdf = action === 'export-pdf';
                    const ext   = isPdf ? 'pdf' : 'xlsx';
                    const url   = base_url(['api', 'v1', 'journal-entries', row.id, ext]);
                    fetch(url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } })
                        .then(async (resp) => {
                            if (!resp.ok) {
                                const err = await resp.json().catch(() => ({}));
                                throw new Error(err.message || err.error || 'Error al exportar el comprobante.');
                            }
                            const blob = await resp.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = `comprobante-${row.entryNumber || row.id}.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(a.href);
                        })
                        .catch((err) => {
                            setMessage({ type: 'danger', show: true, message: err?.message || 'Error al exportar.' });
                        });
                    break;
                }
                case 'edit': {
                    // HU-CG-07A: editar comprobante en BORRADOR.
                    setEditEntryId(row.id);
                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                    }
                    modalUpdateInstance.current.show();
                    break;
                }
                case 'view': {
                    // HU-CG-08C E2: traer documentos relacionados (REV original/REV reverso, CORR, etc.)
                    // y renderizarlos en un panel "Documentos Relacionados" dentro del viewer.
                    fetchHelper.get(
                        base_url(['api', 'v1', 'journal-entries', row.id, 'related-docs']),
                        {}, 0
                    ).then(resp => {
                        const related = (resp?.data || []);
                        const relationLabel = {
                            REVERSA_A:     'Reversa al',
                            CORRIGE_A:     'Corrige al',
                            REVERSADO_POR: 'Reversado por',
                            CORREGIDO_POR: 'Corregido por',
                        };
                        const relatedHtml = related.length > 0
                            ? `<div class="mt-3 pt-2 border-top">
                                <strong class="d-block mb-2">📎 Documentos Relacionados</strong>
                                <ul class="list-unstyled small mb-0">
                                  ${related.map(r => `
                                    <li class="mb-1">
                                      <span class="badge bg-label-secondary me-1">${relationLabel[r.relation] || r.relation}</span>
                                      <code>${r.voucherCode}</code>
                                      <span class="text-muted">— ${r.description || ''} (${r.entryDate || ''})</span>
                                    </li>`).join('')}
                                </ul>
                              </div>`
                            : '';
                        const codeShown = row.voucherCode || `#${row.entryNumber || row.id}`;
                        window.Swal.fire({
                            title: `Comprobante ${codeShown}`,
                            html: `
                                <div class="text-start">
                                    <p class="mb-1"><strong>Fecha:</strong> ${row.entryDate || '-'}</p>
                                    <p class="mb-1"><strong>Descripcion:</strong> ${row.description || '-'}</p>
                                    <p class="mb-1"><strong>Modulo Origen:</strong> ${SOURCE_LABEL[row.sourceModule] || row.sourceModule || '-'}</p>
                                    <p class="mb-1"><strong>Estado:</strong> ${STATUS_LABEL[row.status] || row.status}</p>
                                    <p class="mb-1"><strong>Total Debito:</strong> ${formatCurrency(row.totalDebit)}</p>
                                    <p class="mb-1"><strong>Total Credito:</strong> ${formatCurrency(row.totalCredit)}</p>
                                    ${relatedHtml}
                                </div>`,
                            width: 600,
                            confirmButtonText: 'Cerrar',
                        });
                    }).catch(() => {
                        // Si el endpoint relacional falla, fallback al modal simple
                        window.Swal.fire({
                            title: `Comprobante #${row.entryNumber || row.id}`,
                            html: `<div class="text-start">
                                    <p><strong>Fecha:</strong> ${row.entryDate || '-'}</p>
                                    <p><strong>Descripcion:</strong> ${row.description || '-'}</p>
                                    <p><strong>Estado:</strong> ${STATUS_LABEL[row.status] || row.status}</p>
                                  </div>`,
                            confirmButtonText: 'Cerrar',
                        });
                    });
                    break;
                }
                case 'post': {
                    window.Swal.fire({
                        title: 'Contabilizar comprobante',
                        html: `¿Esta seguro de contabilizar el comprobante <strong>#${row.entryNumber || row.id}</strong>?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Si, contabilizar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#28a745',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'journal-entries', row.id, 'post']),
                                {}, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true, message: 'Comprobante contabilizado exitosamente.' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al contabilizar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                case 'reverse': {
                    // El backend exige 'description' obligatorio (@NotBlank en
                    // ReverseEntryRequest). Pedimos el motivo al usuario con un input.
                    window.Swal.fire({
                        title: 'Reversar comprobante',
                        html: `<p>Reversar comprobante <strong>#${row.entryNumber || row.id}</strong>. Se creara un comprobante de reversion.</p>`,
                        input: 'text',
                        inputLabel: 'Motivo de la reversion (obligatorio)',
                        inputPlaceholder: 'Ej: error en la cuenta contable seleccionada',
                        inputAttributes: { maxlength: 500 },
                        inputValidator: (value) => {
                            if (!value || !value.trim()) {
                                return 'El motivo es obligatorio.';
                            }
                            if (value.trim().length < 10) {
                                return 'El motivo debe tener al menos 10 caracteres.';
                            }
                            return null;
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Si, reversar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                        icon: 'warning',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'journal-entries', row.id, 'reverse']),
                                { description: result.value.trim() }, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true, message: 'Comprobante reversado exitosamente.' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al reversar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                case 'delete': {
                    if (row.status !== 'DRAFT') {
                        setMessage({
                            type: 'warning', show: true,
                            message: 'Solo se pueden eliminar comprobantes en estado BORRADOR.',
                        });
                        return;
                    }
                    window.Swal.fire({
                        title: 'Eliminar comprobante',
                        html: `¿Esta seguro de eliminar el comprobante <strong>#${row.entryNumber || row.id}</strong>?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.delete(
                                base_url(['api', 'v1', 'journal-entries', row.id]),
                                {}, 1000
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true, message: 'Comprobante eliminado exitosamente.' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al eliminar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                default:
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Comprobantes Contables</h5>

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
                        title="Comprobantes Contables"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateComprobante
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <UpdateComprobante
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                entryId={editEntryId}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Comprobantes Contables"
                columns={[
                    { column: 'entryNumber:name',  label: '# Comprobante', type: 'number' },
                    { column: 'entryDate:name',    label: 'Fecha',         type: 'date' },
                    { column: 'description:name',  label: 'Descripción' },
                    { column: 'sourceModule:name', label: 'Módulo Origen', type: 'select', options: [
                        { id: 'AP',     label: 'Cuentas por Pagar' },
                        { id: 'AR',     label: 'Cuentas por Cobrar' },
                        { id: 'BNK',    label: 'Bancos y Cajas' },
                        { id: 'ACT',    label: 'Activos' },
                        { id: 'NOM',    label: 'Nómina' },
                        { id: 'CG',     label: 'Contabilidad General' },
                        { id: 'MANUAL', label: 'Manual' },
                    ]},
                    { column: 'status:name',       label: 'Estado', type: 'select', options: [
                        { id: 'DRAFT',    label: 'Borrador' },
                        { id: 'POSTED',   label: 'Contabilizado' },
                        { id: 'REVERSED', label: 'Reversado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexCgComprobantes;
