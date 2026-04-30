import { useEffect, useMemo, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import FormField from '../../../components/molecules/FormField';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const TAX_RULES = [
  { id: 'NO_APLICA', name: 'No aplica' },
  { id: 'RET_1', name: 'Retencion 1%' },
  { id: 'RET_2', name: 'Retencion 2%' },
];

const OPERATION_TYPES = [
  { id: 'BAJA', name: 'Baja' },
  { id: 'TRANSFERENCIA', name: 'Transferencia' },
];

const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;

const formatCOP = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const toNumber = (value) => {
  if (value === '' || value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const DEFAULT_ASSET_INFO = {
  assetCode: '',
  description: '-',
  costoHistorico: 0,
  depreciacionAcumulada: 0,
};

// HU-ACT-03: lookup real contra el backend. Se deja la constante como fallback
// vacia para evitar romper referencias existentes.
const MOCK_ASSETS = {};

const initialFormState = {
  tipoOperacion: '',
  assetId: '',
  motivo: '',
  fechaOperacion: '',
  montoEnajenacion: '',
  valorResidual: '',
  cuentaDestino: '',
  solicitante: '',
  aprobador: '',
  entidadReceptora: '',
  ubicacionDestino: '',
  documentoTransferencia: '',
  referenciaBancoCaja: '',
  impuestosRetenciones: '',
};

const initialValidations = {
  activoRegistrado: true,
  periodoContableAbierto: true,
  sinSaldosCxP: true,
  sinSaldosCxC: true,
  activoNoBloqueado: true,
  permisoUsuario: true,
};

const BajasTransferencias = ({ initialAssetId = '', onClose = null }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [assetInfo, setAssetInfo] = useState(DEFAULT_ASSET_INFO);
  const [validations] = useState(initialValidations);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [transactionId, setTransactionId] = useState('');
  const [bankMovements, setBankMovements] = useState([]);
  const [assetsList, setAssetsList] = useState([]);

  // QA-BLOQUE-AQ (2026-04-30): cargar movimientos bancarios via POST search
  // (el GET requiere bankAccountId obligatorio y tiraba 400 silenciosamente,
  // dejando el dropdown vacio). Tambien cargar listado de activos para el
  // dropdown del campo "ID Activo" (antes era input texto libre).
  useEffect(() => {
      fetchHelper.post(base_url(['api', 'v1', 'financial-movements']),
              { draw: 1, start: 0, length: -1, columns: [], order: [], search: { value: '', regex: false } },
              {}, 0, false)
          .then(resp => {
              const list = Array.isArray(resp) ? resp : (resp?.data ?? []);
              if (Array.isArray(list)) {
                  setBankMovements(list.map(m => ({
                      id: m.id,
                      name: `#${m.id} - ${m.movementDate || ''} ${m.description || m.externalReference || ''} ($${m.amount || 0})`.trim(),
                  })));
              }
          })
          .catch(() => {});

      fetchHelper.post(base_url(['api', 'v1', 'assets', 'search']),
              { draw: 1, start: 0, length: -1, columns: [], order: [], search: { value: '', regex: false } },
              {}, 0, false)
          .then(resp => {
              const list = Array.isArray(resp?.data) ? resp.data : [];
              setAssetsList(list.map(a => ({
                  id: a.assetCode || String(a.id),
                  name: `${a.assetCode || a.id} - ${a.assetName || a.name || ''}`.trim(),
              })));
          })
          .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialAssetId) return;

    setFormData((prev) => ({
      ...prev,
      assetId: initialAssetId,
      tipoOperacion: 'BAJA',
    }));
  }, [initialAssetId]);

  const isTransfer = formData.tipoOperacion === 'TRANSFERENCIA';

  const valorResidual = toNumber(formData.valorResidual);
  const montoEnajenacion = toNumber(formData.montoEnajenacion);
  const costoHistorico = toNumber(assetInfo.costoHistorico);
  const depreciacionAcumulada = toNumber(assetInfo.depreciacionAcumulada);

  const valorEnLibros = useMemo(() => {
    return costoHistorico - depreciacionAcumulada - valorResidual;
  }, [costoHistorico, depreciacionAcumulada, valorResidual]);

  const gananciaPerdida = useMemo(() => {
    return montoEnajenacion - valorEnLibros;
  }, [montoEnajenacion, valorEnLibros]);

  const handleFieldChange = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors[field];
        return nextErrors;
      });
    }
  };

  const handleAssetLookup = async () => {
    const lookupKey = formData.assetId.trim();

    if (!lookupKey) {
      setAlert({
        show: true,
        type: 'warning',
        message: 'Ingrese un ID de activo para consultar.',
      });
      return;
    }

    // HU-ACT-03: el form pide el ID numerico del activo. Aceptamos tanto
    // el id entero (preferido) como un assetCode; si parece codigo, se
    // busca via /search filtrando por assetCode.
    try {
      const isNumeric = /^\d+$/.test(lookupKey);
      let asset = null;

      if (isNumeric) {
        const resp = await fetchHelper.get(
          base_url(['api', 'v1', 'assets', lookupKey]),
          {},
          0
        );
        asset = resp?.data ?? resp;
      } else {
        const resp = await fetchHelper.post(
          base_url(['api', 'v1', 'assets', 'search']),
          {
            draw: 1, start: 0, length: 1,
            columns: [{ data: 'assetCode', name: 'assetCode',
                        searchable: true,
                        search: { value: lookupKey, regex: false } }],
          }, {}, 0
        );
        asset = (resp?.data || [])[0] || null;
      }

      if (!asset || !asset.id) {
        setAssetInfo({ ...DEFAULT_ASSET_INFO, assetCode: lookupKey });
        setAlert({
          show: true,
          type: 'danger',
          message: 'Activo no registrado o no encontrado.',
        });
        return;
      }

      const costo = Number(asset.acquisitionValue) || 0;
      const bookValue = Number(asset.currentBookValue ?? asset.acquisitionValue) || 0;
      const depAcum = Math.max(costo - bookValue, 0);

      setAssetInfo({
        assetCode: asset.assetCode || `ID ${asset.id}`,
        description: `${asset.name || asset.assetName || '-'} - Estado: ${asset.status || '-'}`,
        costoHistorico: costo,
        depreciacionAcumulada: depAcum,
      });
      // Mantener el ID numerico en el form para el payload del POST /disposals
      setFormData(prev => ({ ...prev, assetId: String(asset.id) }));
      setAlert({
        show: true,
        type: 'success',
        message: `Activo ${asset.assetCode || asset.id} cargado correctamente.`,
      });
    } catch (err) {
      console.error(err);
      setAssetInfo({ ...DEFAULT_ASSET_INFO, assetCode: lookupKey });
      setAlert({
        show: true,
        type: 'danger',
        message: err?.msg || err?.message || 'Activo no registrado o no encontrado.',
      });
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.tipoOperacion) nextErrors.tipoOperacion = 'Seleccione el tipo de operacion.';
    if (!formData.assetId) nextErrors.assetId = 'El Asset ID es obligatorio.';
    if (!formData.motivo) nextErrors.motivo = 'Ingrese el motivo de la operacion.';
    if (!formData.fechaOperacion) {
      nextErrors.fechaOperacion = 'Ingrese la fecha de operacion.';
    } else if (!REGEX_DATE.test(formData.fechaOperacion)) {
      nextErrors.fechaOperacion = 'Formato invalido. Use AAAA-MM-DD.';
    }

    if (formData.montoEnajenacion === '' || toNumber(formData.montoEnajenacion) < 0) {
      nextErrors.montoEnajenacion = 'El monto debe ser mayor o igual a 0.';
    }

    if (formData.valorResidual === '' || toNumber(formData.valorResidual) < 0) {
      nextErrors.valorResidual = 'El valor residual debe ser mayor o igual a 0.';
    }

    if (!formData.cuentaDestino) nextErrors.cuentaDestino = 'Ingrese la cuenta destino.';
    if (!formData.referenciaBancoCaja) nextErrors.referenciaBancoCaja = 'Ingrese la referencia BNK/CAJ.';
    if (!formData.solicitante) nextErrors.solicitante = 'Ingrese el usuario solicitante.';

    if (isTransfer) {
      if (!formData.entidadReceptora) nextErrors.entidadReceptora = 'Ingrese la entidad receptora.';
      if (!formData.ubicacionDestino) nextErrors.ubicacionDestino = 'Ingrese la ubicacion destino.';
      if (!formData.documentoTransferencia) nextErrors.documentoTransferencia = 'Ingrese el documento de transferencia.';
    }

    if (formData.impuestosRetenciones === '') {
      nextErrors.impuestosRetenciones = 'Seleccione impuestos o retenciones.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const checkBusinessRules = () => {
    if (!validations.activoRegistrado) {
      return 'Activo no puede ser dado de baja.';
    }
    if (!validations.periodoContableAbierto) {
      return 'Periodo contable cerrado. No se permite procesar la operacion.';
    }
    if (!validations.sinSaldosCxP || !validations.sinSaldosCxC) {
      return 'Existen saldos pendientes asociados.';
    }
    if (!validations.activoNoBloqueado) {
      return 'Activo no puede ser dado de baja por estado bloqueado.';
    }
    if (!validations.permisoUsuario) {
      return 'Acceso no autorizado para procesar baja/transferencia.';
    }
    return '';
  };

  const handleValidate = () => {
    setAlert({ show: false, type: '', message: '' });
    setTransactionId('');

    if (!validateForm()) {
      setAlert({
        show: true,
        type: 'danger',
        message: 'Informacion incompleta o erronea. Revise los campos marcados.',
      });
      return;
    }

    const ruleMessage = checkBusinessRules();
    if (ruleMessage) {
      setAlert({ show: true, type: 'danger', message: ruleMessage });
      return;
    }

    setAlert({
      show: true,
      type: 'success',
      message: 'Validacion completada. Puede registrar la operacion.',
    });
  };

  const handleRegister = async () => {
    setAlert({ show: false, type: '', message: '' });

    if (!validateForm()) {
      setAlert({
        show: true,
        type: 'danger',
        message: 'Informacion incompleta o erronea. Revise los campos marcados.',
      });
      return;
    }

    const ruleMessage = checkBusinessRules();
    if (ruleMessage) {
      setAlert({ show: true, type: 'danger', message: ruleMessage });
      return;
    }

    // ACT-03: enviar al backend POST /api/v1/assets/disposals
    const payload = {
      assetId: Number(formData.assetId),
      disposalType: formData.tipoOperacion === 'BAJA' ? 'BAJA' : 'TRANSFERENCIA',
      disposalDate: formData.fechaOperacion,
      disposalAmount: formData.tipoOperacion === 'BAJA' && formData.montoEnajenacion !== ''
        ? Number(formData.montoEnajenacion) : null,
      reason: formData.motivo?.trim() || '',
      destinationInfo: formData.tipoOperacion === 'TRANSFERENCIA'
        ? [formData.entidadReceptora, formData.ubicacionDestino, formData.documentoTransferencia]
            .filter(Boolean).join(' | ') || null
        : null,
    };

    try {
      const response = await fetchHelper.post(
        base_url(['api', 'v1', 'assets', 'disposals']),
        payload,
        {},
        1000,
        true
      );
      const createdId = response?.data?.id ?? response?.id;
      const label = createdId
        ? `Disposicion #${createdId} registrada correctamente.`
        : 'Disposicion registrada correctamente.';
      if (createdId) setTransactionId(String(createdId));
      setAlert({ show: true, type: 'success', message: label });
    } catch (error) {
      console.error(error);
      const backendMsg = error?.errors?.[0]?.message || error?.msg || error?.message;
      setAlert({
        show: true,
        type: 'danger',
        message: backendMsg || 'Error al registrar la operacion.',
      });
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title fw-bold mb-4" style={{ fontSize: '1.35rem' }}>
          Activos
        </h5>

        <AlertPage
          type={alert.type}
          message={alert.message}
          show={alert.show}
          onChange={() => setAlert({ show: false, type: '', message: '' })}
        />

        <div className="card border mb-4">
          <div className="card-header">
            <h6 className="mb-0 fw-bold">Datos de la operacion - {isTransfer ? 'Transferencia' : 'Baja'}</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <FormField
                type="select"
                id="tipoOperacion"
                label="Tipo de operacion"
                value={formData.tipoOperacion}
                onChange={handleFieldChange('tipoOperacion')}
                options={OPERATION_TYPES}
                placeholder="-- Seleccione --"
                required
                colClass="col-md-3"
              />

              {/* QA-BLOQUE-AQ (2026-04-30): convertido de input texto libre a
                * dropdown con activos disponibles. Antes obligaba al contador
                * a saber el ACT-XXXX de memoria. Si viene initialAssetId
                * desde la URL, se preserva como readonly. */}
              <FormField
                type="select"
                id="assetId"
                label="ID Activo"
                value={formData.assetId}
                onChange={handleFieldChange('assetId')}
                options={assetsList}
                placeholder="-- Seleccione un activo --"
                required
                error={errors.assetId}
                disabled={Boolean(initialAssetId)}
                colClass="col-md-4"
                helperText={assetInfo.description !== '-' ? assetInfo.description : undefined}
              />

              <div className="col-md-2 mb-3 d-flex align-items-end">
                <button className="btn btn-outline-primary w-100" type="button" onClick={handleAssetLookup}>
                  Buscar
                </button>
              </div>

              <FormField
                type="date"
                id="fechaOperacion"
                label="Fecha de operacion (AAAA-MM-DD)"
                value={formData.fechaOperacion}
                onChange={handleFieldChange('fechaOperacion')}
                error={errors.fechaOperacion}
                required
                colClass="col-md-3"
              />
            </div>

            <div className="row">
              <FormField
                type="text"
                id="motivo"
                label="Motivo"
                value={formData.motivo}
                onChange={handleFieldChange('motivo')}
                placeholder="Ej: Obsolescencia / Venta"
                error={errors.motivo}
                required
                colClass="col-md-6"
              />

              <FormField
                type="number"
                id="montoEnajenacion"
                label="Monto de enajenacion / transferencia"
                value={formData.montoEnajenacion}
                onChange={handleFieldChange('montoEnajenacion')}
                placeholder="0.00"
                error={errors.montoEnajenacion}
                required
                colClass="col-md-3"
              />

              <FormField
                type="number"
                id="valorResidual"
                label="Valor residual (registrado)"
                value={formData.valorResidual}
                onChange={handleFieldChange('valorResidual')}
                error={errors.valorResidual}
                required
                colClass="col-md-3"
              />
            </div>

            <div className="row">
              <FormField
                type="text"
                id="cuentaDestino"
                label="Cuenta destino (resultado ganancia/perdida)"
                value={formData.cuentaDestino}
                onChange={handleFieldChange('cuentaDestino')}
                placeholder="Ej: 4210 Ganancias en venta PPE"
                error={errors.cuentaDestino}
                helperText="Validacion contra Listas Contables."
                required
                colClass="col-md-6"
              />

              <FormField
                type="select"
                id="referenciaBancoCaja"
                label="Referencia BNK/CAJ"
                value={formData.referenciaBancoCaja}
                onChange={handleFieldChange('referenciaBancoCaja')}
                error={errors.referenciaBancoCaja}
                options={bankMovements}
                placeholder="Seleccione un movimiento bancario"
                required
                colClass="col-md-3"
              />

              <FormField
                type="select"
                id="impuestosRetenciones"
                label="Impuestos/Retenciones (si aplica)"
                value={formData.impuestosRetenciones}
                onChange={handleFieldChange('impuestosRetenciones')}
                options={TAX_RULES}
                placeholder="—"
                error={errors.impuestosRetenciones}
                required
                colClass="col-md-3"
              />
            </div>

            <div className="row">
              <div className="col-md-8 mb-3">
                <label htmlFor="documentoSoporteAdjunto" className="form-label">
                  Documentos soporte (adjunto) <span className="text-danger">*</span>
                </label>
                <input type="file" id="documentoSoporteAdjunto" className="form-control" />
                <small className="form-text text-muted d-block mt-1">
                  Factura, orden, acta o comprobante bancario (PDF/JPG/PNG).
                </small>
              </div>
              <div className="col-md-4">
                <FormField
                  type="text"
                  id="solicitante"
                  label="Solicitante"
                  value={formData.solicitante}
                  onChange={handleFieldChange('solicitante')}
                  error={errors.solicitante}
                  required
                  colClass="col-12"
                />
                <FormField
                  type="text"
                  id="aprobador"
                  label="Aprobador (si aplica)"
                  value={formData.aprobador}
                  onChange={handleFieldChange('aprobador')}
                  colClass="col-12"
                />
              </div>
            </div>

            {isTransfer && (
              <div className="row">
                <FormField
                  type="text"
                  id="entidadReceptora"
                  label="Entidad receptora"
                  value={formData.entidadReceptora}
                  onChange={handleFieldChange('entidadReceptora')}
                  error={errors.entidadReceptora}
                  required
                  colClass="col-md-4"
                />

                <FormField
                  type="text"
                  id="ubicacionDestino"
                  label="Ubicacion destino"
                  value={formData.ubicacionDestino}
                  onChange={handleFieldChange('ubicacionDestino')}
                  error={errors.ubicacionDestino}
                  required
                  colClass="col-md-4"
                />

                <FormField
                  type="text"
                  id="documentoTransferencia"
                  label="Documento de transferencia"
                  value={formData.documentoTransferencia}
                  onChange={handleFieldChange('documentoTransferencia')}
                  error={errors.documentoTransferencia}
                  required
                  colClass="col-md-4"
                />
              </div>
            )}

            <div className="card border mt-2">
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-3 mb-2">
                    <div className="fw-semibold">Costo</div>
                    <div>{assetInfo.assetCode ? formatCOP(costoHistorico) : '—'}</div>
                  </div>
                  <div className="col-md-3 mb-2">
                    <div className="fw-semibold">Dep. acumulada</div>
                    <div>{assetInfo.assetCode ? formatCOP(depreciacionAcumulada) : '—'}</div>
                  </div>
                  <div className="col-md-3 mb-2">
                    <div className="fw-semibold">Valor en libros</div>
                    <div>{assetInfo.assetCode ? formatCOP(valorEnLibros) : '—'}</div>
                  </div>
                  <div className="col-md-3 mb-2">
                    <div className="fw-semibold">Ganancia/Perdida</div>
                    <div>{assetInfo.assetCode ? formatCOP(gananciaPerdida) : '—'}</div>
                  </div>
                </div>
                <small className="form-text text-muted d-block mt-2">
                  Costo historico y depreciacion acumulada se consultan desde el activo.
                </small>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={handleValidate}>
                Validar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleRegister}>
                Registrar operacion
              </button>
              {onClose && (
                <button type="button" className="btn btn-light" onClick={onClose}>
                  Cerrar
                </button>
              )}
            </div>

            {transactionId && (
              <div className="alert alert-info mt-3 mb-0" role="alert">
                Numero de transaccion: <strong>{transactionId}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BajasTransferencias;
