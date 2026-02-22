import { useEffect } from "react";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const FilterDepreciationRules = ({ dataTableRef, filterRef, filterInstance, menus, roles }) => {

    const table = dataTableRef?.current?.table();

    useEffect(() => {
        console.log(table?.columns(), 'table');
    }, [dataTableRef]);

    return (
        <>
            <div className="modal fade" ref={filterRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="modalCenterTitle">Filtrar Permisos para menús</h4>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-12 mb-6 mt-2">
                                    <InputSelectModal
                                        id="menu_filter"
                                        label="Menús"
                                        options={menus.map(menu => ({
                                            id: menu.name,
                                            name: menu.name,
                                        }))}
                                        multiple={true}
                                        value={table?.column("menu_label:name")?.search() !== '' ? table?.column("menu_label:name")?.search().split(',') : []}
                                        onChange={(value) => {
                                            table?.column("menu_label:name")?.search(value);
                                        }}
                                    />
                                </div>

                                <div className="col-12 mt-2">
                                    <InputSelectModal
                                        id="role_filter"
                                        label="Roles"
                                        options={roles.map(role => ({
                                            id: role.name,
                                            name: role.name,
                                        }))}
                                        multiple={true}
                                        value={table?.column("role_name:name")?.search() !== '' ? table?.column("role_name:name")?.search().split(',') : []}
                                        onChange={(value) => {
                                            table?.column("role_name:name")?.search(value);
                                        }}
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
        </>
    );
}

export default FilterDepreciationRules;