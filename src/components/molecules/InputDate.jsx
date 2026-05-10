import { useEffect, useRef } from "react";

const InputDate = ({ id, label, date, onChange, error, placeholder, required, dateFormat = 'd-m-Y', maxDate, minDate }) => {

    const dateRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const $date = $(dateRef.current);
    }, []);

    const fpRef = useRef(null);

    useEffect(() => {
        const $date = $(dateRef.current);
        const config = {
            mode: 'single',
            dateFormat: dateFormat,
            placeholder: placeholder,
            required: required,
            defaultDate: date,
            onChange: (selectedDates, dateStr, instance) => {
                onChangeRef.current?.(dateStr ? dateStr : null);
            }
        };
        if (maxDate !== undefined) config.maxDate = maxDate;
        if (minDate !== undefined) config.minDate = minDate;
        // QA Bloque AU+ Bug 4 + 5 (2026-05-07): guardar la instancia de
        // Flatpickr para poder sincronizar la prop `date` cuando el padre la
        // cambia por edicion o limpieza. Antes solo se inicializaba una vez
        // y subsiguientes cambios de `date` no actualizaban el calendario.
        fpRef.current = $date.flatpickr(config);
        return () => {
            if (fpRef.current && typeof fpRef.current.destroy === 'function') {
                fpRef.current.destroy();
            }
        };
    }, []);

    // Sincronizar prop date -> Flatpickr cuando el padre cambia el valor
    // (caso editar: cargar fechas existentes; caso crear post-success:
    // limpiar a vacio).
    useEffect(() => {
        const fp = fpRef.current;
        if (!fp || typeof fp.setDate !== 'function') return;
        if (date) {
            fp.setDate(date, false);
        } else {
            fp.clear();
        }
    }, [date]);

    return (
        <div className="form-floating form-floating-outline">
            <input
                type="text"
                placeholder={placeholder}
                value={date ?? ''}
                onChange={(e) => onChangeRef.current?.(e.target.value)}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                required={required}
                ref={dateRef}
            />
            <label htmlFor={id}>{label}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    )
}

export default InputDate;