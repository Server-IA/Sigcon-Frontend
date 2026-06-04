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
    bankAccountId: row.bankAccount.id ?? '',
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

// Traduce mensajes existentes del backend al catalogo BNK solicitado.
const mapCheckbookErrorMessage = (rawMessage = '') => {
    const message = String(rawMessage || '');
    const normalized = message.toLowerCase();

    if (normalized.includes('rango superpuesto') || normalized.includes('superpuesto')) {
        return 'BNK-ERR-065: "Rango de cheques superpuesto con chequera existente"';
    }
    if (normalized.includes('duplicidad') || normalized.includes('duplicado')) {
        return 'BNK-ERR-060: "Duplicidad de número de chequera en la misma cuenta"';
    }
    if (normalized.includes('no consecutiv') || normalized.includes('rango invalido') || normalized.includes('rango de cheques invalido')) {
        return 'BNK-ERR-061: "Rango de cheques inválido - números no consecutivos"';
    }
    if (normalized.includes('inactiva') || normalized.includes('no habilitada para chequeras')) {
        return 'BNK-ERR-062: "Cuenta financiera inactiva o no habilitada para chequeras"';
    }
    if (normalized.includes('estado inicial no permitido') || normalized.includes('no se puede crear en estado agotada/anulada')) {
        return 'BNK-ERR-063: "Estado inicial no permitido - no se puede crear en estado AGOTADA/ANULADA"';
    }
    if (normalized.includes('permisos insuficientes') || normalized.includes('access denied') || normalized.includes('permiso denegado')) {
        return 'BNK-ERR-064: "Permisos insuficientes para creación/modificación de chequeras"';
    }

    return message;
};

// Interpreta errores de negocio retornados en body aunque el HTTP sea 200.
const ensureBusinessSuccess = (response) => {
    const payload = response?.data ?? response;
    const hasBusinessError =
        response?.success === false
        || payload?.success === false
        || Number(response?.code) >= 400
        || Number(payload?.code) >= 400;

    if (hasBusinessError) {
        const rawMessage = response?.message || payload?.message || response?.error || payload?.error || 'Operacion rechazada por backend';
        throw {
            msg: mapCheckbookErrorMessage(rawMessage),
            errors: response?.errors || payload?.errors || response?.details || payload?.details || [],
            status: Number(response?.code) || Number(payload?.code) || 400,
        };
    }

    return payload;
};

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

    // Evita que queden elementos enfocados al abrir/cerrar modales (accesibilidad).
    const blurActiveElement = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    // Estado principal de pantalla.
    const [data, setData] = useState([]);
    const [record, setRecord] = useState({ ...emptyCheckbookRecord });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [search, setSearch] = useState({ value: '', checked: true });
    const [banksAccount, setBanksAccount] = useState([]);

    // Normaliza la data de tabla para evitar errores si backend cambia el shape.
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    // Endpoint oficial para consulta paginada.
    const url = ['api', 'v1', 'banks', 'checkbooks', 'search'];

    const loadData = async () => {
        try {
            const {data} = await fetchHelper.post(base_url(['api', 'v1', 'bank-accounts', 'search']), {
                length: -1,
                columns: [
                    {data: 'handlesCheckbook', name: 'handlesCheckbook', searchable: true, search: {"value": true, "regex": false}},
                    {data: 'status', name: 'status', searchable: true, search: {"value": "ACTIVA", "regex": false}},
                ]
            },{}, 0);
            
            setBanksAccount(data);
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error.msg || error?.message || 'No fue posible completar la operacion',
            });
        }
    }

    useEffect(() => {
        console.log(record,'record');
    }, [record]);

    // Opciones de cuenta armadas con los datos de la tabla.
    const accountOptions = useMemo(() => {
        const map = new Map();
        rows.forEach(item => {
            if (item.bankAccountId === null || item.bankAccountId === undefined) return;
            const id = String(item.bankAccountId);
            const name = item.bankAccountLabel ?? item.bankAccountNumber ?? item.accountNumber ?? `Cuenta #${id}`;
            map.set(id, { id, name });
        });
        return Array.from(map.values());
    }, [rows]);

    // Acciones visibles por fila
    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    // Columnas del listado.
    const columns = [
        { title: 'ID', data: 'id', name: 'id' },
        {
            // En busqueda server-side el backend resuelve la relacion como bankAccount.id.
            title: 'CUENTA BANCARIA',
            data: 'bankAccount.accountName',
            name: 'bankAccount.accountName',
        },
        // QA HU-019 E2: el `name` apunta al atributo JPA real (bankAccount.bank.name).
        // Antes era `bankAccount.bankDTO.name` -> crash *"Could not resolve attribute 'bankDTO'..."*.
        { title: 'BANCO EMISOR', data: 'bankAccount.bankDTO.name', name: 'bankAccount.bank.name' },
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
        blurActiveElement();
        modalUpdateInstance.current.show();
    };

    // Abre modal de visualizacion.
    const openModalView = () => {
        if (!modalViewInstance.current) {
            modalViewInstance.current = new window.bootstrap.Modal(modalViewRef.current);
        }
        blurActiveElement();
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
        // QA BNK (2026-06-03 / doc validaciones BNK-RF-15): cuadro mas grande (textarea) +
        // motivo min 10 / max 500 + clase de caracteres (letras, numeros, espacios,
        // puntos, comas, guiones, guion bajo).
        const reasonPrompt = await window.Swal.fire({
            title: 'Motivo de eliminacion',
            input: 'textarea',
            inputLabel: 'Ingrese el motivo (requerido, entre 10 y 500 caracteres)',
            inputPlaceholder: 'Describa el motivo de la eliminacion de la chequera',
            inputAttributes: { maxlength: 500, rows: 5 },
            showCancelButton: true,
            confirmButtonText: 'Siguiente',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                const v = (value || '').trim();
                if (v.length < 10) return 'El motivo es obligatorio y debe tener al menos 10 caracteres';
                if (v.length > 500) return 'El motivo no puede superar los 500 caracteres';
                if (!/^[\p{L}0-9 .,_-]+$/u.test(value)) return 'El motivo contiene caracteres no válidos';
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
            const deleteUrl = base_url(['api', 'v1', 'banks', 'checkbooks', 'delete']);
            const response = await fetchHelper.post(deleteUrl, { id: selected.id, reason }, {}, 1000, false);
            ensureBusinessSuccess(response);

            setMessage({
                type: 'success',
                show: true,
                message: 'Operacion completada exitosamente',
            });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: mapCheckbookErrorMessage(error?.msg || 'No fue posible completar la operacion'),
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
            const id = String($(this).data('id'));
            // Compara como string para soportar ids numericos o string sin fallar.
            const selected = rows.find(item => String(item.id) === id);
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
    }, [rows]);

    // Limpia foco al cerrar modales para evitar warning de aria-hidden en consola.
    useEffect(() => {
        const handleHidden = () => blurActiveElement();

        const updateModal = modalUpdateRef.current;
        const viewModal = modalViewRef.current;

        updateModal?.addEventListener('hidden.bs.modal', handleHidden);
        viewModal?.addEventListener('hidden.bs.modal', handleHidden);

        loadData();

        return () => {
            updateModal?.removeEventListener('hidden.bs.modal', handleHidden);
            viewModal?.removeEventListener('hidden.bs.modal', handleHidden);
        };
    }, []);

    //chequeador pro de datos
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
                banksAccount={banksAccount}
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
                banksAccount={banksAccount}
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
                banksAccount={banksAccount}
            />
        </>
    );
};

export default IndexCheckbooks;



