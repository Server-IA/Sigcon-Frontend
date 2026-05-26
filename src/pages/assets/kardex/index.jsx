import { useEffect, useRef, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import DataTableReference from '../../../components/organism/DataTable';
import { formatPrice } from '../../../utils/functions';
import BajasTransferencias from '../bajas_transferencias';
// QA (2026-05-26): traducir el estado del movimiento a espanol (badge) en lugar
// de mostrar el valor crudo del enum/BD en la columna.
import { statusBadge } from '../../../utils/statusLabels';

const MOVEMENT_STATUS_LABELS = {
  EN_PROCESO: 'En proceso',
  FINALIZADO: 'Finalizado',
  RECHAZADO: 'Rechazado',
};

const MOCK_MOVEMENTS = [
  {
    id: 1,
    fecha: '2026-03-01',
    tipoOperacion: 'Alta',
    estado: 'FINALIZADO',
    detalle: 'Ingreso inicial',
    responsable: 'Maria Perez',
  },
  {
    id: 2,
    fecha: '2026-03-12',
    tipoOperacion: 'Traslado',
    estado: 'EN_PROCESO',
    detalle: 'Traslado interno',
    responsable: 'Juan Diaz',
  },
  {
    id: 3,
    fecha: '2026-03-18',
    tipoOperacion: 'Baja',
    estado: 'RECHAZADO',
    detalle: 'Documento soporte incompleto',
    responsable: 'Laura Vega',
  },
];

const KardexAssets = () => {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const [data, setData] = useState([
    {
      id: 1,
      assetCode: 'ACT-1001',
      name: 'Computador de mesa',
      classification: 'NON_CURRENT',
      acquisitionValue: 1200000,
      status: 'ACTIVE',
    },
  ]);
  const [showOperationForm, setShowOperationForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [search, setSearch] = useState({ value: '', checked: true });

  const columns = [
    { title: 'Codigo', data: 'assetCode', name: 'assetCode' },
    { title: 'Nombre', data: 'name', name: 'name' },
    {
      title: 'Clasificacion',
      data: 'classification',
      name: 'classification',
      render: (value) => {
        const map = {
          NON_CURRENT: 'Activo no corriente',
          CURRENT: 'Activo corriente',
        };
        return map[value] || value || '-';
      },
    },
    {
      title: 'Costo adquisicion',
      data: 'acquisitionValue',
      name: 'acquisitionValue',
      render: (value) => formatPrice(value),
    },
    {
      title: 'Estado',
      data: 'status',
      name: 'status',
      render: (value) => statusBadge(value),
    },
    {
      title: 'Acciones',
      data: 'id',
      searchable: false,
      render: (id) => `
        <button class="btn btn-sm btn-label-primary action-btn" data-action="operate" data-id="${id}">
          <i class="ri-arrow-left-right-line"></i>
        </button>`,
    },
  ];

  const handleCloseForm = () => {
    setShowOperationForm(false);
    setAlert({ show: false, type: '', message: '' });
  };

  useEffect(() => {
    const table = dataTableRef?.current;
    if (!table) return;

    const handler = function () {
      const action = $(this).data('action');
      const id = Number($(this).data('id'));

      if (action !== 'operate') return;

      const asset = data.find((item) => Number(item.id) === id);

      if (!asset) {
        setAlert({
          show: true,
          type: 'warning',
          message: 'No se encontro el activo seleccionado.',
        });
        return;
      }

      setSelectedAsset(asset);
      setShowOperationForm(true);
      setAlert({ show: false, type: '', message: '' });
    };

    table.on('click', '.action-btn', handler);

    return () => {
      table.off('click', '.action-btn', handler);
    };
  }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assetFromQuery = params.get('asset') || params.get('assetId') || '';

    if (!assetFromQuery) return;

    setSelectedAsset({ assetCode: assetFromQuery });
    setShowOperationForm(true);
  }, []);

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <h5 className="card-title fw-bold mb-0" style={{ fontSize: '1.35rem' }}>
            Kardex
          </h5>
        </div>

        <AlertPage
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onChange={() => setAlert({ show: false, type: '', message: '' })}
        />

        {showOperationForm && selectedAsset && (
          <div className="mb-4">
            <BajasTransferencias
              key={selectedAsset.assetCode || selectedAsset.id}
              initialAssetId={selectedAsset.assetCode || ''}
              onClose={handleCloseForm}
            />
          </div>
        )}

        <div className="card border mb-4">
          <div className="card-header">
            <h6 className="mb-0 fw-bold">Activos</h6>
          </div>
          <div className="card-body p-0">
            <div className="card-datatable text-nowrap">
              <DataTableReference
                url_api={["api", "v1", "assets", "search"]}
                columns={columns}
                tableRef={tableRef}
                dataTableRef={dataTableRef}
                method="POST"
                buttons={[]}
                title="Kardex"
                setData={setData}
                search={search}
                setSearch={setSearch}
                filtered={true}
                data={data}
              />
            </div>
          </div>
        </div>

        {selectedAsset && (
          <div className="card border">
            <div className="card-header">
              <h6 className="mb-0 fw-bold">Movimientos recientes</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo de operacion</th>
                      <th>Estado</th>
                      <th>Detalle</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_MOVEMENTS.map((movement) => (
                      <tr key={movement.id}>
                        <td>{movement.fecha}</td>
                        <td>{movement.tipoOperacion}</td>
                        <td>{MOVEMENT_STATUS_LABELS[movement.estado] || movement.estado}</td>
                        <td>{movement.detalle}</td>
                        <td>{movement.responsable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KardexAssets;
