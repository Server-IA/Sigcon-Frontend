import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterPermission = ({ dataTableRef, filterRef, filterInstance, modules, types }) => {

    const table = dataTableRef?.current?.table();

    return (
        <div className="modal fade" ref={filterRef} id="modalFilterPermission" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Filtrar Permisos</h4>
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
                                    id="module_filter"
                                    label="Módulo"
                                    options={modules.map(m => ({
                                        id: m.name,
                                        name: m.name,
                                    }))}
                                    value={
                                        table?.column("module.name:name")?.search() !== ''
                                            ? table?.column("module.name:name")?.search().split(',')
                                            : []
                                    }
                                    onChange={(value) => {
                                        table?.column("module.name:name")?.search(
                                            Array.isArray(value) ? value.join(',') : value
                                        );
                                    }}
                                    placeholder="Todos los módulos"
                                    multiple={true}
                                />
                            </div>

                            <div className="col-12 mt-2">
                                <InputSelectModal
                                    id="type_filter"
                                    label="Tipo de Permiso"
                                    options={types}
                                    value={
                                        table?.column("type:name")?.search() !== ''
                                            ? table?.column("type:name")?.search().split(',')
                                            : []
                                    }
                                    onChange={(value) => {
                                        table?.column("type:name")?.search(
                                            Array.isArray(value) ? value.join(',') : value
                                        );
                                    }}
                                    placeholder="Todos los tipos"
                                    multiple={true}
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
                                filterInstance?.current?.hide();
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

export default FilterPermission;