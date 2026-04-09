import { useState, useEffect, useRef } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url }    from '../../../utils/functions';

import CreateCheque    from './create';
import DetailCheque    from './updated';
import FilterCheque    from './filter';
import AnnulCheque     from './annul';
import LostCheque      from './lost';
import ReconcileCheque from './reconcile';

// ─── Constantes del módulo ────────────────────────────────────────────────────

export const TIPOS_CHEQUE = [
    { id: 'FISICO',  name: 'Físico' },
    { id: 'VIRTUAL', name: 'Virtual' },
];

export const ESTADOS_CHEQUE = [
    { id: 'DISPONIBLE', name: 'Disponible' },
    { id: 'EMITIDO',    name: 'Emitido' },
    { id: 'COBRADO',    name: 'Cobrado' },
    { id: 'ANULADO',    name: 'Anulado' },
    { id: 'EXTRAVIADO', name: 'Extraviado' },
];

export const TIPOS_INCIDENTE = [
    { id: 'EXTRAVIADO',  name: 'Extraviado' },
    { id: 'ROBADO',      name: 'Robado' },
    { id: 'DETERIORADO', name: 'Deteriorado' },
];

export const METODOS_CONCILIACION = [
    { id: 'MANUAL',     name: 'Manual' },
    { id: 'AUTOMATICA', name: 'Automática' },
    { id: 'BANCO',      name: 'Banco' },
];

const ESTADO_BADGE = {
    DISPONIBLE: 'bg-label-secondary',
    EMITIDO:    'bg-label-primary',
    COBRADO:    'bg-label-success',
    ANULADO:    'bg-label-danger',
    EXTRAVIADO: 'bg-label-warning',
};

const TIPO_BADGE = {
    FISICO:  'bg-label-info',
    VIRTUAL: 'bg-label-dark',
};

export const emptyRecord = {
    id:                 '',
    idChequera:         '',
    idCuentaBancaria:   '',
    numeroCheque:       '',
    beneficiario:     '',
    valorCheque:      '',
    concepto:         '',
    fechaExpedicion:  '',
    tipoCheque:       'FISICO',
    estadoCheque:     'EMITIDO',
    fechaCobro:       '',
    idMovimiento:     '',
    observaciones:    '',
    documentoSoporte: '',
};

// ─── Componente principal ─────────────────────────────────────────────────────

const IndexCheques = () => {

    const tableRef     = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef      = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalDetailRef      = useRef(null);
    const modalDetailInstance = useRef(null);

    const modalAnnulRef      = useRef(null);
    const modalAnnulInstance = useRef(null);

    const modalLostRef      = useRef(null);
    const modalLostInstance = useRef(null);

    const modalReconcileRef      = useRef(null);
    const modalReconcileInstance = useRef(null);

    const [data,           setData]           = useState([]);
    const [selectedRecord, setSelectedRecord] = useState({ ...emptyRecord });
    const [message,        setMessage]        = useState({ message: '', type: '', show: false });
    const [search,         setSearch]         = useState({ value: '', checked: true });

    const [clickView,      setClickView]      = useState(false);
    const [clickAnnul,     setClickAnnul]     = useState(false);
    const [clickLost,      setClickLost]      = useState(false);
    const [clickReconcile, setClickReconcile] = useState(false);

    const url = ['api', 'v1', 'banks', 'checks', 'search'];

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return '-';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 2,
        }).format(val);
    };

    const columns = [
        { title: 'N° Cheque',        data: 'numberCheck',  name: 'numberCheck' },
        { title: 'Beneficiario',     data: 'beneficiary',  name: 'beneficiary' },
        {
            title: 'Valor', data: 'value', name: 'value', searchable: false,
            render: (val) => formatCurrency(val),
        },
        { title: 'Concepto',         data: 'concept',   name: 'concept' },
        { title: 'Fecha Expedición', data: 'issueDate', name: 'issueDate', searchable: false },
        {
            title: 'Tipo', data: 'typeCheck', name: 'typeCheck',
            render: (val) => val
                ? `<span class="badge ${TIPO_BADGE[val] || 'bg-label-secondary'}">${val === 'FISICO' ? 'Físico' : 'Virtual'}</span>`
                : '-',
        },
        {
            title: 'Estado', data: 'statusCheck', name: 'statusCheck',
            render: (val) => val
                ? `<span class="badge ${ESTADO_BADGE[val] || 'bg-label-secondary'}">${ESTADOS_CHEQUE.find(e => e.id === val)?.name || val}</span>`
                : '-',
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id, _type, row) => {
                const estado = row.statusCheck;
                const tipo   = row.typeCheck;

                let btns = `
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver detalle">
                        <i class="ri-eye-line"></i>
                    </button>`;

                if (estado === 'EMITIDO' || estado === 'DISPONIBLE') {
                    btns += `
                    <button class="btn btn-sm btn-label-danger action-btn ms-1"
                        data-action="annul" data-id="${id}" title="Anular cheque">
                        <i class="ri-close-circle-line"></i>
                    </button>`;
                }

                if (estado === 'EMITIDO' && tipo === 'FISICO') {
                    btns += `
                    <button class="btn btn-sm btn-label-warning action-btn ms-1"
                        data-action="lost" data-id="${id}" title="Reportar extravío">
                        <i class="ri-alert-line"></i>
                    </button>`;
                }

                if (estado === 'EMITIDO') {
                    btns += `
                    <button class="btn btn-sm btn-label-success action-btn ms-1"
                        data-action="reconcile" data-id="${id}" title="Registrar cobro">
                        <i class="ri-check-double-line"></i>
                    </button>`;
                }

                if (estado === 'DISPONIBLE') {
                    btns += `
                    <button class="btn btn-sm btn-label-danger action-btn ms-1"
                        data-action="delete" data-id="${id}" title="Eliminar cheque">
                        <i class="ri-delete-bin-line"></i>
                    </button>`;
                }

                return `<div class="d-flex gap-1 flex-wrap">${btns}</div>`;
            },
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setSelectedRecord({ ...emptyRecord });
        modalCreateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            },
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Emitir Cheque</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); },
        },
    ];

    useEffect(() => {
        if (!clickView) return;
        if (!modalDetailInstance.current) {
            modalDetailInstance.current = new window.bootstrap.Modal(modalDetailRef.current);
        }
        modalDetailInstance.current.show();
        setClickView(false);
    }, [clickView]);

    useEffect(() => {
        if (!clickAnnul) return;
        if (!modalAnnulInstance.current) {
            modalAnnulInstance.current = new window.bootstrap.Modal(modalAnnulRef.current);
        }
        modalAnnulInstance.current.show();
        setClickAnnul(false);
    }, [clickAnnul]);

    useEffect(() => {
        if (!clickLost) return;
        if (!modalLostInstance.current) {
            modalLostInstance.current = new window.bootstrap.Modal(modalLostRef.current);
        }
        modalLostInstance.current.show();
        setClickLost(false);
    }, [clickLost]);

    useEffect(() => {
        if (!clickReconcile) return;
        if (!modalReconcileInstance.current) {
            modalReconcileInstance.current = new window.bootstrap.Modal(modalReconcileRef.current);
        }
        modalReconcileInstance.current.show();
        setClickReconcile(false);
    }, [clickReconcile]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const ref    = data.find(r => r.id === id);

            if (!ref) {
                console.warn('Cheque no encontrado en data', id);
                return;
            }

            setSelectedRecord({
                id:                 ref.id                       ?? '',
                idChequera:         ref.checkbook?.id            ?? '',
                idCuentaBancaria:   ref.checkbook?.bankAccountId ?? '',
                numeroCheque:       ref.numberCheck              ?? '',
                beneficiario:     ref.beneficiary              ?? '',
                valorCheque:      ref.value                    ?? '',
                concepto:         ref.concept                  ?? '',
                fechaExpedicion:  ref.issueDate                ?? '',
                tipoCheque:       ref.typeCheck                ?? 'FISICO',
                estadoCheque:     ref.statusCheck              ?? '',
                fechaCobro:       ref.collectionDate           ?? '',
                idMovimiento:     ref.financialMovementId      ?? '',
                observaciones:    ref.observations             ?? '',
                documentoSoporte: ref.supportDocumentPath      ?? '',
            });

            switch (action) {
                case 'view':      setClickView(true);      break;
                case 'annul':     setClickAnnul(true);     break;
                case 'lost':      setClickLost(true);      break;
                case 'reconcile': setClickReconcile(true); break;
                case 'delete': {
                    window.Swal.fire({
                        title: '¿Eliminar cheque?',
                        html: `¿Está seguro de eliminar el cheque <strong>N° ${ref.numeroCheque}</strong>?<br/><br/><em>Esta acción no se puede deshacer.</em>`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            const url = base_url(['api', 'v1', 'banks', 'checks', ref.id]);
                            await fetchHelper.delete(url, {}, 1000);
                            dataTableRef?.current?.ajax.reload();
                            setMessage({ message: `Cheque N° ${ref.numeroCheque} eliminado exitosamente`, type: 'success', show: true });
                        } catch (error) {
                            setMessage({ message: error?.msg || 'Error al eliminar el cheque', type: 'danger', show: true });
                        }
                    });
                    break;
                }
                default: console.warn('Acción no reconocida', action);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Cheques — Gestión de Chequeras</h5>

                <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method='POST'
                        buttons={buttons}
                        title='Cheques'
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>

                <FilterCheque
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                    estados={ESTADOS_CHEQUE}
                    tipos={TIPOS_CHEQUE}
                />
            </div>

            <CreateCheque
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                tipos={TIPOS_CHEQUE}
            />

            <DetailCheque
                modalRef={modalDetailRef}
                record={selectedRecord}
            />

            <AnnulCheque
                modalRef={modalAnnulRef}
                modalInstance={modalAnnulInstance}
                record={selectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                onReportLost={() => setClickLost(true)}
            />

            <LostCheque
                modalRef={modalLostRef}
                modalInstance={modalLostInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                tiposIncidente={TIPOS_INCIDENTE}
            />

            <ReconcileCheque
                modalRef={modalReconcileRef}
                modalInstance={modalReconcileInstance}
                record={selectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                metodos={METODOS_CONCILIACION}
            />
        </>
    );
};

export default IndexCheques;
