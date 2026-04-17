//menus/filter.jsx
import { useState, useRef, useEffect } from "react";

import DataTableReference from "../../../components/organism/DataTable";
import CreateMenu from "./create";
import UpdatedMenu from "./updated";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import { useSelector, useDispatch } from "react-redux";
import { COMPONENT_MAP } from "../../../utils/map_menu";
import AlertPage from "../../../components/molecules/AlertPage";
import FilterMenu from "./filter";
import { refreshMenu } from "../../../routes/routes";

const IndexMenus = () => {

  const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => { return p.code.includes('MENUS') }) || []; // Permisos del usuario
  const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

  const dispatch = useDispatch();
  const [data, setData] = useState([]);
  const tableRefMenu = useRef(null);
  const dataTableRefMenu = useRef(null);
  const filterRef = useRef(null);
  const filterInstance = useRef(null);

  const user = useSelector((state) => state.user).user;
  const [modules, setModules] = useState([]);
  const [parents, setParents] = useState([]);

  const [components, setComponents] = useState([]);

  const [search, setSearch] = useState({
    value: "",
    checked: true,
  });

  const loadData = async () => {
    const urlModules = base_url(["api", "modules"]);
    const { data: dataModules } = await fetchHelper.post(
      urlModules,
      { length: -1 },
      {},
      0,
    );
    setModules(
      dataModules.map((module) => ({
        id: module.id,
        name: module.name,
      })),
    );

    const urlParents = base_url(["api", "menus", "datatable"]);
    const body = {
      length: -1,
    };
    const { data: dataParents } = await fetchHelper.post(
      urlParents,
      body,
      {},
      0,
    );
    setParents(
      dataParents.map((parent) => ({
        id: parent.id,
        name: parent.label,
        moduleId: parent?.module?.id ?? null,
        component: parent?.component ?? null,
      })),
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const existingIds = parents.map((parent) => parent?.component ?? null);

    const filtered = COMPONENT_MAP.map((component) => ({
      id: component.id,
      name: component.name,
    })).filter((component) => component.id !== 'HOME').filter((component) => !existingIds.includes(component.id));

    setComponents(filtered);
  }, [parents]);

  const [menu, setMenu] = useState({
    id: "",
    label: "",
    icon: "",
    path: "",
    menuOrder: "",
    parentId: null,
    moduleId: null,
    status: "ACTIVE",
    component: "",
  });

  const [clickEdit, setClickEdit] = useState(false);

  const [menuCreate, setMenuCreate] = useState(false);
  const [menuUpdate, setMenuUpdate] = useState(false);
  const [menuDelete, setMenuDelete] = useState(false);
  const [menuError, setMenuError] = useState(false);

  const modalCreateRef = useRef(null);
  const modalCreateInstance = useRef(null);

  const modalUpdateRef = useRef(null);
  const modalUpdateInstance = useRef(null);

  const url = ["api", "menus", "datatable"];

  const buttons = [
    {
      text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
      className: "btn rounded-pill btn-secondary waves-effect mx-2 my-2 ",
      action: async function (e, dt, button, config) {
        if (!filterInstance.current) {
          filterInstance.current = new window.bootstrap.Modal(
            filterRef.current,
          );
        }
        // setSearch({ value: '', checked: true });
        filterInstance.current.show();
      },
    },

    ...(userPermissions.some(p => p.code === 'CREATE_MENUS' && p.type === 'CREATE') || isAdmin
      ? [{
        text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Menu</span>',
        className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
        action: async function (e, dt, button, config) {
          openModalCreate();
        },
      }] : []),
  ];

  const actions = [
    ...(userPermissions.some(p => p.code === 'UPDATE_MENUS' && p.type === 'UPDATE') || isAdmin ? [{
      key: "edit",
      icon: "ri-edit-line",
      class: "btn-label-primary",
      title: "Editar",
      }] : []),
    ...(userPermissions.some(p => p.code === 'DELETE_MENUS' && p.type === 'DELETE') || isAdmin ? [{
      key: "delete",
      icon: "ri-delete-bin-5-line",
        class: "btn-label-danger",
        title: "Eliminar",
      }] : []),
  ];

  const columns = [
    { title: "Label", data: "label", name: "label" },
    { title: "URL", data: "path", name: "path" },
    {
      title: "Icono",
      data: "icon",
      render: (icon) => {
        return `<i class="${icon}"></i>`;
      },
    },
    { title: "Posición", data: "menuOrder", name: "menuOrder" },
    { title: "Estado", data: "status", name: "status" },
    {
      title: "Módulo",
      data: "module.name",
      name: "module",
      render: (module) => {
        return module ?? "-";
      },
    },
    {
      title: "Padre",
      data: "parent.label",
      name: "parent",
      render: (parent) => {
        return parent ?? "-";
      },
    },
    {
      title: "Componente",
      data: "component",
      name: "component",
      render: (component) => {
        return component ?? "-";
      },
    },
    {
      title: "Acciones",
      data: "id",
      render: (id) => {
        return `
                <div class="d-flex gap-1">
                    ${actions
                      .map(
                        (a) => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}">
                            <i class="fas ${a.icon}"></i>
                        </button>
                    `,
                      )
                      .join("")}
                </div>
            `;
      },
      searchable: false,
    },
  ];

  const openModalCreate = () => {
    if (!modalCreateInstance.current) {
      modalCreateInstance.current = new window.bootstrap.Modal(
        modalCreateRef.current,
      );
    }
    setMenu({
      id: "",
      label: "",
      icon: "",
      path: "",
      menuOrder: "",
      parentId: null,
      moduleId: null,
      status: "ACTIVE",
      component: "",
      visible: true,
    });
    modalCreateInstance.current.show();
  };

  const openModalUpdate = () => {
    if (!modalUpdateInstance.current) {
      modalUpdateInstance.current = new window.bootstrap.Modal(
        modalUpdateRef.current,
      );
    }
    modalUpdateInstance.current.show();
  };

  const openFilter = () => {
    if (!filterInstance.current) {
      filterInstance.current = new window.bootstrap.Modal(filterRef.current);
    }
    filterInstance.current.show();
  };

  useEffect(() => {
    const usedComponentIds = new Set(
      parents
        .filter((parent) => parent.id !== menu.id) // excluir el propio menu si estás editando
        .map((parent) => parent.component),
    );

    const filtered = COMPONENT_MAP.map((component) => ({
      id: component.id,
      name: component.name,
    }))
    .filter((component) => component.id !== 'HOME')
    .filter(
      (component) =>
        !usedComponentIds.has(component.id) || component.id === menu.component, // permitir el actual
    );

    setComponents(filtered);
  }, [menu]);

  // useEffect(() => {
  //     dispatch(refreshMenu());
  // }, [menuCreate, menuUpdate, menuDelete, dispatch]);

  useEffect(() => {
    const table = dataTableRefMenu?.current;
    if (!table) return;
    loadData();

    const handler = function () {
      const action = $(this).data("action");
      const id = Number($(this).data("id"));

      switch (action) {
        case "edit":
          const menuRef = data.find((m) => m.id === id);

          if (!menuRef) {
            console.warn("Menú no encontrado", id);
            return;
          }

          console.log(menuRef);

          setMenu({
            id: menuRef.id || "",
            label: menuRef.label || "",
            icon: menuRef.icon || "",
            path: menuRef.path || "",
            menuOrder: menuRef.menuOrder || "",
            parentId: menuRef.parent ? String(menuRef.parent.id) : null,
            moduleId: menuRef.module ? String(menuRef.module.id) : null,
            status: menuRef.status || "",
            component: menuRef.component || "",
            visible: menuRef.visible ?? true,
          });

          setClickEdit(true);
          break;
        case "delete":
          window.Swal.fire({
            title: "¿Estás seguro?",
            text: "¿Estás seguro de querer eliminar este menú?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
          }).then(async (result) => {
            if (result.isConfirmed) {
              const url = base_url(["api", "menus", id]);
              try {
                await fetchHelper.delete(url, {}, {}, 500, false);
                dataTableRefMenu?.current?.ajax.reload();
                dispatch(refreshMenu());
                setMenuDelete(true);
                setMenuError(false);
              } catch (error) {
                console.error(error);
                setMenuError(true);
                setMenuDelete(false);
                dataTableRefMenu?.current?.ajax.reload();
              }
            }
          });
          break;
        default:
          console.warn("Acción no válida", action);
          break;
      }
    };
    table.on("click", ".action-btn", handler);

    return () => {
      table.off("click", ".action-btn", handler);
    };
  }, [data]);

  useEffect(() => {
    if (!clickEdit) return;
    openModalUpdate();
    setClickEdit(false);
  }, [clickEdit]);

  return (
    <>
      <div className="card">
        <h5 className="card-header text-md-start text-center">Menus</h5>

        <AlertPage
          type="success"
          message="Menú eliminado correctamente"
          show={menuDelete}
          onChange={() => setMenuDelete(false)}
        />
        <AlertPage
          type="success"
          message="Menú editado correctamente"
          show={menuUpdate}
          onChange={() => setMenuUpdate(false)}
        />
        <AlertPage
          type="success"
          message="Menú creado correctamente"
          show={menuCreate}
          onChange={() => setMenuCreate(false)}
        />
        <AlertPage
          type="danger"
          message="Error al eliminar el menú. Verifique su conexión e intente nuevamente."
          show={menuError}
          onChange={() => setMenuError(false)}
        />

        <div className="card-datatable text-nowrap">
          <DataTableReference
            url_api={url}
            columns={columns}
            tableRef={tableRefMenu}
            dataTableRef={dataTableRefMenu}
            method="POST"
            buttons={buttons}
            title="Menus"
            setData={setData}
            search={search}
            setSearch={setSearch}
            filtered={true}
          />
        </div>

        <FilterMenu
          filterRef={filterRef}
          filterInstance={filterInstance}
          dataTableRef={dataTableRefMenu}
          modules={modules}
          parents={parents}
          components={COMPONENT_MAP.map((component) => ({
            id: component.id,
            name: component.name,
          }))}
        />

        <CreateMenu
          modalRef={modalCreateRef}
          modalInstance={modalCreateInstance}
          menu={menu}
          setMenu={setMenu}
          dataTableRef={dataTableRefMenu}
          setMenuCreate={setMenuCreate}
          modules={modules}
          parents={parents}
          components={components}
        />

        <UpdatedMenu
          modalRef={modalUpdateRef}
          modalInstance={modalUpdateInstance}
          menu={menu}
          setMenu={setMenu}
          dataTableRef={dataTableRefMenu}
          setMenuUpdate={setMenuUpdate}
          modules={modules}
          parents={parents}
          components={components}
        />
      </div>
    </>
  );
};

export default IndexMenus;
