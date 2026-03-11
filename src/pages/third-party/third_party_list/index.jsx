import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import CreateThirdParty from './create';
import UpdatedThirdParty from './updated';
import FilterThirdParty from './filter';
import DropzoneModal from '../../../components/molecules/DropzoneModal';
import AlertPage from '../../../components/molecules/AlertPage';

const API_LIST    = ['api', 'v1', 'third-parties', 'search'];
const API_GET     = (id) => ['api', 'v1', 'third-parties', id];
const API_DELETE  = (id) => ['api', 'v1', 'third-parties', id];

const ROLE_LABELS = {
    CLIENT: 'Cliente',
    SUPPLIER: 'Proveedor',
    EMPLOYEE: 'Empleado',
    CREDITOR: 'Acreedor',
    DEBTOR: 'Deudor',
    OTHER: 'Otro',
};

const emptyThirdParty = {
    id: '',
    nit: '',
    dv: '',
    businessName: '',
    personType: '',
    roles: [],
    taxRegime: '',
    fiscalResponsibilities: '',
    retentions: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    department: '',
    country: '',
    creditLimit: '',
    paymentConditions: '',
    marketSegment: '',
    status: 'ACTIVE',
    blockReason: '',
};

const IndexThirdPartyList = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);
    const modalConfirmDeleteRef = useRef(null);
    const modalConfirmDeleteInstance = useRef(null);
    const modalBulkUploadRef = useRef(null);
    const modalBulkUploadInstance = useRef(null);

    const [data, setData] = useState([]);
    const [thirdPartyCreate, setThirdPartyCreate] = useState(false);
    const [thirdPartyEdit, setThirdPartyEdit] = useState(false);
    const [thirdPartyDelete, setThirdPartyDelete] = useState(false);
    const [thirdPartyError, setThirdPartyError] = useState(false);
    const [thirdPartyBulk, setThirdPartyBulk] = useState(false);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [thirdParty, setThirdParty] = useState(emptyThirdParty);

    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const columns = [
        { title: 'ID', data: 'id', searchable: false },
        {
            title: 'NIT/DV', data: 'nit', name: 'nit',
            render: (val, _, row) => val != null ? `${val}/${row?.dv ?? '-'}` : '-'
        },
        { title: 'Razón Social', data: 'businessName', name: 'businessName', render: (val) => val ?? '-' },
        {
            title: 'Rol', data: 'roles', name: 'roles',
            render: (roles) => {
                if (!roles || roles.length === 0) return '-';
                const arr = Array.isArray(roles) ? roles : [roles];
                return arr.map(r => ROLE_LABELS[r] ?? r).join(', ');
            }
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (status) => {
                if (status === 'ACTIVE') return '<span class="badge bg-label-success"><i class="ri-circle-fill me-1" style="font-size:0.5rem"></i>Activo</span>';
                if (status === 'INACTIVE') return '<span class="badge bg-label-danger"><i class="ri-circle-fill me-1" style="font-size:0.5rem"></i>Inactivo</span>';
                if (status === 'BLOCKED') return '<span class="badge bg-label-warning"><i class="ri-circle-fill me-1" style="font-size:0.5rem"></i>Bloqueado</span>';
                return status ?? '-';
            }
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    ${actions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}"
                            title="${a.title}">
                            <i class="${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
            `
        },
    ];

    const openModalCreate = () => {
        setThirdParty(emptyThirdParty);
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const openConfirmDelete = (id, nit, businessName) => {
        setDeleteTarget({ id, nit, businessName });
        if (!modalConfirmDeleteInstance.current) {
            modalConfirmDeleteInstance.current = new window.bootstrap.Modal(modalConfirmDeleteRef.current);
        }
        modalConfirmDeleteInstance.current.show();
    };

    const onConfirmDelete = async () => {
        if (!deleteTarget) return;
        const url = base_url(API_DELETE(deleteTarget.id));
        try {
            await fetchHelper.delete(url, {}, {}, 500, false);
            modalConfirmDeleteInstance.current?.hide();
            dataTableRef?.current?.ajax.reload();
            setThirdPartyDelete(true);
            setThirdPartyError(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error(error);
            modalConfirmDeleteInstance.current?.hide();
            setThirdPartyError(true);
            setThirdPartyDelete(false);
        }
    };

    const openModalBulkUpload = () => {
        if (!modalBulkUploadInstance.current) {
            modalBulkUploadInstance.current = new window.bootstrap.Modal(modalBulkUploadRef.current);
        }
        modalBulkUploadInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            },
        },
        {
            text: '<i class="ri-upload-cloud-2-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Carga Masiva</span>',
            className: 'btn rounded-pill btn-outline-primary waves-effect mx-2 my-2',
            action: openModalBulkUpload,
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Agregar Tercero</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: openModalCreate,
        },
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = async function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const row = data.find(m => m.id === id);
            if (!row) return;

            switch (action) {
                case 'view':
                case 'edit': {
                    // Carga la ficha completa del tercero desde el backend (GET /api/v1/third-parties/{id})
                    try {
                        const url = base_url(API_GET(id));
                        const response = await fetchHelper.get(url, {}, 0);
                        const detail = response?.data ?? response ?? {};
                        setThirdParty({
                            id:                    detail.id                    ?? '',
                            nit:                   detail.nit                   ?? '',
                            dv:                    detail.dv                    ?? '',
                            businessName:          detail.businessName          ?? '',
                            personType:            detail.personType            ?? '',
                            roles:                 detail.roles                 ?? [],
                            taxRegime:             detail.taxRegime             ?? '',
                            fiscalResponsibilities:detail.fiscalResponsibilities?? '',
                            retentions:            detail.withholdingInfo       ?? '',
                            address:               detail.address               ?? '',
                            phone:                 detail.phone                 ?? '',
                            email:                 detail.email                 ?? '',
                            city:                  detail.city                  ?? '',
                            department:            detail.department            ?? '',
                            country:               detail.country               ?? '',
                            creditLimit:           detail.creditLimit           ?? '',
                            paymentConditions:     detail.paymentTerms          ?? '',
                            marketSegment:         detail.marketSegment         ?? '',
                            status:                detail.status                ?? 'ACTIVE',
                            blockReason:           detail.blockReason           ?? '',
                        });
                    } catch (err) {
                        console.error('Error al cargar detalle del tercero:', err);
                        // Fallback: usar los datos del DataTable si el GET falla
                        setThirdParty({
                            id:                    row.id                    ?? '',
                            nit:                   row.nit                   ?? '',
                            dv:                    row.dv                    ?? '',
                            businessName:          row.businessName          ?? '',
                            personType:            row.personType            ?? '',
                            roles:                 row.roles                 ?? [],
                            taxRegime:             row.taxRegime             ?? '',
                            fiscalResponsibilities:row.fiscalResponsibilities?? '',
                            retentions:            row.withholdingInfo       ?? '',
                            address:               row.address               ?? '',
                            phone:                 row.phone                 ?? '',
                            email:                 row.email                 ?? '',
                            city:                  row.city                  ?? '',
                            department:            row.department            ?? '',
                            country:               row.country               ?? '',
                            creditLimit:           row.creditLimit           ?? '',
                            paymentConditions:     row.paymentTerms          ?? '',
                            marketSegment:         row.marketSegment         ?? '',
                            status:                row.status                ?? 'ACTIVE',
                            blockReason:           row.blockReason           ?? '',
                        });
                    }
                    openModalUpdate();
                    break;
                }

                case 'delete':
                    openConfirmDelete(row.id, row.nit, row.businessName);
                    break;

                default:
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Lista de Terceros</h5>

                <AlertPage type="success" message="Tercero registrado exitosamente." show={thirdPartyCreate} onChange={() => setThirdPartyCreate(false)} />
                <AlertPage type="success" message="Tercero actualizado exitosamente." show={thirdPartyEdit} onChange={() => setThirdPartyEdit(false)} />
                <AlertPage type="success" message="Tercero eliminado exitosamente." show={thirdPartyDelete} onChange={() => setThirdPartyDelete(false)} />
                <AlertPage type="danger" message="Error al eliminar el tercero. Verifique su conexión e intente nuevamente." show={thirdPartyError} onChange={() => setThirdPartyError(false)} />
                <AlertPage type="success" message="Carga masiva completada exitosamente." show={thirdPartyBulk} onChange={() => setThirdPartyBulk(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={API_LIST}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Lista de Terceros"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 20, 50, 100]}
                    />
                </div>

                <FilterThirdParty
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                />
            </div>

            <CreateThirdParty
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                thirdParty={thirdParty}
                setThirdParty={setThirdParty}
                dataTableRef={dataTableRef}
                setThirdPartyCreate={setThirdPartyCreate}
            />

            <UpdatedThirdParty
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                thirdParty={thirdParty}
                setThirdParty={setThirdParty}
                dataTableRef={dataTableRef}
                setThirdPartyEdit={setThirdPartyEdit}
            />

            <DropzoneModal
                modalRef={modalBulkUploadRef}
                title="Carga Masiva de Terceros"
                uploadUrl={base_url(['api', 'v1', 'third-parties', 'bulk', 'store'])}
                onSuccess={() => {
                    setThirdPartyBulk(true);
                    dataTableRef?.current?.ajax?.reload?.();
                }}
            />

            {/* Modal: Confirmación de eliminación */}
            <div className="modal fade" ref={modalConfirmDeleteRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <span className="text-warning me-2"><i className="ri-error-warning-line fs-2"></i></span>
                            <h4 className="modal-title fw-bold">Eliminar Tercero</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-body">
                                ¿Está seguro de que desea eliminar el tercero{' '}
                                <strong>{deleteTarget?.businessName ?? ''}</strong> con NIT{' '}
                                <strong>{deleteTarget?.nit ?? ''}</strong>? Esta acción es irreversible.
                            </p>
                        </div>
                        <div className="modal-footer justify-content-end">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={onConfirmDelete}>Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default IndexThirdPartyList;
