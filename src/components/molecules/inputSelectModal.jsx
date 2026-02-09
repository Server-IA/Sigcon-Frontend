import { useEffect, useRef } from 'react';
// import $ from 'jquery';

// window.$ = window.jQuery = $;

// import 'select2/dist/css/select2.css';
// import 'select2/dist/js/select2.js';
// import "../../styles/vendor/select2/select2.js";
// import "../../styles/vendor/select2/select2.css";

const InputSelectModal = ({ id, label, value, onChange, options, placeholder }) => {

    const selectRef = useRef(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {

        const $select = $(selectRef.current);

        // Inicializar Select2
        $select.select2({
            dropdownParent: $select.parent(), // clave si está en modal
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
            $select.select2('destroy');
        };
    }, []);

    // Sincronizar value desde React
    useEffect(() => {
        $(selectRef.current).val(value).trigger('change.select2');
    }, [value]);

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

export default InputSelectModal;
