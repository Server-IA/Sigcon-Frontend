import { useState, useEffect, useRef, useMemo } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import CreateComprobante from './create';

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

    const [data, setData]     = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Endpoint de busqueda paginada de comprobantes. */
    const url = ['api', 'v1', 'journal-entries', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Comprobante', data: 'entryNumber', name: 'entryNumber' },
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
                    </button>`;

                if (isDraft) {
                    btns += `
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
                case 'view': {
                    window.Swal.fire({
                        title: `Comprobante #${row.entryNumber || row.id}`,
                        html: `
                            <div class="text-start">
                                <p><strong>Fecha:</strong> ${row.entryDate || '-'}</p>
                                <p><strong>Descripcion:</strong> ${row.description || '-'}</p>
                                <p><strong>Modulo Origen:</strong> ${SOURCE_LABEL[row.sourceModule] || row.sourceModule || '-'}</p>
                                <p><strong>Estado:</strong> ${STATUS_LABEL[row.status] || row.status}</p>
                                <p><strong>Total Debito:</strong> ${formatCurrency(row.totalDebit)}</p>
                                <p><strong>Total Credito:</strong> ${formatCurrency(row.totalCredit)}</p>
                            </div>`,
                        width: 500,
                        confirmButtonText: 'Cerrar',
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
                    window.Swal.fire({
                        title: 'Reversar comprobante',
                        html: `¿Esta seguro de reversar el comprobante <strong>#${row.entryNumber || row.id}</strong>? Se creara un comprobante de reversion.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, reversar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'journal-entries', row.id, 'reverse']),
                                {}, {}, 1000, true
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
        </>
    );
};

export default IndexCgComprobantes;
