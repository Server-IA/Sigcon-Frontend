
import { useEffect, useRef } from 'react';
// import $ from 'jquery';

// window.$ = window.jQuery = $;

// import 'select2/dist/css/select2.css';
// import 'select2/dist/js/select2.js';
// import "../../styles/vendor/select2/select2.js";
// import "../../styles/vendor/select2/select2.css";

const InputSelectModalCategory = ({ id, label, value, onChange, options, placeholder }) => {
    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const $select = $(selectRef.current);
        if (!$select.select2) return;
        $select.select2({
            dropdownParent: $select.parent(),
            placeholder: placeholder || 'Seleccione una opción',
            width: '100%'
        });
        const handleChange = function () {
            const newValue = $(this).val();
            onChangeRef.current?.(newValue);
        };
        $select.on('change', handleChange);
        return () => {
            $select.off('change', handleChange);
            if ($select.hasClass('select2-hidden-accessible')) {
                $select.select2('destroy');
            }
        };
    }, [options]);

    // Sincronizar value desde React
    useEffect(() => {
        $(selectRef.current).val(value).trigger('change.select2');
    }, [value]);

    // ← ESTO ES LO QUE FALTA
    return (
        <div className="form-floating form-floating-outline">
            <select
                id={id}
                ref={selectRef}
                className="form-select"
            >
                <option value="">{placeholder || 'Seleccione una opción'}</option>
                {options.map(option => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            <label htmlFor={id}>{label}</label>
        </div>
    );
};
export default InputSelectModalCategory;




