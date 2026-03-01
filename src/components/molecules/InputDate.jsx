import { useEffect, useRef } from "react";

const InputDate = ({ id, label, date, onChange, error, placeholder, required}) => {

    const dateRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const $date = $(dateRef.current);
    }, []);

    useEffect(() => {
        const $date = $(dateRef.current);
        $date.flatpickr({
            mode: 'single',
            dateFormat: 'd-m-Y',
            placeholder: placeholder,
            required: required,
            defaultDate: date,
            onChange: (selectedDates, dateStr, instance) => {
                console.log(selectedDates, dateStr, instance);
                onChangeRef.current?.(dateStr ? dateStr : null);
            }
        });
    }, []);

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