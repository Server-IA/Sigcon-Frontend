import { useEffect, useMemo, useRef, useState } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateCheckbook from './create';
import UpdatedCheckbook from './updated';
import FilterCheckbook from './filter';

// Estados del dominio de chequeras.
export const CHECKBOOK_STATUS = [
    { id: 'ACTIVA', name: 'Activa' },
    { id: 'AGOTADA', name: 'Agotada' },
    { id: 'ANULADA', name: 'Anulada' },
    { id: 'BLOQUEADA', name: 'Bloqueada' },
];

// Colores de badge por estado.
const STATUS_BADGE = {
    ACTIVA: 'bg-label-success',
    AGOTADA: 'bg-label-warning',
    ANULADA: 'bg-label-danger',
    BLOQUEADA: 'bg-label-secondary',
};

// Estados donde no se debe permitir la accion de eliminar desde UI.
const NON_DELETABLE_STATUSES = ['ANULADA', 'BLOQUEADA'];

// Modelo base para crear/editar.
export const emptyCheckbookRecord = {
    id: null,
    bankAccountId: '',
    bankAccountLabel: '',
    checkbookNumber: '',
    issuingBank: '',
    checkStartNumber: '',
    checkEndNumber: '',
    receivedDate: '',
    activationDate: '',
    status: 'ACTIVA',
    observations: '',
};

// Normaliza una fila de backend al modelo interno.
const mapCheckbookRecord = (row = {}) => ({
    id: row.id ?? null,
    bankAccountId: row.bankAccountId ?? '',
    bankAccountLabel: row.bankAccountLabel ?? row.bankAccountNumber ?? row.accountNumber ?? '',
    checkbookNumber: row.checkbookNumber ?? '',
    issuingBank: row.issuingBank ?? '',
    checkStartNumber: row.checkStartNumber ?? '',
    checkEndNumber: row.checkEndNumber ?? '',
    receivedDate: row.receivedDate ?? '',
    activationDate: row.activationDate ?? '',
    status: row.status ?? 'ACTIVA',
    observations: row.observations ?? '',
});

const IndexCheckbooks = () => {

    // Refs de DataTable y modales bootstrap.
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalViewRef = useRef(null);
    const modalViewInstance = useRef(null);

    // Estado principal de pantalla.
    const [data, setData] = useState([]);
    const [record, setRecord] = useState({ ...emptyCheckbookRecord });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [search, setSearch] = useState({ value: '', checked: true });

    // Endpoint oficial para consulta paginada.
    const url = ['api', 'v1', 'checkbooks', 'search'];

    // Opciones de cuenta armadas con los datos de la tabla.
    const accountOptions = useMemo(() => {
        const map = new Map();
        data.forEach(item => {
            if (item.bankAccountId === null || item.bankAccountId === undefined) return;
            const id = String(item.bankAccountId);
            const name = item.bankAccountLabel ?? item.bankAccountNumber ?? item.accountNumber ?? `Cuenta #${id}`;
            map.set(id, { id, name });
        });
        return Array.from(map.values());
    }, [data]);

    // Acciones visibles por fila (sin lÃ³gica de permisos local).
    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    // Columnas del listado.
    const columns = [
        { title: 'ID', data: 'id', name: 'id' },
        { title: 'ID CUENTA BANCARIA', data: 'bankAccountId', name: 'bankAccountId' },
        { title: 'BANCO EMISOR', data: 'issuingBank', name: 'issuingBank' },
        { title: 'NO. CHEQUERA', data: 'checkbookNumber', name: 'checkbookNumber' },
        { title: 'CHEQUE INICIAL', data: 'checkStartNumber', name: 'checkStartNumber' },
        { title: 'CHEQUE FINAL', data: 'checkEndNumber', name: 'checkEndNumber' },
        { title: 'F. RECEPCION', data: 'receivedDate', name: 'receivedDate' },
        { title: 'F. ACTIVACION', data: 'activationDate', name: 'activationDate' },
        {
            title: 'ESTADO',
            data: 'status',
            name: 'status',
            render: (status) => `<span class="badge ${STATUS_BADGE[status] || 'bg-label-secondary'}">${status || '-'}</span>`,
        },
        {
            title: 'ACCIONES',
            data: 'id',
            searchable: false,
            // Deshabilita eliminar cuando la chequera ya esta anulada o bloqueada.
            render: (id, _type, row) => {
                const isDeleteDisabledByStatus = NON_DELETABLE_STATUSES.includes(row?.status);
                return `
                <div class="d-flex gap-1">
                    ${actions.map(action => {
                        const isDeleteAction = action.key === 'delete';
                        const isDisabled = isDeleteAction && isDeleteDisabledByStatus;
                        const title = isDisabled ? 'No disponible para estado ANULADA/BLOQUEADA' : action.title;
                        return `
                        <button class="btn btn-sm ${action.class} action-btn"
                            data-action="${action.key}"
                            data-id="${id}"
                            title="${title}"
                            ${isDisabled ? 'disabled' : ''}>
                            <i class="${action.icon}"></i>
                        </button>
                    `;
                    }).join('')}
                </div>
            `;
            },
        },
    ];

    // Abre modal de crear.
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setRecord({ ...emptyCheckbookRecord });
        modalCreateInstance.current.show();
    };

    // Abre modal de editar.
    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    // Abre modal de visualizacion.
    const openModalView = () => {
        if (!modalViewInstance.current) {
            modalViewInstance.current = new window.bootstrap.Modal(modalViewRef.current);
        }
        modalViewInstance.current.show();
    };

    // Eliminacion: confirmacion + motivo + confirmacion reforzada por texto.
    const handleDelete = async (selected) => {
        const confirm = await window.Swal.fire({
            title: '¿Eliminar chequera?',
            text: `Se eliminara la chequera ${selected.checkbookNumber || ''}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        // Solicita motivo obligatorio antes del DELETE.
        const reasonPrompt = await window.Swal.fire({
            title: 'Motivo de eliminacion',
            input: 'text',
            inputLabel: 'Ingrese el motivo (requerido)',
            inputPlaceholder: 'Motivo',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') return 'El motivo es obligatorio';
            },
        });
        if (!reasonPrompt.isConfirmed) return;

        // Segunda confirmacion por texto para evitar eliminaciones accidentales.
        const confirmTextPrompt = await window.Swal.fire({
            title: 'Confirmacion reforzada',
            html: 'Esta accion no se puede deshacer.<br/>Escriba <b>Estoy seguro</b> para continuar.',
            input: 'text',
            inputLabel: 'Confirmacion por texto',
            inputPlaceholder: 'Estoy seguro',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') return 'Debe escribir "Estoy seguro"';
                if (value.trim() !== 'Estoy seguro') return 'El texto debe ser exactamente: "Estoy seguro"';
            },
        });
        if (!confirmTextPrompt.isConfirmed) return;

        try {
            const reason = reasonPrompt.value.trim();
            const deleteUrl = base_url(['api', 'v1', 'checkbooks', selected.id], { reason });
            await fetchHelper.delete(deleteUrl, { reason }, {}, 1000, false);

            setMessage({
                type: 'success',
                show: true,
                message: 'Operacion completada exitosamente',
            });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'No fue posible completar la operacion',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    // Botones de cabecera.
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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nueva chequera</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); },
        },
    ];

    // Listener de acciones por fila.
    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const selected = data.find(item => item.id === id);
            if (!selected) return;

            if (action === 'view') {
                setRecord(mapCheckbookRecord(selected));
                openModalView();
                return;
            }

            if (action === 'edit') {
                setRecord(mapCheckbookRecord(selected));
                openModalUpdate();
                return;
            }

            if (action === 'delete') {
                // Valida nuevamente en el handler para evitar ejecuciones forzadas por consola.
                if (NON_DELETABLE_STATUSES.includes(selected.status)) {
                    setMessage({
                        type: 'warning',
                        show: true,
                        message: 'No se puede eliminar una chequera en estado ANULADA o BLOQUEADA',
                    });
                    return;
                }
                handleDelete(selected);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

/*         useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const onXhr = (_e, _settings, json) => {
        console.log("recordsTotal:", json?.recordsTotal, typeof json?.recordsTotal);
        console.log("recordsFiltered:", json?.recordsFiltered, typeof json?.recordsFiltered);
        console.log("rows:", json?.data?.length);
    };

    table.on("xhr.dt", onXhr);
    return () => table.off("xhr.dt", onXhr);
    }, []); */


    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Chequeras</h5>

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
                        title="Chequeras"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100, 200]}
                    />
                </div>

                <FilterCheckbook
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                    statuses={CHECKBOOK_STATUS}
                    accountOptions={accountOptions}
                />
            </div>

            <CreateCheckbook
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                record={record}
                setRecord={setRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                accountOptions={accountOptions}
            />

            <UpdatedCheckbook
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                record={record}
                setRecord={setRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                statuses={CHECKBOOK_STATUS}
                accountOptions={accountOptions}
            />

            <UpdatedCheckbook
                modalRef={modalViewRef}
                modalInstance={modalViewInstance}
                record={record}
                setRecord={setRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                statuses={CHECKBOOK_STATUS}
                accountOptions={accountOptions}
                readOnly
                modalId="modalViewCheckbook"
            />
        </>
    );
};

export default IndexCheckbooks;



