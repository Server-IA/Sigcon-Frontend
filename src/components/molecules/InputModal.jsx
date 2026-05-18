/**
 * QA Bloque BJ (2026-05-17): se agregaron las props `name` y `col`.
 *
 * Antes, varios forms (Resoluciones DIAN, Facturas de Venta) pasaban
 * `<InputModal name="campo" col="col-md-6" ...>` esperando:
 *   1) que `name` llegara al `<input>` para que el handler `(e) =>
 *      setRecord({...r, [e.target.name]: e.target.value})` setee la key
 *      correcta del state.
 *   2) que `col` envolviera el campo en un `<div className="col-md-X">`
 *      del grid Bootstrap.
 *
 * El componente original ignoraba ambas props. Resultado: el `name` en
 * el `<input>` quedaba vacio, el handler hacia `setRecord({...r,
 * [undefined]: value})` y NINGUN campo persistia. El form de Resoluciones
 * DIAN no aceptaba ningun dato salvo "Estado" (que usa InputSelectModal
 * con su propio onChange). Mismo patron latente en Facturas de Venta.
 *
 * Fix transversal: aceptar `name` y `col` opcionales. Si no se pasan, el
 * comportamiento previo queda intacto (backward compatible con todas las
 * paginas legacy que no los usan).
 */
const InputModal = ({ type, id, name, col, label, value, onChange, error, placeholder, disabled = false, required = false, readOnly = false, maxLength, inputMode, pattern, min, max}) => {

    const field = (
        <div className="form-floating form-floating-outline">
            <input
                type={type}
                id={id}
                name={name}
                className={`form-control ${error ? 'is-invalid' : ''} ${required ? 'required' : ''}`}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={onChange}
                disabled={disabled}
                readOnly={readOnly}
                {...(maxLength ? { maxLength } : {})}
                {...(inputMode ? { inputMode } : {})}
                {...(pattern ? { pattern } : {})}
                {... (min ? { min } : {})}
                {... (max ? { max } : {})}
            />
            <label htmlFor={id}>{label} {required && <span className="text-danger">*</span>}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    );

    // Backward compat: si NO viene `col`, devolvemos el field tal cual
    // (paginas legacy controlan el grid externamente). Si viene `col`,
    // envolvemos en un div con la clase del grid Bootstrap.
    return col ? <div className={col}>{field}</div> : field;
}

export default InputModal;