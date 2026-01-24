import { useState } from 'react';
import InputField from './InputFile';
import Icon from '../atoms/Icon';

const PasswordInput = ({ value, onChange, id = "password", name = "password", label = "Contraseña", placeholder = "Introduce tu contraseña", hasError = false }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputField
      id={id}
      name={name}
      label={label}
      type={showPassword ? 'text' : 'password'}
      placeholder={placeholder}
      hasError={hasError}
      value={value}
      onChange={onChange}
      rightElement={
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          <Icon name={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
        </button>
      }
    />
  );
};

export default PasswordInput;