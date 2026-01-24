import Checkbox from '../atoms/CheckBox';
import Link from '../atoms/Link';

const RememberMe = ({ rememberMe, onRememberChange }) => {
  return (
    <div className="remember-section">
      <Checkbox
        id="remember-me"
        name="rememberMe"
        label="Recuérdame"
        checked={rememberMe}
        onChange={onRememberChange}
      />
      <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
    </div>
  );
};

export default RememberMe;