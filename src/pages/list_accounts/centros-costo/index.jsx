import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import CreateCentroCosto from './create';
import UpdatedCentroCosto from './updated';
import FilterCentroCosto from './filter';
import AlertPage from '../../../components/molecules/AlertPage';
import { useSelector } from 'react-redux';

const API_SEARCH = ['api', 'v1', 'cost-centers', 'search'];

const IndexCentrosCosto = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => { return p.code.includes('COST_CENTERS') }) || []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

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
    const modalConfirmDeleteRef = useRef(null);
    const modalConfirmDeleteInstance = useRef(null);
    const modalReasonDeleteRef = useRef(null);
    const modalReasonDeleteInstance = useRef(null);

    const [data, setData] = useState([]);
    const [centroCostoCreate, setCentroCostoCreate] = useState(false);
    const [centroCostoEdit, setCentroCostoEdit] = useState(false);
    const [centroCostoDelete, setCentroCostoDelete] = useState(false);
    const [centroCostoError, setCentroCostoError] = useState({
        message: null,
        show: false,
        type: 'danger',
    });

    const [search, setSearch] = useState({ value: '', checked: true });

    const [centroCosto, setCentroCosto] = useState({
        id: null,
        code: null,
        name: null,
        description: null,
        status: 'ACTIVE',
        companyId: 79,
    });

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletionReason, setDeletionReason] = useState('');

    const actions = [
        ...(userPermissions.some(p => p.code === 'VIEW_COST_CENTERS' && p.type === 'VIEW') || isAdmin ? [{ key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' }] : []),
        ...(userPermissions.some(p => p.code === 'UPDATE_COST_CENTERS' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_COST_CENTERS' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ];

    const [columns, setColumns] = useState([
        { title: 'ID', data: 'id' },
        { title: 'Código', data: 'code', name: 'code' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Descripción', data: 'description', name: 'description' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (status) => {
                if (status === 'ACTIVE') return '<span class="badge bg-label-success"><i class="ri-circle-fill me-1" style="font-size: 0.5rem;"></i>Activo</span>';
                if (status === 'INACTIVE') return '<span class="badge bg-label-danger"><i class="ri-circle-fill me-1" style="font-size: 0.5rem;"></i>Inactivo</span>';
                return status || '';
            },
        },
        {
            title: 'Acciones',
            data: 'id',
            orderable: false,
            render: (id, _, row) => {
                const code = row?.code ?? '';
                const name = row?.name ?? '';
                return `
                <div class="d-flex gap-1">
                    ${actions.map((a) => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}"
                            data-code="${code}"
                            data-name="${name}"
                            title="${a.title}">
                            <i class="ri ${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>
                `;
            },
        },
    ]);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
        setCentroCosto({
            id: null,
            code: null,
            name: null,
            description: null,
            status: 'ACTIVE',
            companyId: 79,
        });
    };

    const openConfirmDelete = (id, code, name) => {
        setDeleteTarget({ id, code, name });
        setDeletionReason('');
        if (!modalConfirmDeleteInstance.current) {
            modalConfirmDeleteInstance.current = new window.bootstrap.Modal(modalConfirmDeleteRef.current);
        }
        modalConfirmDeleteInstance.current.show();
    };

    const onConfirmDeleteContinue = () => {
        modalConfirmDeleteInstance.current?.hide();
        if (!modalReasonDeleteInstance.current) {
            modalReasonDeleteInstance.current = new window.bootstrap.Modal(modalReasonDeleteRef.current);
        }
        modalReasonDeleteInstance.current.show();
    };

    const onReasonDeleteSubmit = async () => {
        if (!deleteTarget) return;
        const url = base_url(['api', 'v1', 'cost-centers', deleteTarget.id], deletionReason ? { reason: deletionReason } : {});
        try {
            await fetchHelper.delete(url, {}, {}, 500, false);
            dataTableRef?.current?.ajax.reload();
            setCentroCostoDelete(true);
            setCentroCostoError({
                message: null,
                show: false
            });
            setDeleteTarget(null);
            setDeletionReason('');
        } catch (error) {
            console.error(error);
            setCentroCostoError({
                message: error.message || error.msg || 'Error al eliminar el centro de costo. Verifique su conexión e intente nuevamente.',
                show: true,
                type: 'danger',
            });
            setCentroCostoDelete(false);
            dataTableRef?.current?.ajax.reload();
        } finally{
            modalReasonDeleteInstance.current?.hide();
            setDeletionReason('');
        }
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
        ...(userPermissions.some(p => p.code === 'CREATE_COST_CENTERS' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Agregar</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: openModalCreate,
        }] : []),
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const code = $(this).data('code') ?? '';
            const name = $(this).data('name') ?? '';

            switch (action) {
                case 'view': {
                    const row = data.find((m) => m.id === id);
                    if (!row) return;
                    setCentroCosto({
                        id: row.id,
                        code: row.code ?? '',
                        name: row.name ?? '',
                        description: row.description ?? '',
                        status: row.status ?? '',
                        companyId: row.companyId ?? 79,
                    });
                    if (!modalViewInstance.current) {
                        modalViewInstance.current = new window.bootstrap.Modal(modalViewRef.current);
                    }
                    modalViewInstance.current.show();
                    break;
                }
                case 'edit': {
                    const row = data.find((m) => m.id === id);
                    if (!row) return;
                    setCentroCosto({
                        id: row.id,
                        code: row.code ?? '',
                        name: row.name ?? '',
                        description: row.description ?? '',
                        status: row.status ?? '',
                        companyId: row.companyId ?? 79,
                    });
                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                    }
                    modalUpdateInstance.current.show();
                    break;
                }
                case 'delete':
                    openConfirmDelete(id, code, name);
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
                <h5 className="card-header text-md-start text-center">Centro de costos</h5>
                <AlertPage type="success" message={"Centro de Costo creado exitosamente"} show={centroCostoCreate} onChange={() => setCentroCostoCreate(false)} />
                <AlertPage type="success" message="Centro de Costo actualizado exitosamente" show={centroCostoEdit} onChange={() => setCentroCostoEdit(false)} />
                <AlertPage type="success" message="Centro de Costo eliminado/inactivado exitosamente" show={centroCostoDelete} onChange={() => setCentroCostoDelete(false)} />
                <AlertPage type="danger" message={centroCostoError.message} show={centroCostoError.show} onChange={() => setCentroCostoError({
                    message: null,
                    show: false,
                    type: 'danger',
                })} />
                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={API_SEARCH}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Centros de Costo"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 20, 50, 100]}
                    />
                </div>
                <FilterCentroCosto filterRef={filterRef} filterInstance={filterInstance} dataTableRef={dataTableRef} />
            </div>

            <CreateCentroCosto
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                centroCosto={centroCosto}
                setCentroCosto={setCentroCosto}
                dataTableRef={dataTableRef}
                setCentroCostoCreate={setCentroCostoCreate}
            />

            <UpdatedCentroCosto
                modalRef={modalViewRef}
                modalInstance={modalViewInstance}
                centroCosto={centroCosto}
                setCentroCosto={setCentroCosto}
                dataTableRef={dataTableRef}
                setCentroCostoEdit={setCentroCostoEdit}
                allData={data}
                readOnly
            />

            <UpdatedCentroCosto
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                centroCosto={centroCosto}
                setCentroCosto={setCentroCosto}
                dataTableRef={dataTableRef}
                setCentroCostoEdit={setCentroCostoEdit}
                allData={data}
            />

            <div className="modal fade" ref={modalConfirmDeleteRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <span className="text-warning me-2"><i className="ri-error-warning-line fs-2"></i></span>
                            <h4 className="modal-title fw-bold">Eliminar centro de costo</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-body">
                                ¿Está seguro de que desea eliminar el Centro de costo {deleteTarget?.code ?? ''} - {deleteTarget?.name ?? ''}?
                            </p>
                        </div>
                        <div className="modal-footer justify-content-end">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={onConfirmDeleteContinue}>Continuar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal fade" ref={modalReasonDeleteRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <span className="text-warning me-2"><i className="ri-error-warning-line fs-2"></i></span>
                            <h4 className="modal-title fw-bold">Eliminar centro de costo</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-body text-muted mb-2">
                                Escriba el motivo de la eliminación del Centro de costo {deleteTarget?.code ?? ''} - {deleteTarget?.name ?? ''}.
                            </p>
                            <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Motivo de eliminación"
                                value={deletionReason}
                                onChange={(e) => setDeletionReason(e.target.value)}
                            />
                        </div>
                        <div className="modal-footer justify-content-end">
                            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={onReasonDeleteSubmit}>Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default IndexCentrosCosto;
