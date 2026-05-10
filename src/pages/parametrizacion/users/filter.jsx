import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterUser = ({ dataTableRef, filterRef, filterInstance, roles }) => {

    const table = dataTableRef?.current?.table();

    // QA Bloque PA Bug 15 (HU-PA-07 E3, 2026-05-09): agregar estado Bloqueado.
    // Backend acepta ACTIVE / INACTIVE / BLOCKED en el enum Status.
    const statusOptions = [
        { id: 'ACTIVE', name: 'Activo' },
        { id: 'INACTIVE', name: 'Inactivo' },
        { id: 'BLOCKED', name: 'Bloqueado' },
    ];

    return (
        <div className="modal fade" ref={filterRef} id="modalFilterUser" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Usuarios</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            <div className="col-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="role_filter"
                                    label="Rol"
                                    options={roles.map(r => ({
                                        id: r.name,
                                        name: r.name,
                                    }))}
                                    value={
                                        table?.column("roles:name")?.search() !== ''
                                            ? table?.column("roles:name")?.search().split(',')
                                            : []
                                    }
                                    onChange={(value) => {
                                        table?.column("roles:name")?.search(
                                            Array.isArray(value) ? value.join(',') : value
                                        );
                                    }}
                                    placeholder="Todos los roles"
                                    multiple={true}
                                />
                            </div>

                            <div className="col-12 mt-2">
                                <InputSelectModal
                                    id="status_filter"
                                    label="Estado"
                                    options={statusOptions}
                                    value={
                                        table?.column("status:name")?.search() !== ''
                                            ? table?.column("status:name")?.search().split(',')
                                            : []
                                    }
                                    onChange={(value) => {
                                        table?.column("status:name")?.search(
                                            Array.isArray(value) ? value.join(',') : value
                                        );
                                    }}
                                    placeholder="Todos los estados"
                                    multiple={false}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                dataTableRef?.current?.draw();
                                filterInstance?.current?.hide();
                            }}
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                                dataTableRef?.current?.table().columns().search('');
                                dataTableRef?.current?.table().search('');
                                dataTableRef?.current?.table().draw();
                            }}
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            data-bs-dismiss="modal"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterUser;