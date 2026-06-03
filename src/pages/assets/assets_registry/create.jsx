import { useState, useEffect } from "react";

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url, formatPrice } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

import InputDate from "../../../components/molecules/InputDate";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const CreateAssets = (
//   {
//   modalRef,
//   modalInstance,
//   assets,
//   setAssets,
//   dataTableRef,
//   setAssetsCreate,
//   thirds,
//   accountingAccount,
//   depreciationRules,
// }
) => {

  const navigate = useNavigate();

  const user = useSelector(state => state.user).user;
  const company = user?.company ?? {};

  const [finishData, setFinishData] = useState(false);

  const [accountingAccounts, setAccountingAccounts] = useState([]);
  const [sendForm, setSendForm] = useState(false);

  const [accountingAccountsAssets, setAccountingAccountsAssets] = useState([]);

  const [thirds, setThirds] = useState([]);
  const [depreciationRules, setDepreciationRules] = useState([]);
  const [paymentForms, setPaymentForms] = useState([]);

  const [thirdParty, setThirdParty] = useState({});
  const [rulerTaxIVA, setRulerTaxIVA] = useState([]);

  const [accountBanks, setAccountBanks] = useState([]);
  const [checks, setChecks] = useState([]);
  const [cash, setCash] = useState([]);

  const [taxRulers, setTaxRulers] = useState([]);

  const ASSETS_BASIC = {
    name: "",
    description: "",
    classification: "",
    type: "",
    accountingAccountId: "",
    acquisitionValue: "",
    usefulLifeMonths: "",
    depreciationMethod: "",
    
    supplierId: "",
    paymentFormId: "",
    acquisitionDate: "",
    paymentMethodId: "",
    originPaymentMethodId: "",

    accountsPayableReferenceId: "",
    bankCashReferenceId: "",
    costCenterOrAccountingLocation: "",
    status: "",
    observations: "",
    taxesRetention: [],
    tax: null,
  }

  const [assets, setAssets] = useState({});

  const [errors, setErrors] = useState({});
  const [error, setError] = useState({
    message: "",
    type: "",
    show: false,
    timeout: 5000,
  });

  const loadData = async () => {
    try{
      const [
        accountingAccountsResponse,
        thirdsResponse,
        depreciationRulesResponse,
        paymentFormsResponse,
        cashResponse,
        checksResponse
      ] = await Promise.all([
        fetchHelper.post(base_url(["api", "v1", "accounting-accounts"]),
          { length: -1 },
          {},
          0
        ),
        fetchHelper.post(base_url(["api", "v1", "third-parties", "search"]),
          {
            length: -1,
            columns: [{ data: "roles.id", search: { value: 2, regex: false } }],
          },
          {},
          0
        ),
        fetchHelper.post(base_url(["api", "v1", "depreciation-rules/search"]),
          { length: -1, columns: [{data: "status", search: {value: "ACTIVE", regex: false}}], },
          {},
          0
        ),
        fetchHelper.post(base_url(["api", "v1", "resources/payment-forms"]),
          { length: -1 },
          {},
          0
        ),
        fetchHelper.post(base_url(["api", "v1", "cash/search"]),
          { length: -1, columns: [{data: "cashStatus", search: {value: "ACTIVE", regex: false}}], },
          {},
          0
        ),
        fetchHelper.post(base_url(["api", "v1", "banks/checks/search"]),
          { length: -1, columns: [{data: "statusCheck", searchable: true, search: {value: "EMITIDO", regex: false}}], },
          {},
          0
        )
      ]);
      setAccountingAccounts(accountingAccountsResponse.data);
      setAccountingAccountsAssets(accountingAccountsResponse.data.filter(a => ["14", "12", "15", "16"].some(code => a.pucAccount.code.startsWith(code))));
      setThirds(thirdsResponse.data);
      setDepreciationRules(depreciationRulesResponse.data);
      setPaymentForms(paymentFormsResponse.data);
      setCash(cashResponse.data);
      setChecks(checksResponse.data);

      const [taxRulersResponse] = await Promise.all([
        fetchHelper.post(base_url(["api", "v1", "ruler-tax/search"]),
          { length: -1 },
          {},
          0
        )
      ])

      const accountBanksResponse = await 
        fetchHelper.post(base_url(["api", "v1", "bank-accounts/search"]),
          { length: -1,
            columns: [{data: "status", searchable: true, search: {value: "ACTIVA", regex: false}}],
          },
          {},
          0
        )
      
      setAccountBanks(accountBanksResponse.data);

      setTaxRulers(taxRulersResponse.data);
    } catch (error) {
      console.error(error);
      setError({ message: error.message || error.msg || "Error al cargar los datos", type: "danger", show: true, timeout: 5000 });
    }finally{
      setFinishData(true);
    }
  }

  useEffect(() => {
    loadData();
    setAssets(ASSETS_BASIC);
  }, []);

  useEffect(() => {
    if (assets.supplierId) {
      setThirdParty(thirds.find(t => t.id == assets.supplierId));
    }else{
      setThirdParty({});
    }
  }, [assets.supplierId]);

  useEffect(() => {
    if(assets.iva){
      setSendForm(true);
    }else if(assets.acquisitionValue){
      setSendForm(true);
    }

    assets?.taxesRetention?.forEach(t => {
      t.amount = calculateRulerRetention(t.taxRuleId);
    });

  }, [assets]);
  useEffect(() => {
    console.log(assets, "Assets");
    if(assets.paymentMethodId){
      setAssets({ ...assets, cashAccountId: null, checkId: null, bankAccountId: null });
    }
  }, [assets.paymentMethodId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // QA-2026-05-05: validacion frontend exhaustiva. Antes solo paymentFormId
    // bloqueaba el submit; ahora se acumulan TODOS los obligatorios y se
    // resaltan en rojo simultaneamente.
    const clientErrors = {};
    if (!assets.supplierId) clientErrors.supplierId = "El proveedor es obligatorio.";
    if (!assets.paymentFormId) clientErrors.paymentFormId = "Debe seleccionar una forma de pago valida (contado o credito).";
    if (!assets.acquisitionDate) clientErrors.acquisitionDate = "La fecha de adquisicion es obligatoria.";
    if (!assets.name || !String(assets.name).trim()) clientErrors.name = "El nombre del activo es obligatorio.";
    if (!assets.classification) clientErrors.classification = "La clasificacion es obligatoria.";
    if (!assets.type) clientErrors.type = "El tipo de activo es obligatorio.";
    if (!assets.accountingAccountId) clientErrors.accountingAccountId = "La cuenta contable es obligatoria.";
    if (!assets.depreciationRuleId) clientErrors.depreciationRuleId = "La regla de depreciacion es obligatoria.";
    if (assets.usefulLifeMonths === undefined || assets.usefulLifeMonths === null || assets.usefulLifeMonths === '' || Number(assets.usefulLifeMonths) <= 0) {
      clientErrors.usefulLifeMonths = "La vida util es obligatoria y debe ser mayor a 0 meses.";
    } else if (!Number.isInteger(Number(assets.usefulLifeMonths))) {
      // QA Activos (2026-05-25) Error 01: la vida util es en meses enteros.
      clientErrors.usefulLifeMonths = "La vida util debe ser un numero entero de meses.";
    } else if (Number(assets.usefulLifeMonths) > 1200) {
      // QA Activos (2026-05-25) Error 01: tope razonable (100 años). Evita el
      // error tecnico de overflow al deserializar valores absurdos (ej. 1e+26).
      clientErrors.usefulLifeMonths = "La vida util no puede superar 1200 meses (100 años).";
    }
    if (!assets.acquisitionValue || Number(assets.acquisitionValue) <= 0) clientErrors.acquisitionValue = "El valor de adquisicion debe ser mayor que cero.";
    // HU-ACT-01 E9: si CONTADO, el origen de pago (caja/banco/cheque) es obligatorio
    if (assets.paymentFormId == 1) {
      if (!assets.paymentMethodId) clientErrors.paymentMethodId = "Debe seleccionar el metodo de pago.";
      const hasOrigin = assets.cashAccountId || assets.checkId || assets.bankAccountId;
      if (!hasOrigin) {
        // QA-2026-05-05: mensaje literal HU-ACT-01 E9.
        clientErrors.originPaymentMethodId = "Debe especificar cuenta, caja o cheque desde donde se realizo el pago.";
      }
    }
    // HU-ACT-01 E1 (credito): exigir resolucion de factura para crear FC en AP
    if (assets.paymentFormId == 2) {
      if (!assets.resolutionInvoice || !String(assets.resolutionInvoice).trim()) {
        clientErrors.resolutionInvoice = "El numero/resolucion de factura es obligatorio para credito.";
      }
      if (!assets.invoiceDueDay || Number(assets.invoiceDueDay) < 1 || Number(assets.invoiceDueDay) > 31) {
        clientErrors.invoiceDueDay = "El dia de vencimiento debe estar entre 1 y 31.";
      }
    }
    // HU-ACT-01 (QA 2026-06-02): por decision del lider, el numero de factura del
    // activo debe seguir el formato PREFIJO-CONSECUTIVO (ej: FE-0001, FAC-2026-00125).
    if (assets.resolutionInvoice && String(assets.resolutionInvoice).trim()
        && !clientErrors.resolutionInvoice
        && !/^[A-Za-z][A-Za-z0-9]*(-[A-Za-z0-9]+)*-[0-9]+$/.test(String(assets.resolutionInvoice).trim())) {
      clientErrors.resolutionInvoice = "El numero de factura debe tener el formato PREFIJO-CONSECUTIVO (ej: FE-0001, FAC-2026-00125).";
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      // QA-2026-05-05: mensaje general que LISTA los campos faltantes para que
      // el usuario sepa exactamente que corregir, ademas del marcado en rojo.
      const FIELD_LABELS = {
        supplierId: "Proveedor",
        paymentFormId: "Forma de pago",
        acquisitionDate: "Fecha de adquisicion",
        name: "Nombre",
        classification: "Clasificacion",
        type: "Tipo",
        accountingAccountId: "Cuenta contable",
        depreciationRuleId: "Metodo de depreciacion",
        usefulLifeMonths: "Vida util",
        acquisitionValue: "Valor de adquisicion",
        paymentMethodId: "Metodo de pago",
        originPaymentMethodId: "Origen de pago",
        resolutionInvoice: "Numero de factura",
        invoiceDueDay: "Dia de vencimiento",
      };
      const missingList = Object.keys(clientErrors)
        .map((k) => FIELD_LABELS[k] || k)
        .join(", ");
      setError({
        message: `Faltan campos por completar: ${missingList}. Revise los marcados en rojo.`,
        type: "danger",
        show: true,
        timeout: 8000,
      });
      // Scroll al tope para que la alerta sea visible.
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
      return;
    }

    try {
      const url = base_url(["api", "v1", "assets", "store"]);

      await fetchHelper.post(url, assets, {}, 1000);

      setErrors({});
      setError({
        message: "Activo creado correctamente.",
        type: "success",
        show: true,
        timeout: 2500,
      });

      // HU-ACT-01 E1: navegar al listado de activos (ruta fija, evita depender
      // del path actual del navegador que puede variar).
      setTimeout(() => {
        navigate("/assets/assets");
      }, 800);
    } catch (error) {
      console.error(error);

      const errores = error?.errors;

      if (errores && errores.length > 0) {
        const fieldErrors = {};

        errores.forEach((err) => {
          fieldErrors[err.field] = err.message;
        });

        setErrors(fieldErrors);
      } else if (error?.msg) {
        // Limpiar mensajes técnicos del backend para no exponerlos al usuario
        let msg = error.msg;
        if (msg.includes('Cannot coerce') || msg.includes('Cannot deserialize') || msg.includes('JSON parse')) {
          msg = 'Por favor complete todos los campos obligatorios antes de guardar.';
        }
        setError({
          message: msg,
          type: "danger",
          show: true,
        });
      } else {
        setError({
          message: 'Por favor complete todos los campos obligatorios antes de guardar.',
          type: "danger",
          show: true,
        });
      }
    }
  };

  useEffect(() => {
    if(finishData){
      if (company?.typeRegimen?.id == 2) {
    
        const accountingAccountTaxes = accountingAccounts.filter(a => a.pucAccount.code.startsWith("2408"));


        if(accountingAccountTaxes?.length === 0){
          setError({
            message: "No se encontró la cuenta contable para el IVA (código 2408). Puede crear el activo sin IVA o configurar las cuentas contables primero.",
            type: "warning",
            show: true,
            timeout: 5000
          });
          // No bloquear — permitir continuar sin cuenta IVA
        }

        if (accountingAccountTaxes?.some(a => a.taxRules?.length === 0)) {
          setError({
            message: "No se encontró regla de impuesto para el IVA. Puede crear el activo sin IVA o configurar las reglas tributarias primero.",
            type: "warning",
            show: true,
            timeout: 5000
          });
          // No bloquear — permitir continuar sin IVA
        }
    
        const now = new Date();
    
        const validRules = accountingAccountTaxes.map(a => a.taxRules).flat().filter(r =>
          new Date(r.dateStart) <= now &&
          new Date(r.dateEnd) >= now
        );
    
        if (validRules.length === 0) {
          setError({
            message: "No hay reglas de IVA vigentes. Puede crear el activo sin IVA.",
            type: "warning",
            show: true,
            timeout: 5000
          });
        }

        setRulerTaxIVA(validRules);

        const accountingAccountProvider = accountingAccounts.find(a => a.pucAccount.code.startsWith("2205"));
        if(!accountingAccountProvider){
          setError({
            message: "No se encontró la cuenta contable para el proveedor",
            type: "danger",
            show: true,
            timeout: 0
          });
          setSendForm(false);
          return;
        }
      }

      company?.withholdings?.forEach(w => {
        let accountingAccountCode = null;
        switch(w.id){
          case 1: // ReteIVA
            accountingAccountCode = "2367";
            break;
          case 2: // RETEICA
            accountingAccountCode = "2368";
            break;
          case 3: // ReteFuente
            accountingAccountCode = "2365";
            break;
        }

        const now = new Date();
        
        w.accountAccounts = accountingAccounts.filter(a => a.pucAccount.code.startsWith(accountingAccountCode));
        w.taxRules = w.accountAccounts?.map(a => a.taxRules).flat()?.filter(t => 
          new Date(t.dateStart) <= now &&
          new Date(t.dateEnd) >= now
        ) || [];
      });
    }
  }, [finishData]);

  const calculateRulerRetention = (rulerRetentionId) => {
    const accountingAccount = accountingAccounts.find(a => a.taxRules.some(r => r.id == rulerRetentionId));

    if(accountingAccount){
      if(accountingAccount.pucAccount.code.startsWith("2367")){
        const rulerTax = accountingAccounts.find(a => a.taxRules.some(r => r.id == assets.rulerTax)).taxRules.find(r => r.id == assets.rulerTax);
        const value_iva = rulerTax ? (rulerTax.percentage * assets.acquisitionValue) / 100 : 0;
        return value_iva * accountingAccount.taxRules.find(r => r.id == rulerRetentionId).percentage / 100;
      }else{
        return accountingAccount.taxRules.find(r => r.id == rulerRetentionId).percentage * assets.acquisitionValue / 100;
      }
    }
    return 0;
  }

  return (
    <>
      <AlertPage
        message={error.message}
        type={error.type}
        show={error.show}
        duration={error?.timeout ?? 5000}
        onChange={() => setError({ message: "", type: "", show: false, timeout: 5000 })}
      />

      {/* INFORMACION DE LA FACTURA */}

      <div className="card py-2">
        <p className="text-muted fw-semibold border-bottom pb-1">
          <i className="ri-file-list-3-line me-1"></i>Informacion de la factura
        </p>
        <div className="row">
          <div className="col-md-4 mb-4 mt-4">
            <InputSelectModal
              id="supplierId"
              label="Proveedor"
              value={assets.supplierId} 
              onChange={(value) =>
                setAssets({ ...assets, supplierId: Number(value) })
              }
              options={thirds.map(t => ({ id: t.id, label: `${t.thirdPartyCode} - ${t.businessName}` }))}
              required
            />
          </div>
          <div className="col-md-4 mb-4 mt-4">
            <InputSelectModal
              id="paymentFormId"
              label="Forma de pago"
              value={assets.paymentFormId}
              onChange={(value) =>{
                setAssets({ ...assets, paymentFormId: Number(value) });
                if(errors.paymentFormId){
                  const {paymentFormId: _, ...rest} = errors;
                  setErrors(rest);
                }
              }}
              options={paymentForms.map(p => ({ id: p.id, label: p.name }))}
              required
              error={errors.paymentFormId}
            />
          </div>

          <div className="col-md-4 mb-4 mt-4">
            <InputDate
              id="invoiceDate"
              label="Fecha de la factura"
              placeholder="AAAA-MM-DD"
              date={assets.acquisitionDate}
              dateFormat="Y-m-d"
              onChange={(date) =>
                setAssets({ ...assets, acquisitionDate: date })
              }
            />
          </div>
        </div>
        <div className="row">

          {/* PAGO DE CONTADO */}
          {
            assets.paymentFormId == 1 && (
              <>
                <div className="col-md-4 mb-4">
                  <InputSelectModal
                    id="methodPaymentId"
                    label="Método de pago"
                    value={assets.paymentMethodId}
                    onChange={(value) => {
                      setAssets({ ...assets, paymentMethodId: Number(value) });
                      // QA-2026-05-05: limpiar error inline al cambiar.
                      if (errors.paymentMethodId) {
                        const { paymentMethodId: _, ...rest } = errors;
                        setErrors(rest);
                      }
                    }}
                    options={[
                      { id: 1, label: "Efectivo" },
                      { id: 2, label: "Cheque" },
                      { id: 3, label: "Transferencia bancaria" },
                    ]}
                    error={errors.paymentMethodId}
                    required
                  />
                </div>

                <div className="col-md-4 mb-4">
                    <InputSelectModal
                      id="originPaymentId"
                      label="Origen de pago"
                      value={
                        assets.paymentMethodId == 1 ? assets.cashAccountId :
                        assets.paymentMethodId == 2 ? assets.checkId :
                        assets.paymentMethodId == 3 ? assets.bankAccountId : null}
                      onChange={(value) =>{
                          setAssets({ ...assets,
                            originPaymentMethodId: Number(value),
                            cashAccountId: assets.paymentMethodId == 1 ? Number(value) : null,
                            checkId: assets.paymentMethodId == 2 ? Number(value) : null,
                            bankAccountId: assets.paymentMethodId == 3 ? Number(value) : null
                          });
                          // QA-2026-05-05: limpiar error inline al cambiar.
                          if (errors.originPaymentMethodId) {
                            const { originPaymentMethodId: _, ...rest } = errors;
                            setErrors(rest);
                          }
                        }
                      }
                      options={
                        assets.paymentMethodId == 1 ? cash.map(c => ({ id: c.id, label: `${c.cashCode} - ${c.cashName}` })) :
                        assets.paymentMethodId == 2 ? checks.map(c => ({ id: c.id, label: `${c.numberCheck} - ${c.beneficiary}` })) :
                        assets.paymentMethodId == 3 ? accountBanks
                        .filter(b => b.accountType !== "TARJETA_CREDITO")
                        .map(b => ({ id: b.id, label: `${b.accountName} - ${b.accountNumberMasked}` })) :
                        []
                      }
                      emptyMessage={
                        assets.paymentMethodId == 1 ? 'No hay cajas activas. Cree una en Bancos y Cajas → Cajas' :
                        assets.paymentMethodId == 2 ? 'No hay cheques disponibles. Cree uno en Bancos y Cajas → Cheques' :
                        assets.paymentMethodId == 3 ? 'No hay cuentas bancarias activas. Cree una en Bancos y Cajas → Cuentas Bancarias' :
                        'Primero seleccione un método de pago'
                      }
                      error={errors.originPaymentMethodId}
                      required
                    />
                </div>
              </>
            )
          }

          {/* PAGO CON CREDITO */}
          {assets.paymentFormId == 2 && (
            <>
              <div className="col-md-4 mb-4">
                <InputSelectModal
                  id="bankCashReferenceId"
                  label="Cuenta bancaria"
                  value={assets.originPaymentMethodId}
                  onChange={(value) =>
                    setAssets({ ...assets,
                      originPaymentMethodId: Number(value),
                      bankAccountId: Number(value),
                    })
                  }
                  /* QA-BLOQUE-AQ (2026-04-30): filtro relajado.
                   * Antes solo mostraba cuentas tipo TARJETA_CREDITO, dejando
                   * el dropdown vacio cuando la empresa no tenia ninguna
                   * tarjeta registrada (caso real en QA). Ahora muestra todas
                   * las cuentas activas y el contador elige la de origen. */
                  options={accountBanks.map(b => ({
                    id: b.id,
                    label: `${b.accountName} - ${b.accountNumberMasked || b.accountNumber || ''}`,
                  }))}
                  emptyMessage="No hay cuentas bancarias activas. Cree una en Bancos y Cajas → Cuentas bancarias."
                />
              </div>
              <div className="col-md-4 mb-4">
                <InputModal
                  type="text"
                  id="invoiceDueDay"
                  label="Día de vencimiento"
                  value={assets.invoiceDueDay}
                  onChange={(e) =>
                    setAssets({ ...assets, invoiceDueDay: Number(e.target.value.replace(/\D/g, '')) })
                  }
                  error={errors.acquisitionDate}
                  required
                  placeholder="Ej: 15"
                />
              </div>
            </>
          )}

          <div className="col-md-4 mb-4">
            <InputModal
              type="text"
              id="resolutionInvoice"
              label="Número de factura"
              value={assets.resolutionInvoice}
              onChange={(e) =>
                setAssets({ ...assets, resolutionInvoice: e.target.value })
              }
              error={errors.resolutionInvoice}
              required
              placeholder="Formato PREFIJO-CONSECUTIVO (ej: FE-0001, FAC-2026-00125)"
            />
          </div>
        </div>
      </div>

      {/* INFORMACION DEL ACTIVO */}
      <div className="card py-2">

        <p className="text-muted fw-semibold border-bottom pb-1">
          <i className="ri-file-list-3-line me-1"></i>Informacion del activo
        </p>

        {/* FILA 1 */}
        <div className="row">
          <div className="col-md-4 mb-4">
            <InputModal
              type="text"
              id="name"
              placeholder="Ej: Computador portátil Dell XPS 13"
              label="Nombre"
              value={assets.name}
              onChange={(e) =>
                setAssets({ ...assets, name: e.target.value })
              }
              error={errors.name}
              required
            />
          </div>

          <div className="col-md-4 mb-4">
            <InputModal
              type="text"
              id="description"
              placeholder="Ej: Computador portátil Dell XPS 13"
              label="Descripción"
              value={assets.description}
              onChange={(e) =>
                setAssets({ ...assets, description: e.target.value })
              }
              error={errors.description}
            />
          </div>

          <div className="col-md-4 mb-4">
            <InputSelectModal
              id="classification"
              label="Clasificación"
              value={assets.classification}
              onChange={(value) =>
                setAssets({ ...assets, classification: value })
              }
              options={[
                { id: "NON_CURRENT", label: "Activo no corriente" },
                { id: "CURRENT", label: "Activo corriente" },
              ]}
              required
            />
          </div>
        </div>

        {/* FILA 2 */}
        <div className="row">
          <div className="col-md-4 mb-4">
            <InputSelectModal
              id="type"
              label="Tipo"
              value={assets.type}
              onChange={(value) => setAssets({ ...assets, type: value })}
              options={[
                { id: "TANGIBLE", label: "Tangible" },
                { id: "INTANGIBLE", label: "Intangible" },
              ]}
              required
            />
          </div>

          <div className="col-md-4 mb-4">
            <InputSelectModal
              id="accountingAccountId"
              label="Cuenta contable"
              value={assets.accountingAccountId}
              onChange={(value) =>
                setAssets({ ...assets, accountingAccountId: value })
              }
              options={accountingAccountsAssets.map(a => ({ id: a.id, label: a.customName }))}
              required
              error={errors.accountingAccountId}
            />
          </div>
          

          <div className="col-md-4 mb-4">
            <InputSelectModal
              id="depreciationRuleId"
              label="Método depreciación"
              value={assets.depreciationRuleId}
              onChange={(value) =>
                setAssets({ ...assets, depreciationRuleId: value })
              }
              options={depreciationRules.filter(d => d.accountingAccountId == assets.accountingAccountId)
                .map(d => ({ id: d.id, label: d.name }))}
              required
              error={errors.depreciationRuleId}
              placeholder={
                !assets.accountingAccountId
                  ? 'Primero seleccione una cuenta contable'
                  : (depreciationRules.filter(d => d.accountingAccountId == assets.accountingAccountId).length === 0
                      ? 'Sin reglas para esta cuenta'
                      : 'Seleccione método')
              }
              disabled={!assets.accountingAccountId}
            />
          </div>

          {/* <div className="col-md-4 mb-4">
            <InputModal
              type="number"
              id="acquisitionValue"
              label="Valor adquisición"
              placeholder="Ej: 1500000"
              value={assets.acquisitionValue}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  acquisitionValue: Number(e.target.value),
                })
              }
              error={errors.acquisitionValue}
              required
            />
          </div> */}
        </div>

        {/* FILA 3 */}
        <div className="row">
          {/* <div className="col-md-4 mb-4">
            <InputDate
              id="acquisitionDate"
              label="Fecha adquisición"
              placeholder="AAAA-MM-DD"
              date={assets.acquisitionDate}
              dateFormat="Y-m-d"
              onChange={(date) =>{

                  setAssets({
                    ...assets,
                    acquisitionDate: date,
                  })

                  setErrors({
                    ...errors,
                    acquisitionDate: null,
                  })

                }
              }
              error={errors.acquisitionDate}
              required
            />
          </div> */}

          <div className="col-md-4 mb-4">
            <InputModal
              type="number"
              id="usefulLifeMonths"
              label="Vida útil (meses)"
              placeholder="Ej: 60"
              value={assets.usefulLifeMonths}
              onChange={(e) => {
                const v = e.target.value;
                setAssets({
                  ...assets,
                  usefulLifeMonths: v === '' ? '' : Number(v),
                });
                // QA-2026-05-05: limpiar error inline al modificar.
                if (errors.usefulLifeMonths && Number(v) > 0) {
                  const { usefulLifeMonths: _, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              error={errors.usefulLifeMonths}
              min="1"
              max="1200"
              step="1"
              required
            />
          </div>

          <div className="col-md-4 mb-4">
            <InputModal
              type="number"
              id="acquisitionValue"
              label={`Valor ${company?.typeRegimen?.id == 2 ? "neto" : "adquisición"}`}
              placeholder="Ej: 1500000"
              value={assets.acquisitionValue}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  acquisitionValue: Number(e.target.value),
                })
              }
              error={errors.acquisitionValue}
              required
            />
          </div>
        </div>

        {/* FILA 4 */}
        {/* <div className="row">
          <div className="col-md-6 mb-4">
            <InputSelectModal
              id="supplierId"
              label="Proveedor"
              value={assets.supplierId}
              onChange={(value) =>
                setAssets({ ...assets, supplierId: Number(value) })
              }
              options={thirds}
              required
            />
          </div>

          <div className="col-md-3 mb-4">
            <InputModal
              type="text"
              id="paymentTerms"
              label="Condición de pago"
              placeholder="Ej: Net 30" //POR DEFINIR CONDICIONES DE PAGO
              value={assets.paymentTerms}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  paymentTerms: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-3 mb-4">
            <InputModal
              type="number"
              id="accountsPayableReferenceId"
              label="Ref. cuentas por pagar"
              placeholder="Ej: 12345" //POR DEFINIR DE CUENTAS POR PAGAR
              value={assets.accountsPayableReferenceId}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  accountsPayableReferenceId: Number(e.target.value),
                })
              }
            />
          </div>
        </div> */}

        {/* FILA 5 */}
        {/* <div className="row">
          <div className="col-md-6 mb-4">
            <InputModal
              type="number"
              id="bankCashReferenceId"
              label="Referencia banco/caja"
              placeholder="Ej: 12345" //POR DEFINIR REFERENCIA BANCO/CAJA
              value={assets.bankCashReferenceId}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  bankCashReferenceId: Number(e.target.value),
                })
              }
            />
          </div>

          <div className="col-md-6 mb-4">
            <InputSelectModal
              id="status"
              label="Estado"
              value={assets.status}
              onChange={(value) => setAssets({ ...assets, status: value })}
              options={[
                { id: "ACTIVE", label: "Activo" },
                { id: "IN_REPAIR", label: "En reparación" },
                { id: "DECOMMISSIONED", label: "Dado de baja" },
                { id: "TRANSFERRED", label: "Transferido" },
              ]}
              required
            />
          </div>
        </div> */}

        {/* FILA 6 */}
        {/* <div className="row">
          <div className="col-md-12 mb-4">
            <InputModal
              type="text"
              id="observations"
              label="Observaciones"
              placeholder="Ej: El activo se encuentra en buen estado" //POR DEFINIR OBSERVACIONES
              value={assets.observations}
              onChange={(e) =>
                setAssets({
                  ...assets,
                  observations: e.target.value,
                })
              }
            />
          </div>
        </div> */}

      </div>

      {/* PAGO DE IMPUESTOS */}
      <div className="card py-2">
        <p className="text-muted fw-semibold border-bottom pb-1">
          <i className="ri-file-list-3-line me-1"></i>Pago de impuestos
        </p>
        <div className="row">
          {
            company?.typeRegimen?.id == 2 && (
              <>
                <div className="col-md-3 mb-4">
                  <InputSelectModal
                    id="iva"
                    label="IVA"
                    value={assets?.rulerTax}
                    onChange={(value) =>{
                      if(value){
                        setAssets({ ...assets, rulerTax: value })
                      }
                      setErrors({
                        ...errors,
                        rulerTax: null,
                      })
                    }}
                    options={
                      rulerTaxIVA?.map(t => ({ id: t.id, label: `${t.name} (${t.percentage}%)` }))
                    }
                  />
                </div>
              </>
            )
          }

          {
            company?.withholdings?.map(w => (
              <>
                <div key={w.id} className="col-md-3 mb-4">
                  <InputSelectModal
                    id={`taxesRetention${w.id}`}
                    label={`${w.name}`}
                    value={assets?.taxesRetention?.find(t => t.withholdingId == w.id)?.taxRuleId}
                    onChange={(value) => {
                      if (!value) return;
                    
                      const taxRule = w?.taxRules?.find(t => t.id == value);
                      if (!taxRule) return;
                      
                      const taxRetention = assets?.taxesRetention?.find(t => t.withholdingId == w.id);
                      if (taxRetention) {
                        taxRetention.taxRuleId = Number(value);
                        taxRetention.percentage = taxRule.percentage;
                      } else {
                        assets.taxesRetention.push({
                          percentage: taxRule.percentage,
                          withholdingId: w.id,
                          taxRuleId: Number(value)
                        });
                      }
                      
                      setAssets({ ...assets });

                    }}
                    options={w?.taxRules?.map(t => ({
                      id: t.id,
                      label: `${t.name} (${t.percentage}%)`
                    })) || []} 
                    required
                    error={errors[`taxesRetention${w.id}`]}
                  />
                </div>
              </>
            ))
          }
        </div>

        <div className="row">
          <div className="col-12 col-lg-4 col-md-6 d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary w-50" onClick={() => navigate(-1)}>
              <i className="ri-arrow-left-line me-1"></i>Cancelar
            </button>
            <button className="btn btn-primary w-50" onClick={handleSubmit}>
              <i className="ri-save-line me-1"></i>Guardar
            </button>
          </div>
        </div>
      </div>

      {/* INFORMACION DEL PAGO DE IMPUESTOS */}
      <div className="card py-2">
        <p className="text-muted fw-semibold border-bottom pb-1">
          <i className="ri-file-list-3-line me-1"></i>Informacion del pago de impuestos
        </p>

        <div className="table-responsive text-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Crédito</th>
                <th>Valor</th>
                <th>Débito</th>
              </tr>
            </thead>
            <tbody className="table-border-bottom-0">
              <tr>
                <td className="text-wrap">
                  {assets.accountingAccountId ? accountingAccounts.find(a => a.id == assets.accountingAccountId)?.pucAccount.name : "--"}
                </td>
                <td>{
                  formatPrice(assets.acquisitionValue)
                }</td>
                <td>--</td>
              </tr>
              {
                company?.typeRegimen?.id == 2 && (
                  <tr>
                    <td>{accountingAccounts?.find(a => a.pucAccount.code.startsWith("2408"))?.customName}</td>
                    <td>{assets.rulerTax ? formatPrice(rulerTaxIVA.find(t => t.id == assets.rulerTax)?.percentage * assets.acquisitionValue / 100) : "--"}</td>
                    <td>--</td>
                  </tr>
                )
              }

              <tr>
                <td>--</td>
                <td>{
                  (() => {
                    const totalRetentions = assets?.taxesRetention?.reduce((acc, t) => acc + calculateRulerRetention(t.taxRuleId), 0);
                    const totalIVA = assets.rulerTax ? rulerTaxIVA.find(t => t.id == assets.rulerTax)?.percentage * assets.acquisitionValue / 100 : 0;
                    if(totalIVA - totalRetentions < 0){
                      return formatPrice(0);
                    }
                    return formatPrice(assets.acquisitionValue + (totalIVA - totalRetentions));
                  })()
                }</td>
                <td>
                  {accountingAccounts?.find(a => a.pucAccount.code.startsWith("2205"))?.customName}
                </td>
              </tr>

              {
                assets?.taxesRetention?.map(t => (
                  <tr key={t.taxRuleId}>
                    <td>--</td>
                    <td>{formatPrice(calculateRulerRetention(t.taxRuleId) || 0)}</td>
                    <td>{(() => {
                      const accountingAccount = accountingAccounts.find(a => a.taxRules.some(r => r.id == t.taxRuleId));
                      return accountingAccount?.pucAccount?.name || "--";
                    })()}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>


    </>

            
  );
};

export default CreateAssets;
